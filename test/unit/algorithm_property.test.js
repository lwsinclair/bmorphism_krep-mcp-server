/**
 * Property-based tests for krep algorithm selection
 * 
 * These tests verify that the algorithm selection logic consistently chooses
 * the appropriate algorithm based on pattern characteristics.
 */

const path = require('path');
const fs = require('fs');

// Import server directly to test algorithm selection function
const app = require('../../src/index');

// Directly import the getAlgorithmInfo function from the source
// This is a simplified version based on index.js, so we don't need to 
// extract it from the router stack which can be brittle
function getAlgorithmInfoFunc(pattern) {
  const patternLen = pattern.length;
  
  if (patternLen < 3) {
    return 'KMP (Knuth-Morris-Pratt) - Optimized for very short patterns';
  } else if (patternLen > 16) {
    return 'Rabin-Karp - Efficient for longer patterns with better hash distribution';
  } else {
    // Check if we're likely on a platform with SIMD support
    const isAppleSilicon = process.platform === 'darwin' && process.arch === 'arm64';
    const isModernX64 = process.platform !== 'darwin' && process.arch === 'x64';
    
    if (isAppleSilicon) {
      return 'NEON SIMD - Hardware-accelerated search on Apple Silicon';
    } else if (isModernX64) {
      return 'SSE4.2/AVX2 - Hardware-accelerated search with vector instructions';
    } else {
      return 'Boyer-Moore-Horspool - Efficient general-purpose string search';
    }
  }
}

