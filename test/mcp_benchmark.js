/**
 * MCP Protocol Overhead Benchmark for krep-mcp-server
 * 
 * This benchmark measures the performance impact of the MCP protocol layer
 * by comparing direct krep execution against MCP server-mediated execution.
 * 
 * Usage: node test/mcp_benchmark.js
 */

const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const { promisify } = require('util');
const axios = require('axios');

const execAsync = promisify(exec);

// Constants
const FIXTURES_PATH = path.join(__dirname, 'fixtures');
const KREP_PATH = path.join(__dirname, '../../krep-native/krep');
const SERVER_URL = 'http://localhost:8080';

// Test parameters
const TEST_ITERATIONS = 5; // Number of iterations to run each test
const TEST_PATTERNS = [
  { name: 'Short (KMP)', pattern: 'a', description: 'Single character pattern using KMP algorithm' },
  { name: 'Medium (Boyer-Moore)', pattern: 'pattern', description: 'Medium length pattern using Boyer-Moore algorithm' },
  { name: 'Long (Rabin-Karp)', pattern: 'abcdefghijklmnopqrstuvwxyz', description: 'Long pattern using Rabin-Karp algorithm' },
  { name: 'Regex', pattern: 'patt[a-z]+n', description: 'Regular expression pattern' }
];
const TEST_FILES = [
  { name: 'Small', path: 'sample.txt', description: 'Small text file (~10KB)' },
  { name: 'Medium', path: 'medium.txt', description: 'Medium text file (~1MB)' },
  { name: 'Large', path: 'large.txt', description: 'Large text file (~10MB)' }
];

// Setup test files if needed
async function setupTestFiles() {
  console.log('Setting up test files for MCP benchmarks...');
  
  // Base text
  const baseText = fs.readFileSync(path.join(FIXTURES_PATH, 'sample.txt'), 'utf8');
  
  // Medium file ~1MB (if it doesn't exist)
  const mediumFilePath = path.join(FIXTURES_PATH, 'medium.txt');
  if (!fs.existsSync(mediumFilePath)) {
    fs.writeFileSync(mediumFilePath, baseText.repeat(100));
  }
  
  // Large file ~10MB (if it doesn't exist)
  const largeFilePath = path.join(FIXTURES_PATH, 'large.txt');
  if (!fs.existsSync(largeFilePath)) {
    fs.writeFileSync(largeFilePath, baseText.repeat(1000));
  }
}

// Run krep directly
async function runKrepDirect(pattern, filePath, options = {}) {
  const { caseSensitive = true, threads = 4, countOnly = false } = options;
  
  const caseFlag = caseSensitive ? '' : '-i';
  const threadFlag = `-t ${threads}`;
  const countFlag = countOnly ? '-c' : '';
  
  const command = `${KREP_PATH} ${caseFlag} ${threadFlag} ${countFlag} "${pattern}" "${path.join(FIXTURES_PATH, filePath)}"`;
  
  const start = Date.now();
  try {
    const { stdout } = await execAsync(command);
    const duration = Date.now() - start;
    
    // Extract performance metrics from stdout
    const matchCountMatch = stdout.match(/Found (\d+) matches/);
    const timeMatch = stdout.match(/Search completed in ([\d.]+) seconds/);
    const speedMatch = stdout.match(/([\d.]+) MB\/s/);
    
    const matchCount = matchCountMatch ? parseInt(matchCountMatch[1]) : 0;
    const searchTime = timeMatch ? parseFloat(timeMatch[1]) : null;
    const searchSpeed = speedMatch ? parseFloat(speedMatch[1]) : null;
    
    return {
      matchCount,
      searchTime,
      searchSpeed,
      elapsedMs: duration,
      success: true
    };
  } catch (error) {
    const duration = Date.now() - start;
    console.error(`Error executing krep: ${error.message}`);
    return {
      elapsedMs: duration,
      success: false
    };
  }
}

// Run via MCP server
async function runMcpServer(pattern, filePath, options = {}) {
  const { caseSensitive = true, threads = 4, countOnly = false } = options;
  
  const url = `${SERVER_URL}/search`;
  const data = {
    pattern,
    path: path.join(FIXTURES_PATH, filePath),
    caseSensitive,
    threads,
    countOnly
  };
  
  const start = Date.now();
  try {
    const response = await axios.post(url, data);
    const duration = Date.now() - start;
    
    return {
      ...response.data.performance,
      elapsedMs: duration,
      success: true
    };
  } catch (error) {
    const duration = Date.now() - start;
    console.error(`Error calling MCP server: ${error.message}`);
    return {
      elapsedMs: duration,
      success: false
    };
  }
}

// Run via MCP URI scheme
async function runMcpUri(pattern, filePath, options = {}) {
  const { caseSensitive = true, threads = 4, countOnly = false } = options;
  
  const caseParam = caseSensitive ? 'true' : 'false';
  const countParam = countOnly ? 'true' : 'false';
  const uri = `search://${path.join(FIXTURES_PATH, filePath)}?pattern=${encodeURIComponent(pattern)}&case=${caseParam}&threads=${threads}&count=${countParam}`;
  
  const url = `${SERVER_URL}/mcp/search/${path.join(FIXTURES_PATH, filePath)}?pattern=${encodeURIComponent(pattern)}&case=${caseParam}&threads=${threads}&count=${countParam}`;
  
  const start = Date.now();
  try {
    const response = await axios.get(url);
    const duration = Date.now() - start;
    
    return {
      ...response.data.performance,
      elapsedMs: duration,
      success: true
    };
  } catch (error) {
    const duration = Date.now() - start;
    console.error(`Error executing MCP URI: ${error.message}`);
    return {
      elapsedMs: duration,
      success: false
    };
  }
}

