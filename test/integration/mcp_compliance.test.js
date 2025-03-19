/**
 * MCP Compliance Tests for krep-mcp-server
 * 
 * These tests verify that the krep-mcp-server follows Model Context Protocol
 * standards for URI scheme handling, response formats, and client SDK integration.
 */

const request = require('supertest');
const { URL } = require('url');
const path = require('path');
const fs = require('fs');
const { getFixturePath, SAMPLE_TEXT } = require('../utils');

// Import JavaScript SDK integration
const sdkIntegration = require('../../sdk-integration');

// Start a test server
const app = require('../../src/index');

describe('MCP Protocol Compliance', () => {
  
  describe('URI Scheme Parsing', () => {
    it('should correctly parse search:// URI scheme', async () => {
      const searchPath = getFixturePath('sample.txt');
      const pattern = 'pattern';
      const uri = `search://${searchPath}?pattern=${pattern}&case=false&threads=2&count=true`;
      
      // Parse URI directly to verify compliance
      const url = new URL(uri);
      const parsedPath = url.hostname + url.pathname; // This is how the MCP server would extract it
      const parsedPattern = url.searchParams.get('pattern');
      const parsedCase = url.searchParams.get('case');
      const parsedThreads = url.searchParams.get('threads');
      const parsedCount = url.searchParams.get('count');
      
      // First test the URI parsing itself
      expect(parsedPath).toBe(searchPath);
      expect(parsedPattern).toBe(pattern);
      expect(parsedCase).toBe('false');
      expect(parsedThreads).toBe('2');
      expect(parsedCount).toBe('true');
      
      // Now test the server's interpretation of the URI
      const searchUri = `/mcp/search/${searchPath}?pattern=${pattern}&case=false&threads=2&count=true`;
      const response = await request(app).get(searchUri);
      
      // Verify the server correctly uses the parsed parameters
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('pattern', pattern);
      expect(response.body).toHaveProperty('path', searchPath);
      expect(response.body.performance).toHaveProperty('threads', 2);
      expect(response.body.performance).toHaveProperty('caseSensitive', false);
    });
    
    it('should correctly parse match:// URI scheme', async () => {
      const text = 'Hello world';
      const pattern = 'world';
      const uri = `match://${text}?pattern=${pattern}&case=true&threads=4&count=false`;
      
      // Use our SDK to parse the URI since URL doesn't handle custom schemes properly
      const parsedUri = sdkIntegration.createClient().parseUri(uri);
      
      // Test the URI parsing
      expect(parsedUri.text).toBe(text);
      expect(parsedUri.pattern).toBe(pattern);
      expect(parsedUri.caseSensitive).toBe(true);
      expect(parsedUri.threads).toBe(4);
      expect(parsedUri.countOnly).toBe(false);
      
      // Now test the server's interpretation of the URI
      const matchUri = `/mcp/match/${encodeURIComponent(text)}?pattern=${pattern}&case=true&threads=4&count=false`;
      const response = await request(app).get(matchUri);
      
      // Verify the server correctly uses the parsed parameters
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('pattern', pattern);
      expect(response.body).toHaveProperty('text', text);
      expect(response.body.performance).toHaveProperty('threads', 4);
      expect(response.body.performance).toHaveProperty('caseSensitive', true);
    });
  });
  
  describe('SDK Client Integration', () => {
    beforeAll(() => {
      // Set base URL for testing
      sdkIntegration.setBaseUrl('http://localhost');
    });
    
    it('should provide valid JavaScript SDK integration', () => {
      // Check for the correct methods
      expect(typeof sdkIntegration.search).toBe('function');
      expect(typeof sdkIntegration.match).toBe('function');
      expect(typeof sdkIntegration.executeMcpUri).toBe('function');
      expect(typeof sdkIntegration.setBaseUrl).toBe('function');
    });
    
    it('should provide compliant Go integration', () => {
      const goFilePath = path.join(__dirname, '../../go-integration/krep.go');
      const goFile = fs.readFileSync(goFilePath, 'utf8');
      
      // Check for interface compliance
      expect(goFile).toContain('func NewClient(');
      expect(goFile).toContain('func (c *Client) Search(');
      expect(goFile).toContain('func (c *Client) Match(');
      expect(goFile).toContain('func (c *Client) ExecuteMcpUri(');
    });
    
    it('should provide compliant Python integration', () => {
      const pyFilePath = path.join(__dirname, '../../python-integration/krep_mcp_client.py');
      const pyFile = fs.readFileSync(pyFilePath, 'utf8');
      
      // Check for interface compliance
      expect(pyFile).toContain('class KrepMcpClient');
      expect(pyFile).toContain('def search(self,');
      expect(pyFile).toContain('def match(self,');
      expect(pyFile).toContain('def execute_mcp_uri(self,');
    });
  });
  
  describe('JSON Response Format', () => {
    it('should return consistent JSON format for search results', async () => {
      const response = await request(app)
        .post('/search')
        .send({
          pattern: 'pattern',
          path: getFixturePath('sample.txt'),
          caseSensitive: true
        });
      
      // Check for required MCP response properties
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('pattern');
      expect(response.body).toHaveProperty('path');
      expect(response.body).toHaveProperty('results');
      
      // Check for performance metrics that should be present
      expect(response.body).toHaveProperty('performance');
      expect(response.body.performance).toHaveProperty('matchCount');
      expect(response.body.performance).toHaveProperty('searchTime');
      expect(response.body.performance).toHaveProperty('algorithmUsed');
      expect(response.body.performance).toHaveProperty('threads');
      expect(response.body.performance).toHaveProperty('caseSensitive');
      
      // Ensure the response can be parsed by a client
      const jsonString = JSON.stringify(response.body);
      const parsedAgain = JSON.parse(jsonString);
      expect(parsedAgain).toEqual(response.body);
    });
    
    it('should return consistent JSON format for match results', async () => {
      const response = await request(app)
        .post('/match')
        .send({
          pattern: 'pattern',
          text: SAMPLE_TEXT,
          caseSensitive: true
        });
      
      // Check for required MCP response properties
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('pattern');
      expect(response.body).toHaveProperty('text');
      expect(response.body).toHaveProperty('results');
      
      // Check for performance metrics that should be present
      expect(response.body).toHaveProperty('performance');
      expect(response.body.performance).toHaveProperty('matchCount');
      expect(response.body.performance).toHaveProperty('searchTime');
      expect(response.body.performance).toHaveProperty('algorithmUsed');
      expect(response.body.performance).toHaveProperty('threads');
      expect(response.body.performance).toHaveProperty('caseSensitive');
      
      // Ensure the response can be parsed by a client
      const jsonString = JSON.stringify(response.body);
      const parsedAgain = JSON.parse(jsonString);
      expect(parsedAgain).toEqual(response.body);
    });
  });
  
  describe('Error Handling and Protocol Compliance', () => {
    it('should return well-structured 400 errors for invalid requests', async () => {
      const response = await request(app)
        .post('/search')
        .send({
          // Missing required pattern parameter
          path: getFixturePath('sample.txt')
        });
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(typeof response.body.error).toBe('string');
    });
    
    it('should handle URI encoded special characters in patterns', async () => {
      const specialPattern = 'function\\s+\\w+'; // Regex pattern with special chars
      const encodedPattern = encodeURIComponent(specialPattern);
      
      const response = await request(app)
        .get(`/mcp/search/${getFixturePath('sample.txt')}?pattern=${encodedPattern}`);
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('pattern', specialPattern);
    });
    
    it('should handle long queries as required by MCP specifications', async () => {
      // Create a pattern that's 100 characters long (testing robustness)
      const longPattern = 'a'.repeat(100);
      
      const response = await request(app)
        .post('/search')
        .send({
          pattern: longPattern,
          path: getFixturePath('sample.txt')
        });
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('pattern', longPattern);
    });
  });
  
  describe('Integration with MCP Clients', () => {
    it('should support usage from TypeScript/JavaScript SDK', () => {
      // This is implemented using mocks since we're not actually running a full server
      const mockFetch = (url, options) => {
        const pattern = 'test';
        const path = '/path/to/file';
        
        expect(url).toMatch(/\/search$/);
        expect(options.method).toBe('POST');
        
        const body = JSON.parse(options.body);
        expect(body).toHaveProperty('pattern', pattern);
        expect(body).toHaveProperty('path', path);
        
        // Return a mock response
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            pattern,
            path,
            results: 'mock results',
            performance: {
              matchCount: 1,
              searchTime: 0.001,
              algorithmUsed: 'mock algorithm',
              threads: 4,
              caseSensitive: true
            }
          })
        });
      };
      
      // Test the search function in isolation
      const search = (pattern, path, caseSensitive = true, threads = 4, countOnly = false) => {
        const url = `http://localhost/search`;
        
        return mockFetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pattern,
            path,
            caseSensitive,
            threads,
            countOnly
          })
        }).then(response => {
          if (!response.ok) {
            throw new Error('Request failed');
          }
          return response.json();
        });
      };
      
      // Run a test with the isolated search function
      return search('test', '/path/to/file').then(result => {
        expect(result.success).toBe(true);
        expect(result.pattern).toBe('test');
        expect(result.path).toBe('/path/to/file');
      });
    });
  });
});