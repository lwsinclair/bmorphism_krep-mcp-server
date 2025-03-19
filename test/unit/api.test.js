/**
 * Unit tests for krep-mcp-server API endpoints
 */

const request = require('supertest');
const path = require('path');
const { getFixturePath, SAMPLE_TEXT } = require('../utils');

// Mock child_process.exec
jest.mock('child_process', () => {
  const originalModule = jest.requireActual('child_process');
  return {
    ...originalModule,
    exec: jest.fn((command, options, callback) => {
      if (typeof options === 'function') {
        callback = options;
        options = {};
      }
      
      // Simulate krep command execution
      if (command.includes('-c')) {
        // Count-only mode
        callback(null, 'Found 5 matches\nSearch completed in 0.001 seconds\n100.5 MB/s\nUsing Boyer-Moore-Horspool algorithm', '');
      } else if (command.includes('-s')) {
        // String match mode
        callback(null, 'Match: found "pattern" at position 42\nMatch: found "pattern" at position 142\nFound 2 matches\nSearch completed in 0.001 seconds', '');
      } else {
        // File search mode
        callback(null, 'sample.txt:3: Some patterns appear multiple times, like pattern, PATTERN, and Pattern.\nsample.txt:7: Short patterns like ab should also be findable.\nFound 2 matches\nSearch completed in 0.001 seconds\n100.5 MB/s\nUsing Boyer-Moore-Horspool algorithm', '');
      }
    })
  };
});

// Import the server after mocking dependencies
const app = require('../../src/index');

describe('API Endpoints', () => {
  
  describe('GET /', () => {
    it('should return server information', async () => {
      const response = await request(app).get('/');
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('name', 'krep-mcp-server');
      expect(response.body).toHaveProperty('version');
      expect(response.body).toHaveProperty('endpoints');
      expect(response.body).toHaveProperty('algorithms');
    });
  });
  
  describe('GET /health', () => {
    it('should return health status', async () => {
      const response = await request(app).get('/health');
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'ok');
    });
  });
  
  describe('POST /search', () => {
    it('should search for patterns in files', async () => {
      const response = await request(app)
        .post('/search')
        .send({
          pattern: 'pattern',
          path: getFixturePath('sample.txt'),
          caseSensitive: true
        });
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('pattern', 'pattern');
      expect(response.body).toHaveProperty('results');
      expect(response.body).toHaveProperty('performance');
      expect(response.body.performance).toHaveProperty('matchCount');
      expect(response.body.performance).toHaveProperty('searchTime');
      expect(response.body.performance).toHaveProperty('algorithmUsed');
    });
    
    it('should return error for missing parameters', async () => {
      const response = await request(app)
        .post('/search')
        .send({
          pattern: 'pattern'
          // Missing path parameter
        });
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
    
    it('should support count-only mode', async () => {
      const response = await request(app)
        .post('/search')
        .send({
          pattern: 'pattern',
          path: getFixturePath('sample.txt'),
          countOnly: true
        });
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('performance');
      expect(response.body.performance).toHaveProperty('matchCount', 5);
    });
  });
  
  describe('POST /match', () => {
    it('should match patterns in strings', async () => {
      const response = await request(app)
        .post('/match')
        .send({
          pattern: 'pattern',
          text: SAMPLE_TEXT,
          caseSensitive: true
        });
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('pattern', 'pattern');
      expect(response.body).toHaveProperty('results');
      expect(response.body).toHaveProperty('performance');
      expect(response.body.performance).toHaveProperty('matchCount');
    });
    
    it('should return error for missing parameters', async () => {
      const response = await request(app)
        .post('/match')
        .send({
          pattern: 'pattern'
          // Missing text parameter
        });
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });
  
  describe('GET /mcp/search/*', () => {
    it('should handle MCP URI scheme for search', async () => {
      const response = await request(app)
        .get(`/mcp/search/${getFixturePath('sample.txt')}?pattern=pattern&case=true`);
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('pattern', 'pattern');
      expect(response.body).toHaveProperty('results');
    });
    
    it('should return error for missing parameters', async () => {
      const response = await request(app)
        .get(`/mcp/search/${getFixturePath('sample.txt')}`); // Missing pattern
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });
  
  describe('GET /mcp/match/*', () => {
    it('should handle MCP URI scheme for match', async () => {
      const response = await request(app)
        .get(`/mcp/match/${encodeURIComponent(SAMPLE_TEXT)}?pattern=pattern&case=true`);
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('pattern', 'pattern');
      expect(response.body).toHaveProperty('results');
    });
    
    it('should return error for missing parameters', async () => {
      const response = await request(app)
        .get(`/mcp/match/${encodeURIComponent(SAMPLE_TEXT)}`); // Missing pattern
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });
  
  describe('GET /performance', () => {
    it('should return performance information', async () => {
      const response = await request(app).get('/performance');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('algorithms');
      expect(response.body).toHaveProperty('optimizations');
      expect(response.body.algorithms).toHaveProperty('kmp');
      expect(response.body.algorithms).toHaveProperty('boyerMoore');
      expect(response.body.algorithms).toHaveProperty('rabinKarp');
    });
  });
  
  describe('GET /algorithm-selection', () => {
    it('should return algorithm selection guide', async () => {
      const response = await request(app).get('/algorithm-selection');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('selectionCriteria');
      expect(response.body).toHaveProperty('automaticSelection');
      expect(response.body.selectionCriteria).toHaveProperty('patternLength');
    });
  });
});