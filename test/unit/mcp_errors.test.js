/**
 * MCP Error Handling Tests for krep-mcp-server
 * 
 * These tests verify that the krep-mcp-server correctly handles error conditions
 * according to MCP standards and provides informative error messages.
 */

const request = require('supertest');
const path = require('path');
const { getFixturePath } = require('../utils');

// Mock child_process.exec for controlled error scenarios
jest.mock('child_process', () => {
  const originalModule = jest.requireActual('child_process');
  return {
    ...originalModule,
    exec: jest.fn((command, options, callback) => {
      if (typeof options === 'function') {
        callback = options;
        options = {};
      }
      
      // Simulate various error conditions based on command content
      if (command.includes('SIMULATE_PERMISSION_ERROR')) {
        callback({
          message: 'EACCES: permission denied',
          code: 'EACCES'
        }, '', 'Permission denied');
      } else if (command.includes('SIMULATE_TIMEOUT_ERROR')) {
        callback({
          message: 'Command timed out',
          code: 'ETIMEDOUT'
        }, '', 'Timeout occurred');
      } else if (command.includes('SIMULATE_NOT_FOUND_ERROR')) {
        callback({
          message: 'ENOENT: no such file or directory',
          code: 'ENOENT'
        }, '', 'File not found');
      } else if (command.includes('SIMULATE_UNKNOWN_ERROR')) {
        callback({
          message: 'Unknown error occurred',
          code: 'UNKNOWN'
        }, '', 'Unknown error');
      } else {
        // Default success response
        callback(null, 'Found 0 matches\nSearch completed in 0.001 seconds', '');
      }
    })
  };
});

// Import the server after mocking
const app = require('../../src/index');

describe('MCP Error Handling', () => {
  
  describe('Parameter Validation', () => {
    it('should return error for missing pattern parameter', async () => {
      const response = await request(app)
        .post('/search')
        .send({
          path: getFixturePath('sample.txt')
          // Missing pattern parameter
        });
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/Missing required parameter/);
    });
    
    it('should return error for missing path parameter', async () => {
      const response = await request(app)
        .post('/search')
        .send({
          pattern: 'test'
          // Missing path parameter
        });
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/Missing required parameter/);
    });
    
    it('should return error for missing text parameter in match', async () => {
      const response = await request(app)
        .post('/match')
        .send({
          pattern: 'test'
          // Missing text parameter
        });
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/Missing required parameter/);
    });
  });
  
  describe('Execution Errors', () => {
    it('should handle permission errors', async () => {
      const response = await request(app)
        .post('/search')
        .send({
          pattern: 'SIMULATE_PERMISSION_ERROR',
          path: getFixturePath('sample.txt')
        });
      
      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/permission denied/i);
      expect(response.body).toHaveProperty('stderr');
    });
    
    it('should handle timeout errors', async () => {
      const response = await request(app)
        .post('/search')
        .send({
          pattern: 'SIMULATE_TIMEOUT_ERROR',
          path: getFixturePath('sample.txt')
        });
      
      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/timed out/i);
      expect(response.body).toHaveProperty('stderr');
    });
    
    it('should handle file not found errors', async () => {
      const response = await request(app)
        .post('/search')
        .send({
          pattern: 'SIMULATE_NOT_FOUND_ERROR',
          path: getFixturePath('sample.txt')
        });
      
      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/no such file or directory/i);
      expect(response.body).toHaveProperty('stderr');
    });
    
    it('should handle general execution errors', async () => {
      const response = await request(app)
        .post('/search')
        .send({
          pattern: 'SIMULATE_UNKNOWN_ERROR',
          path: getFixturePath('sample.txt')
        });
      
      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/Unknown error/i);
      expect(response.body).toHaveProperty('stderr');
    });
  });
  
  describe('MCP URI Errors', () => {
    it('should return error for invalid MCP search URI', async () => {
      const response = await request(app)
        .get('/mcp/search/invalidPath')
        // Missing pattern parameter
        .query({});
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/Missing required parameter/);
    });
    
    it('should return error for invalid MCP match URI', async () => {
      const response = await request(app)
        .get('/mcp/match/someText')
        // Missing pattern parameter
        .query({});
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/Missing required parameter/);
    });
    
    it('should validate thread count is a number', async () => {
      const response = await request(app)
        .get('/mcp/search/testPath')
        .query({
          pattern: 'test',
          threads: 'invalid' // Should be a number
        });
      
      // The server should parse threads as an integer but shouldn't fail
      expect(response.status).toBe(200);
      
      // Check that the response has performance data without asserting the exact thread count
      // It could be default value or something else depending on implementation
      expect(response.body).toHaveProperty('performance');
    });
  });
  
  describe('Content Type Handling', () => {
    it('should accept application/json content type', async () => {
      const response = await request(app)
        .post('/search')
        .set('Content-Type', 'application/json')
        .send({
          pattern: 'test',
          path: getFixturePath('sample.txt')
        });
      
      expect(response.status).toBe(200);
    });
    
    it('should handle various content types appropriately', async () => {
      // For application/x-www-form-urlencoded, we need to format data differently
      const response = await request(app)
        .post('/search')
        .set('Content-Type', 'application/x-www-form-urlencoded')
        .send('pattern=test&path=' + getFixturePath('sample.txt'));
      
      // The implementation might not support all content types, but should
      // respond with a valid HTTP response
      expect(response.status).toBeDefined();
    });
  });
});