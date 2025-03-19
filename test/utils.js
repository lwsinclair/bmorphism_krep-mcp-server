/**
 * Test utilities for krep-mcp-server
 */

const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

// Path to test fixtures
const FIXTURES_PATH = path.join(__dirname, 'fixtures');

// Utility to get fixture path
const getFixturePath = (filename) => path.join(FIXTURES_PATH, filename);

// Sample text from sample.txt for in-memory tests
const SAMPLE_TEXT = `This is a sample text file for testing the krep-mcp-server.
It contains multiple lines with various patterns.
Some patterns appear multiple times, like pattern, PATTERN, and Pattern.
This helps test case-insensitive searching.
The quick brown fox jumps over the lazy dog.
We also have some longer patterns like abcdefghijklmnopqrstuvwxyz.
Short patterns like ab should also be findable.
Single character patterns like 'a' appear frequently in this text.
We need to test boundaries as well, so here's some text at the end.`;

// Directly execute krep for comparison testing
const executeKrep = async (pattern, filePath, options = {}) => {
  const { caseSensitive = true, threads = 4, countOnly = false } = options;
  
  const caseFlag = caseSensitive ? '' : '-i';
  const threadFlag = `-t ${threads}`;
  const countFlag = countOnly ? '-c' : '';
  
  // Path to the krep binary
  const KREP_PATH = path.join(__dirname, '../../krep-native/krep');
  
  // Execute command
  const command = `${KREP_PATH} ${caseFlag} ${threadFlag} ${countFlag} "${pattern}" "${filePath}"`;
  try {
    const { stdout, stderr } = await execAsync(command);
    return {
      stdout,
      stderr,
      success: true
    };
  } catch (error) {
    return {
      stdout: '',
      stderr: error.message,
      success: false
    };
  }
};

// Directly execute krep for string matching
const executeKrepMatch = async (pattern, text, options = {}) => {
  const { caseSensitive = true, threads = 4, countOnly = false } = options;
  
  const caseFlag = caseSensitive ? '' : '-i';
  const threadFlag = `-t ${threads}`;
  const countFlag = countOnly ? '-c' : '';
  
  // Path to the krep binary
  const KREP_PATH = path.join(__dirname, '../../krep-native/krep');
  
  // Execute command
  const command = `${KREP_PATH} ${caseFlag} ${threadFlag} ${countFlag} -s "${pattern}" "${text}"`;
  try {
    const { stdout, stderr } = await execAsync(command);
    return {
      stdout,
      stderr,
      success: true
    };
  } catch (error) {
    return {
      stdout: '',
      stderr: error.message,
      success: false
    };
  }
};

module.exports = {
  getFixturePath,
  SAMPLE_TEXT,
  executeKrep,
  executeKrepMatch
};