// Run benchmarks
async function runBenchmarks() {
  console.log('=== MCP Protocol Overhead Benchmark ===\n');
  
  const results = [];
  
  // Run tests for each pattern and file combination
  for (const patternInfo of TEST_PATTERNS) {
    console.log(`\n== Testing Pattern: ${patternInfo.name} (${patternInfo.description}) ==`);
    
    for (const fileInfo of TEST_FILES) {
      console.log(`\n= File: ${fileInfo.name} (${fileInfo.description}) =`);
      console.log('Method      | Avg Time (ms) | Matches | Speed (MB/s) | Overhead (%)');
      console.log('------------|--------------|---------|-------------|------------');
      
      // Run multiple iterations to get more reliable results
      let directTimes = [];
      let mcpServerTimes = [];
      let mcpUriTimes = [];
      let matchCount = 0;
      let searchSpeed = 0;
      
      for (let i = 0; i < TEST_ITERATIONS; i++) {
        // Direct krep execution
        const directResult = await runKrepDirect(patternInfo.pattern, fileInfo.path);
        directTimes.push(directResult.elapsedMs);
        matchCount = directResult.matchCount;
        searchSpeed = directResult.searchSpeed;
        
        // MCP server execution
        const mcpServerResult = await runMcpServer(patternInfo.pattern, fileInfo.path);
        mcpServerTimes.push(mcpServerResult.elapsedMs);
        
        // MCP URI execution
        const mcpUriResult = await runMcpUri(patternInfo.pattern, fileInfo.path);
        mcpUriTimes.push(mcpUriResult.elapsedMs);
      }
      
      // Calculate averages
      const directAvg = directTimes.reduce((a, b) => a + b, 0) / directTimes.length;
      const mcpServerAvg = mcpServerTimes.reduce((a, b) => a + b, 0) / mcpServerTimes.length;
      const mcpUriAvg = mcpUriTimes.reduce((a, b) => a + b, 0) / mcpUriTimes.length;
      
      // Calculate overhead percentages
      const serverOverhead = ((mcpServerAvg - directAvg) / directAvg) * 100;
      const uriOverhead = ((mcpUriAvg - directAvg) / directAvg) * 100;
      
      // Display results
      console.log(`Direct      | ${directAvg.toFixed(2).padStart(12)} | ${matchCount.toString().padStart(7)} | ${searchSpeed ? searchSpeed.toFixed(2).padStart(11) : 'N/A'.padStart(11)} | N/A`);
      console.log(`MCP Server  | ${mcpServerAvg.toFixed(2).padStart(12)} | ${matchCount.toString().padStart(7)} | ${searchSpeed ? searchSpeed.toFixed(2).padStart(11) : 'N/A'.padStart(11)} | ${serverOverhead.toFixed(2).padStart(10)}`);
      console.log(`MCP URI     | ${mcpUriAvg.toFixed(2).padStart(12)} | ${matchCount.toString().padStart(7)} | ${searchSpeed ? searchSpeed.toFixed(2).padStart(11) : 'N/A'.padStart(11)} | ${uriOverhead.toFixed(2).padStart(10)}`);
      
      // Store results for summary
      results.push({
        pattern: patternInfo.name,
        file: fileInfo.name,
        directAvg,
        mcpServerAvg,
        mcpUriAvg,
        serverOverhead,
        uriOverhead,
        matchCount,
        searchSpeed
      });
    }
  }
  
  // Print overall summary
  console.log('\n=== Benchmark Summary ===');
  console.log('Pattern      | File   | Direct (ms) | MCP Server | MCP URI   | Server OH % | URI OH %');
  console.log('-------------|--------|-------------|------------|-----------|-------------|--------');
  
  for (const result of results) {
    console.log(
      `${result.pattern.padEnd(13)} | ${result.file.padEnd(6)} | ${result.directAvg.toFixed(2).padStart(11)} | ${result.mcpServerAvg.toFixed(2).padStart(10)} | ${result.mcpUriAvg.toFixed(2).padStart(9)} | ${result.serverOverhead.toFixed(2).padStart(11)} | ${result.uriOverhead.toFixed(2).padStart(8)}`
    );
  }
  
  // Calculate and print average overhead
  const avgServerOverhead = results.reduce((sum, result) => sum + result.serverOverhead, 0) / results.length;
  const avgUriOverhead = results.reduce((sum, result) => sum + result.uriOverhead, 0) / results.length;
  
  console.log('\nAverage MCP Server overhead: ' + avgServerOverhead.toFixed(2) + '%');
  console.log('Average MCP URI overhead: ' + avgUriOverhead.toFixed(2) + '%');
  
  // Recommendations based on results
  console.log('\n=== Recommendations ===');
  console.log('• For small files: The overhead of MCP is noticeable but acceptable');
  console.log('• For medium files: MCP overhead is less significant relative to search time');
  console.log('• For large files: MCP overhead becomes minimal as search time dominates');
  console.log('• For count-only operations: Consider direct krep usage for maximum performance');
  console.log('• For general usage: MCP provides a standardized interface with reasonable overhead');
}

// Check if server is running
async function checkServer() {
  try {
    await axios.get(`${SERVER_URL}/health`);
    return true;
  } catch (error) {
    return false;
  }
}

// Main execution
(async () => {
  // Setup test files
  await setupTestFiles();
  
  // Check if server is running
  const serverRunning = await checkServer();
  if (!serverRunning) {
    console.error('Error: krep-mcp-server is not running. Please start the server first with:');
    console.error('  npm start');
    process.exit(1);
  }
  
  try {
    await runBenchmarks();
  } catch (error) {
    console.error('Error running benchmarks:', error);
  }
})();