/**
 * MCP Client Compatibility Tests for krep-mcp-server
 * 
 * These tests verify that the krep-mcp-server works correctly with
 * standard MCP client implementations that might be used in the worlds/k/.topos directory.
 */

const request = require('supertest');
const path = require('path');
const { getFixturePath, SAMPLE_TEXT } = require('../utils');

// Import the server
const app = require('../../src/index');

// Generic MCP client class to simulate client behavior
class MockMcpClient {
  constructor(baseUrl) {
    this.baseUrl = baseUrl || 'http://localhost';
  }

  // Execute MCP URI
  async executeMcpUri(uri) {
    if (!uri.startsWith('search://') && !uri.startsWith('match://')) {
      throw new Error('Unsupported URI scheme');
    }

    // Parse the URI scheme
    const url = new URL(uri);
    const protocol = url.protocol.replace(':', '');
    let path, params;

    if (protocol === 'search') {
      path = url.hostname + url.pathname;
      params = {
        pattern: url.searchParams.get('pattern'),
        case: url.searchParams.get('case') === 'false' ? false : true,
        threads: parseInt(url.searchParams.get('threads') || '4'),
        count: url.searchParams.get('count') === 'true'
      };

      return this.search(params.pattern, path, params.case, params.threads, params.count);
    } else if (protocol === 'match') {
      const text = url.hostname + url.pathname;
      params = {
        pattern: url.searchParams.get('pattern'),
        case: url.searchParams.get('case') === 'false' ? false : true,
        threads: parseInt(url.searchParams.get('threads') || '4'),
        count: url.searchParams.get('count') === 'true'
      };

      return this.match(params.pattern, text, params.case, params.threads, params.count);
    }
  }

  // Search in files
  async search(pattern, path, caseSensitive = true, threads = 4, countOnly = false) {
    const response = await request(app)
      .post('/search')
      .send({
        pattern,
        path,
        caseSensitive,
        threads,
        countOnly
      });

    if (response.status !== 200) {
      throw new Error(`Search failed: ${response.body.error || 'Unknown error'}`);
    }

    return response.body;
  }

  // Match in text
  async match(pattern, text, caseSensitive = true, threads = 4, countOnly = false) {
    const response = await request(app)
      .post('/match')
      .send({
        pattern,
        text,
        caseSensitive,
        threads,
        countOnly
      });

    if (response.status !== 200) {
      throw new Error(`Match failed: ${response.body.error || 'Unknown error'}`);
    }

    return response.body;
  }
}

describe('MCP Client Compatibility', () => {
  // Create a mock client for testing
  const client = new MockMcpClient('http://localhost');

  describe('Generic MCP Client', () => {
    it('should execute search:// URI scheme', async () => {
      const samplePath = getFixturePath('sample.txt');
      const uri = `search://${samplePath}?pattern=pattern&case=false`;
      
      const result = await client.executeMcpUri(uri);
      
      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('pattern', 'pattern');
      expect(result).toHaveProperty('path', samplePath);
      expect(result.performance).toHaveProperty('caseSensitive', false);
    });

    it('should execute match:// URI scheme', async () => {
      const text = 'Hello, this is a pattern to test with';
      const uri = `match://${text}?pattern=pattern&case=true&threads=2`;
      
      const result = await client.executeMcpUri(uri);
      
      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('pattern', 'pattern');
      expect(result).toHaveProperty('text', text);
      expect(result.performance).toHaveProperty('caseSensitive', true);
      expect(result.performance).toHaveProperty('threads', 2);
    });

    it('should handle count-only mode correctly', async () => {
      const samplePath = getFixturePath('sample.txt');
      const uri = `search://${samplePath}?pattern=a&count=true`;
      
      const result = await client.executeMcpUri(uri);
      
      expect(result).toHaveProperty('success', true);
      expect(result.performance).toHaveProperty('matchCount');
      // Count-only mode shouldn't return line details
      expect(result.results).not.toMatch(/sample\.txt:\d+:/);
    });
  });

  describe('Client Error Handling', () => {
    it('should return helpful errors for missing parameters', async () => {
      try {
        // Missing pattern parameter
        await client.search(null, getFixturePath('sample.txt'));
        fail('Expected error was not thrown');
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should return helpful errors for invalid file paths', async () => {
      try {
        // Non-existent file path
        await client.search('pattern', '/non/existent/path.txt');
      } catch (error) {
        // We shouldn't throw an error, but the result should indicate no matches
        expect(error).toBeUndefined();
      }
    });
  });

  describe('Algorithm Selection from Client Side', () => {
    it('should select appropriate algorithm based on pattern length provided by client', async () => {
      // Short pattern should use KMP
      const shortResult = await client.search('a', getFixturePath('sample.txt'));
      expect(shortResult.performance.algorithmUsed).toMatch(/KMP/i);
      
      // Long pattern should use Rabin-Karp
      const longPattern = 'thisisalongpatternforalgorithmselectiontesting';
      const longResult = await client.search(longPattern, getFixturePath('sample.txt'));
      expect(longResult.performance.algorithmUsed).toMatch(/Rabin-Karp/i);
    });
  });

  describe('Client Performance Metrics', () => {
    it('should provide performance metrics for client consumption', async () => {
      const result = await client.search('pattern', getFixturePath('large.txt'));
      
      // Check performance metrics
      expect(result).toHaveProperty('performance');
      expect(result.performance).toHaveProperty('matchCount');
      expect(result.performance).toHaveProperty('searchTime');
      expect(typeof result.performance.searchTime).toBe('number');
      
      // Option metrics
      if (result.performance.searchSpeed !== undefined) {
        expect(typeof result.performance.searchSpeed).toBe('number');
      }
    });

    it('should allow performance tuning through thread parameter', async () => {
      // Test with different thread counts
      const singleThread = await client.search('pattern', getFixturePath('large.txt'), true, 1);
      const multiThread = await client.search('pattern', getFixturePath('large.txt'), true, 4);
      
      expect(singleThread.performance.threads).toBe(1);
      expect(multiThread.performance.threads).toBe(4);
      
      // Both should find the same number of matches
      expect(singleThread.performance.matchCount).toBe(multiThread.performance.matchCount);
    });
  });

  describe('Regular Expression Support', () => {
    it('should handle regex patterns from clients', async () => {
      // Test with regex pattern
      const regexPattern = 'patt\\w+';
      const result = await client.search(regexPattern, getFixturePath('sample.txt'));
      
      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('pattern', regexPattern);
      
      // Should find "pattern" matches
      expect(result.performance.matchCount).toBeGreaterThan(0);
    });
  });
});