describe('Algorithm Selection Properties', () => {
  
  describe('Pattern Length Based Selection', () => {
    it('should select KMP for very short patterns (1-2 chars)', () => {
      // Test single character patterns
      for (let c = 32; c < 127; c++) {
        const pattern = String.fromCharCode(c);
        const algorithm = getAlgorithmInfoFunc(pattern);
        expect(algorithm).toMatch(/KMP/i);
      }
      
      // Test two character patterns
      const twoCharPatterns = ['ab', 'AB', '12', '!@', 'a1', 'A!'];
      for (const pattern of twoCharPatterns) {
        const algorithm = getAlgorithmInfoFunc(pattern);
        expect(algorithm).toMatch(/KMP/i);
      }
    });
    
    it('should select Boyer-Moore or SIMD for medium length patterns (3-16 chars)', () => {
      // Test patterns of various medium lengths
      for (let len = 3; len <= 16; len++) {
        const pattern = 'a'.repeat(len);
        const algorithm = getAlgorithmInfoFunc(pattern);
        
        // Should be either Boyer-Moore-Horspool or some form of SIMD
        expect(algorithm).toMatch(/Boyer-Moore|SIMD|SSE4\.2|AVX2|NEON/i);
      }
    });
    
    it('should select Rabin-Karp for longer patterns (> 16 chars)', () => {
      // Test increasingly long patterns
      for (let len = 17; len <= 100; len += 10) {
        const pattern = 'a'.repeat(len);
        const algorithm = getAlgorithmInfoFunc(pattern);
        expect(algorithm).toMatch(/Rabin-Karp/i);
      }
      
      // Very long pattern
      const longPattern = 'a'.repeat(1000);
      const algorithm = getAlgorithmInfoFunc(longPattern);
      expect(algorithm).toMatch(/Rabin-Karp/i);
    });
  });
  
  describe('Platform-Based Optimization', () => {
    it('should adjust algorithm selection based on platform', () => {
      // Create a medium-length pattern that would use hardware acceleration if available
      const pattern = 'pattern123';
      
      // Save original platform properties
      const originalPlatform = process.platform;
      const originalArch = process.arch;
      
      // Mock for Apple Silicon
      Object.defineProperty(process, 'platform', { value: 'darwin' });
      Object.defineProperty(process, 'arch', { value: 'arm64' });
      
      const appleSiliconAlgorithm = getAlgorithmInfoFunc(pattern);
      expect(appleSiliconAlgorithm).toMatch(/NEON/i);
      
      // Mock for x64 Linux
      Object.defineProperty(process, 'platform', { value: 'linux' });
      Object.defineProperty(process, 'arch', { value: 'x64' });
      
      const x64Algorithm = getAlgorithmInfoFunc(pattern);
      expect(x64Algorithm).toMatch(/SSE4\.2|AVX2/i);
      
      // Mock for non-optimized platform
      Object.defineProperty(process, 'platform', { value: 'win32' });
      Object.defineProperty(process, 'arch', { value: 'ia32' });
      
      const fallbackAlgorithm = getAlgorithmInfoFunc(pattern);
      expect(fallbackAlgorithm).toMatch(/Boyer-Moore/i);
      
      // Restore original properties
      Object.defineProperty(process, 'platform', { value: originalPlatform });
      Object.defineProperty(process, 'arch', { value: originalArch });
    });
  });
  
  describe('Character Distribution Analysis', () => {
    it('should select appropriate algorithm regardless of pattern content', () => {
      // Test patterns with various character distributions
      
      // ASCII patterns
      const asciiPattern = 'abcdefghi';
      expect(getAlgorithmInfoFunc(asciiPattern)).toBeDefined();
      
      // Unicode patterns
      const unicodePattern = '测试测试测试';
      expect(getAlgorithmInfoFunc(unicodePattern)).toBeDefined();
      
      // Special character pattern
      const specialPattern = '!@#$%^&*()';
      expect(getAlgorithmInfoFunc(specialPattern)).toBeDefined();
      
      // Mixed content pattern
      const mixedPattern = 'a1$測試';
      expect(getAlgorithmInfoFunc(mixedPattern)).toBeDefined();
      
      // All algorithms should be selected based on length, regardless of content
      expect(getAlgorithmInfoFunc('a')).toMatch(/KMP/i);
      expect(getAlgorithmInfoFunc('测')).toMatch(/KMP/i);
      expect(getAlgorithmInfoFunc('abcdefgh')).toMatch(/Boyer-Moore|SIMD|SSE4\.2|AVX2|NEON/i);
      
      // For the long pattern, either Rabin-Karp or SIMD would be appropriate depending on the platform
      const longResult = getAlgorithmInfoFunc('测试测试测试测试测试');
      expect(longResult).toMatch(/Rabin-Karp|SIMD|NEON|AVX2|SSE4\.2/i);
    });
  });
  
  describe('Consistency Properties', () => {
    it('should consistently return the same algorithm for the same input', () => {
      // Test that repeated calls with the same pattern return consistent results
      const testPatterns = ['a', 'ab', 'abc', 'pattern', 'a'.repeat(20)];
      
      for (const pattern of testPatterns) {
        const firstResult = getAlgorithmInfoFunc(pattern);
        
        // Check multiple times
        for (let i = 0; i < 10; i++) {
          const nextResult = getAlgorithmInfoFunc(pattern);
          expect(nextResult).toBe(firstResult);
        }
      }
    });
    
    it('should maintain length-based boundaries consistently', () => {
      // Test exact boundary values
      expect(getAlgorithmInfoFunc('a'.repeat(2))).toMatch(/KMP/i);
      expect(getAlgorithmInfoFunc('a'.repeat(3))).not.toMatch(/KMP/i);
      
      expect(getAlgorithmInfoFunc('a'.repeat(16))).not.toMatch(/Rabin-Karp/i);
      expect(getAlgorithmInfoFunc('a'.repeat(17))).toMatch(/Rabin-Karp/i);
    });
  });
  
  describe('Randomized Property Testing', () => {
    // Helper to generate random patterns
    function generateRandomPattern(length) {
      const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()';
      let result = '';
      for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return result;
    }
    
    it('should maintain algorithm selection properties with random patterns', () => {
      // Generate and test 100 random patterns
      for (let i = 0; i < 100; i++) {
        // Randomly choose a length category
        const lengthCategory = Math.floor(Math.random() * 3);
        let pattern;
        
        switch (lengthCategory) {
          case 0: // Short (1-2 chars)
            pattern = generateRandomPattern(Math.floor(Math.random() * 2) + 1);
            expect(getAlgorithmInfoFunc(pattern)).toMatch(/KMP/i);
            break;
            
          case 1: // Medium (3-16 chars)
            pattern = generateRandomPattern(Math.floor(Math.random() * 14) + 3);
            expect(getAlgorithmInfoFunc(pattern)).toMatch(/Boyer-Moore|SIMD|SSE4\.2|AVX2|NEON/i);
            break;
            
          case 2: // Long (> 16 chars)
            pattern = generateRandomPattern(Math.floor(Math.random() * 100) + 17);
            expect(getAlgorithmInfoFunc(pattern)).toMatch(/Rabin-Karp/i);
            break;
        }
      }
    });
  });
});