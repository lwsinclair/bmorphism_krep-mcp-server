/**
 * Benchmark suite for krep-mcp-server
 * 
 * This script runs performance tests to measure:
 * - Algorithm selection behavior with different pattern lengths
 * - Threading performance with different file sizes
 * - Comparison between direct krep and server execution
 * 
 * Usage: node test/benchmark.js
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

// Benchmark configurations
const PATTERN_LENGTHS = [1, 2, 3, 4, 8, 12, 16, 20, 24, 32]; // Characters
const THREAD_COUNTS = [1, 2, 4, 8]; // Number of threads
const FILE_SIZES = ['small', 'medium', 'large']; // Small: 10KB, Medium: 1MB, Large: 10MB+

// Helper to create test files of different sizes
async function setupTestFiles() {
  console.log('Setting up test files for benchmarks...');
  
  // Base text repeated to generate test files
  const baseText = fs.readFileSync(path.join(FIXTURES_PATH, 'sample.txt'), 'utf8');
  
  // Small file ~10KB
  const smallFilePath = path.join(FIXTURES_PATH, 'small.txt');
  fs.writeFileSync(smallFilePath, baseText.repeat(1));
  
  // Medium file ~1MB
  const mediumFilePath = path.join(FIXTURES_PATH, 'medium.txt');
  fs.writeFileSync(mediumFilePath, baseText.repeat(100));
  
  // Large file ~10MB
  const largeFilePath = path.join(FIXTURES_PATH, 'large.txt');
  if (!fs.existsSync(largeFilePath)) {
    fs.writeFileSync(largeFilePath, baseText.repeat(1000));
  }
  
  // Create a file with patterns of different lengths for testing
  const patternFilePath = path.join(FIXTURES_PATH, 'patterns.txt');
  let patternText = '';
  for (const length of PATTERN_LENGTHS) {
    const pattern = 'a'.repeat(length);
    patternText += `${pattern}|`;
  }
  fs.writeFileSync(patternFilePath, patternText);
  
  console.log('Test files created.');
}

// Run krep directly and measure performance
async function benchmarkKrepDirect(pattern, filePath, threads = 4, caseSensitive = true, countOnly = false) {
  const caseFlag = caseSensitive ? '' : '-i';
  const threadFlag = `-t ${threads}`;
  const countFlag = countOnly ? '-c' : '';
  
  const command = `${KREP_PATH} ${caseFlag} ${threadFlag} ${countFlag} "${pattern}" "${filePath}"`;
  
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
      duration,
      success: true
    };
  } catch (error) {
    const duration = Date.now() - start;
    console.error(`Error executing krep: ${error.message}`);
    return {
      matchCount: 0,
      searchTime: null,
      searchSpeed: null,
      duration,
      success: false
    };
  }
}

// Benchmark the server API
async function benchmarkServerApi(pattern, filePath, threads = 4, caseSensitive = true, countOnly = false) {
  const start = Date.now();
  try {
    const response = await axios.post(`${SERVER_URL}/search`, {
      pattern,
      path: filePath,
      caseSensitive,
      threads,
      countOnly
    });
    
    const duration = Date.now() - start;
    
    return {
      ...response.data.performance,
      duration,
      success: true
    };
  } catch (error) {
    const duration = Date.now() - start;
    console.error(`Error calling server API: ${error.message}`);
    return {
      matchCount: 0,
      searchTime: null,
      searchSpeed: null,
      duration,
      success: false
    };
  }
}

// Benchmark pattern length vs. algorithm selection
async function benchmarkPatternLengths() {
  console.log('\n=== Pattern Length Benchmark ===');
  console.log('Length | Algorithm | Direct (ms) | Server (ms) | Matches');
  console.log('-----------------------------------------------------------');
  
  const filePath = path.join(FIXTURES_PATH, 'medium.txt');
  
  for (const length of PATTERN_LENGTHS) {
    // Create a pattern of the specified length using 'a' characters
    const pattern = 'a'.repeat(length);
    
    // Benchmark direct krep execution
    const directResult = await benchmarkKrepDirect(pattern, filePath);
    
    // Benchmark server API
    const serverResult = await benchmarkServerApi(pattern, filePath);
    
    // Log results
    console.log(`${length.toString().padEnd(7)} | ${(serverResult.algorithmUsed || 'Unknown').padEnd(10)} | ${directResult.duration.toString().padEnd(11)} | ${serverResult.duration.toString().padEnd(11)} | ${serverResult.matchCount}`);
  }
}

// Benchmark thread count vs. performance for different file sizes
async function benchmarkThreading() {
  console.log('\n=== Threading Benchmark ===');
  console.log('File Size | Threads | Direct (ms) | Server (ms) | Speed (MB/s)');
  console.log('-------------------------------------------------------------');
  
  for (const fileSize of FILE_SIZES) {
    const filePath = path.join(FIXTURES_PATH, `${fileSize}.txt`);
    
    for (const threads of THREAD_COUNTS) {
      // Use a common pattern for all tests
      const pattern = 'pattern';
      
      // Benchmark direct krep execution
      const directResult = await benchmarkKrepDirect(pattern, filePath, threads);
      
      // Benchmark server API
      const serverResult = await benchmarkServerApi(pattern, filePath, threads);
      
      // Log results
      console.log(`${fileSize.padEnd(10)} | ${threads.toString().padEnd(8)} | ${directResult.duration.toString().padEnd(11)} | ${serverResult.duration.toString().padEnd(11)} | ${serverResult.searchSpeed || 'N/A'}`);
    }
  }
}

// Benchmark count-only vs. full search
async function benchmarkCountMode() {
  console.log('\n=== Count-Only Mode Benchmark ===');
  console.log('File Size | Mode      | Direct (ms) | Server (ms) | Matches');
  console.log('----------------------------------------------------------');
  
  for (const fileSize of FILE_SIZES) {
    const filePath = path.join(FIXTURES_PATH, `${fileSize}.txt`);
    const pattern = 'a'; // Common pattern that should have many matches
    
    // Benchmark count-only mode
    const directCountResult = await benchmarkKrepDirect(pattern, filePath, 4, true, true);
    const serverCountResult = await benchmarkServerApi(pattern, filePath, 4, true, true);
    
    // Benchmark full search mode
    const directFullResult = await benchmarkKrepDirect(pattern, filePath, 4, true, false);
    const serverFullResult = await benchmarkServerApi(pattern, filePath, 4, true, false);
    
    // Log results
    console.log(`${fileSize.padEnd(10)} | Count-Only | ${directCountResult.duration.toString().padEnd(11)} | ${serverCountResult.duration.toString().padEnd(11)} | ${serverCountResult.matchCount}`);
    console.log(`${fileSize.padEnd(10)} | Full       | ${directFullResult.duration.toString().padEnd(11)} | ${serverFullResult.duration.toString().padEnd(11)} | ${serverFullResult.matchCount}`);
  }
}

// Main benchmark function
async function runBenchmarks() {
  console.log('Starting krep-mcp-server benchmarks...');
  
  // Setup test files
  await setupTestFiles();
  
  // Run benchmarks
  await benchmarkPatternLengths();
  await benchmarkThreading();
  await benchmarkCountMode();
  
  console.log('\nBenchmarks completed.');
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
  // Check if server is running
  const serverRunning = await checkServer();
  if (!serverRunning) {
    console.error('Error: krep-mcp-server is not running. Please start the server first with:');
    console.error('  node src/index.js');
    process.exit(1);
  }
  
  try {
    await runBenchmarks();
  } catch (error) {
    console.error('Error running benchmarks:', error);
  }
})();