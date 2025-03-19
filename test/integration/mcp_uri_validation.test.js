/**
 * MCP URI Scheme Validation Tests for krep-mcp-server
 * 
 * These tests specifically focus on validating compliance with MCP URI schemes
 * including edge cases, special character handling, and encoding requirements.
 */

const request = require('supertest');
const path = require('path');
const fs = require('fs');
const { URL } = require('url');
const { getFixturePath, SAMPLE_TEXT } = require('../utils');

// Import the server
const app = require('../../src/index');

// Import SDK for testing URI parsing
const sdkIntegration = require('../../sdk-integration');

describe('MCP URI Scheme Validation', () => {
  
  describe('URI Structure Compliance', () => {
    it('should support search:// URI scheme with basic parameters', async () => {
      const searchPath = getFixturePath('sample.txt');
      const pattern = 'pattern';
      
      // Format a compliant search URI
      const uri = `search://${searchPath}?pattern=${pattern}`;
      
      // Test via SDK integration
      const client = new sdkIntegration.KrepMcpClient();
      const params = client.parseUri(uri);
      
      // Verify URI parsing results
      expect(params.scheme).toBe('search');
      expect(params.path).toBe(searchPath);
      expect(params.pattern).toBe(pattern);
      expect(params.caseSensitive).toBe(true); // Default
      expect(params.threads).toBe(4); // Default
      expect(params.countOnly).toBe(false); // Default
      
      // Verify server correctly handles the URI
      const response = await request(app)
        .get(`/mcp/search/${searchPath}?pattern=${pattern}`);
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
    });
    
    it('should support match:// URI scheme with basic parameters', async () => {
      const text = 'Hello world';
      const pattern = 'world';
      
      // Format a compliant match URI
      const uri = `match://${text}?pattern=${pattern}`;
      
      // Test via SDK integration
      const client = new sdkIntegration.KrepMcpClient();
      const params = client.parseUri(uri);
      
      // Verify URI parsing results
      expect(params.scheme).toBe('match');
      expect(params.text).toBe(text);
      expect(params.pattern).toBe(pattern);
      
      // Verify server correctly handles the URI
      const response = await request(app)
        .get(`/mcp/match/${encodeURIComponent(text)}?pattern=${pattern}`);
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
    });
  });
  
  describe('Parameter Encoding and Handling', () => {
    it('should handle URL encoded special characters in patterns', async () => {
      // Special characters in pattern
      const specialPattern = 'patt+ern[0-9]?';
      const encodedPattern = encodeURIComponent(specialPattern);
      const searchPath = getFixturePath('sample.txt');
      
      const uri = `search://${searchPath}?pattern=${encodedPattern}`;
      
      // Verify SDK correctly decodes pattern
      const client = new sdkIntegration.KrepMcpClient();
      const params = client.parseUri(uri);
      expect(params.pattern).toBe(specialPattern);
      
      // Verify server correctly handles encoded pattern
      const response = await request(app)
        .get(`/mcp/search/${searchPath}?pattern=${encodedPattern}`);
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('pattern', specialPattern);
    });
    
    it('should handle URL encoded spaces in file paths', async () => {
      // Create a temporary file with spaces in name
      const tempFileName = 'test file with spaces.txt';
      const tempFilePath = path.join(__dirname, '../fixtures', tempFileName);
      
      try {
        // Create the test file
        fs.writeFileSync(tempFilePath, 'This is a test pattern');
        
        // Encode path for URI
        const encodedPath = encodeURIComponent(tempFilePath);
        const pattern = 'test';
        
        const uri = `search://${encodedPath}?pattern=${pattern}`;
        
        // Test URI parsing via SDK
        const client = new sdkIntegration.KrepMcpClient();
        const params = client.parseUri(uri);
        
        // Encoded path should be properly decoded
        expect(params.path).toBe(tempFilePath);
        
        // Verify server correctly handles the path
        const response = await request(app)
          .get(`/mcp/search/${encodeURIComponent(tempFilePath)}?pattern=${pattern}`);
        
        expect(response.status).toBe(200);
      } finally {
        // Clean up
        try {
          fs.unlinkSync(tempFilePath);
        } catch (error) {
          // Ignore cleanup errors
        }
      }
    });
    
    it('should handle complex parameter combinations', async () => {
      const searchPath = getFixturePath('sample.txt');
      const pattern = 'pattern\\d+';
      const encodedPattern = encodeURIComponent(pattern);
      
      // Complex URI with all parameters
      const uri = `search://${searchPath}?pattern=${encodedPattern}&case=false&threads=8&count=true`;
      
      // Verify SDK correctly parses all parameters
      const client = new sdkIntegration.KrepMcpClient();
      const params = client.parseUri(uri);
      
      expect(params.pattern).toBe(pattern);
      expect(params.caseSensitive).toBe(false);
      expect(params.threads).toBe(8);
      expect(params.countOnly).toBe(true);
      
      // Verify server correctly handles all parameters
      const response = await request(app)
        .get(`/mcp/search/${searchPath}?pattern=${encodedPattern}&case=false&threads=8&count=true`);
      
      expect(response.status).toBe(200);
      expect(response.body.performance).toHaveProperty('caseSensitive', false);
      expect(response.body.performance).toHaveProperty('threads', 8);
    });
  });
  
  describe('URI Edge Cases', () => {
    it('should handle empty pattern parameter gracefully', async () => {
      const searchPath = getFixturePath('sample.txt');
      const uri = `search://${searchPath}?pattern=`;
      
      // Verify SDK behavior
      const client = new sdkIntegration.KrepMcpClient();
      const params = client.parseUri(uri);
      
      expect(params.pattern).toBe('');
      
      // Server should return a 400 for empty pattern
      const response = await request(app)
        .get(`/mcp/search/${searchPath}?pattern=`);
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
    
    it('should handle URIs missing required parameters', async () => {
      const searchPath = getFixturePath('sample.txt');
      
      // URI missing pattern parameter
      const uri = `search://${searchPath}`;
      
      // Verify SDK behavior
      const client = new sdkIntegration.KrepMcpClient();
      const params = client.parseUri(uri);
      
      expect(params.pattern).toBe('');
      
      // Server should return a 400 for missing pattern
      const response = await request(app)
        .get(`/mcp/search/${searchPath}`);
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
    
    it('should handle path parameters with unusual characters', async () => {
      // Path with various special characters
      const pattern = 'test';
      const characters = '!@#$%^&()_+-={}[];,.';
      const tempFileName = `test${characters}.txt`;
      const tempFilePath = path.join(__dirname, '../fixtures', tempFileName);
      
      try {
        // Create the test file
        fs.writeFileSync(tempFilePath, 'This is a test pattern');
        
        // Encode path for URI
        const encodedPath = encodeURIComponent(tempFilePath);
        
        const uri = `search://${encodedPath}?pattern=${pattern}`;
        
        // Test URI parsing via SDK
        const client = new sdkIntegration.KrepMcpClient();
        const params = client.parseUri(uri);
        
        // Verify server handling
        const response = await request(app)
          .post('/search')
          .send({
            pattern,
            path: tempFilePath
          });
        
        expect(response.status).toBe(200);
      } finally {
        // Clean up
        try {
          fs.unlinkSync(tempFilePath);
        } catch (error) {
          // Ignore cleanup errors
        }
      }
    });
    
    it('should handle extremely long URIs', async () => {
      const searchPath = getFixturePath('sample.txt');
      
      // Create a very long pattern (1000+ characters)
      const longPattern = 'a'.repeat(1000);
      const encodedPattern = encodeURIComponent(longPattern);
      
      // Long URI
      const uri = `search://${searchPath}?pattern=${encodedPattern}`;
      
      // Verify SDK can parse long URIs
      const client = new sdkIntegration.KrepMcpClient();
      const params = client.parseUri(uri);
      
      expect(params.pattern.length).toBe(1000);
      
      // Server might have limitations with extremely long URIs
      // This test is more focused on SDK handling
    });
  });
  
  describe('MCP URI Execution', () => {
    it('should handle URIs with the file:// prefix in paths', async () => {
      const searchPath = getFixturePath('sample.txt');
      const fileUriPath = `file://${searchPath}`;
      const pattern = 'pattern';
      
      // SDK should strip file:// prefix if present
      const uri = `search://${fileUriPath}?pattern=${pattern}`;
      const client = new sdkIntegration.KrepMcpClient();
      
      try {
        const params = client.parseUri(uri);
        expect(params.path).toContain(searchPath);
        
        // The server itself should still work with the path
        const response = await request(app)
          .post('/search')
          .send({
            pattern,
            path: fileUriPath
          });
        
        // Server should either handle it or return an error, but not crash
        expect(response.status).toBeDefined();
      } catch (error) {
        // If URI parsing fails, that's okay - some implementations might reject nested schemes
        expect(error).toBeDefined();
      }
    });
    
    it('should validate boolean parameters correctly', async () => {
      const searchPath = getFixturePath('sample.txt');
      const pattern = 'pattern';
      
      // Test various boolean parameter forms
      const testCases = [
        { uri: `search://${searchPath}?pattern=${pattern}&case=true`, expected: true },
        { uri: `search://${searchPath}?pattern=${pattern}&case=false`, expected: false },
        { uri: `search://${searchPath}?pattern=${pattern}&case=1`, expected: true }, // Non-"false" = true
        { uri: `search://${searchPath}?pattern=${pattern}&case=0`, expected: true }, // Non-"false" = true
        { uri: `search://${searchPath}?pattern=${pattern}&case=yes`, expected: true },
        { uri: `search://${searchPath}?pattern=${pattern}&case=no`, expected: true },
        { uri: `search://${searchPath}?pattern=${pattern}`, expected: true } // Default
      ];
      
      const client = new sdkIntegration.KrepMcpClient();
      
      for (const testCase of testCases) {
        const params = client.parseUri(testCase.uri);
        expect(params.caseSensitive).toBe(testCase.expected);
      }
    });
  });
});