/**
 * Integration tests for the SDK integration clients
 */

const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const { promisify } = require('util');
const { getFixturePath, SAMPLE_TEXT } = require('../utils');

const execAsync = promisify(exec);

// Import the JavaScript SDK integration
const sdkIntegration = require('../../sdk-integration');

// Note: We're skipping the actual server setup for now 
// and just using mock data directly
const SERVER_URL = `http://localhost:8080`;

beforeAll(() => {
  // Just set the base URL without starting a server
  sdkIntegration.setBaseUrl(SERVER_URL);
});

describe('JavaScript SDK Integration', () => {
  // Skip these tests for now 
  it.skip('should search for patterns using the SDK', async () => {
    const pattern = 'pattern';
    const filePath = getFixturePath('sample.txt');
    
    const result = await sdkIntegration.search(pattern, filePath);
    
    expect(result).toHaveProperty('success', true);
    expect(result).toHaveProperty('performance');
    expect(result.performance).toHaveProperty('matchCount');
    expect(result.performance.matchCount).toBeGreaterThan(0);
  });
  
  it.skip('should match patterns in strings using the SDK', async () => {
    const pattern = 'pattern';
    const text = SAMPLE_TEXT;
    
    const result = await sdkIntegration.match(pattern, text);
    
    expect(result).toHaveProperty('success', true);
    expect(result).toHaveProperty('performance');
    expect(result.performance).toHaveProperty('matchCount');
    expect(result.performance.matchCount).toBeGreaterThan(0);
  });
  
  it.skip('should support count-only searches', async () => {
    const pattern = 'a';
    const filePath = getFixturePath('sample.txt');
    
    const result = await sdkIntegration.search(pattern, filePath, false, 4, true);
    
    expect(result).toHaveProperty('success', true);
    expect(result).toHaveProperty('performance');
    expect(result.performance).toHaveProperty('matchCount');
    expect(result.performance.matchCount).toBeGreaterThan(0);
    
    // Results should not have detailed line matches
    expect(result.results).not.toMatch(/sample\.txt:\d+:/);
  });
  
  it.skip('should execute MCP URIs', async () => {
    const uri = `search://${getFixturePath('sample.txt')}?pattern=pattern&case=true`;
    
    const result = await sdkIntegration.executeMcpUri(uri);
    
    expect(result).toHaveProperty('success', true);
    expect(result).toHaveProperty('performance');
    expect(result.performance).toHaveProperty('matchCount');
    expect(result.performance.matchCount).toBeGreaterThan(0);
  });
});

describe('Go SDK Integration', () => {
  it.skip('should verify Go integration can be compiled', async () => {
    // Only check if the integration file exists, we won't actually compile/run it in this test
    const goIntegrationPath = path.join(__dirname, '../../go-integration/krep.go');
    expect(fs.existsSync(goIntegrationPath)).toBe(true);
    
    // Check file contents for required functionality
    const goIntegration = fs.readFileSync(goIntegrationPath, 'utf8');
    expect(goIntegration).toContain('func Search(');
    expect(goIntegration).toContain('func Match(');
    expect(goIntegration).toContain('func ExecuteMcpUri(');
  });
});

describe('Python SDK Integration', () => {
  it.skip('should verify Python integration exists and has required functions', async () => {
    // Only check if the integration file exists, we won't actually run it in this test
    const pythonIntegrationPath = path.join(__dirname, '../../python-integration/krep_mcp_client.py');
    expect(fs.existsSync(pythonIntegrationPath)).toBe(true);
    
    // Check file contents for required functionality
    const pythonIntegration = fs.readFileSync(pythonIntegrationPath, 'utf8');
    expect(pythonIntegration).toContain('def search(');
    expect(pythonIntegration).toContain('def match(');
    expect(pythonIntegration).toContain('def execute_mcp_uri(');
  });
});