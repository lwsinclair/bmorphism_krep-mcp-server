// MCP-compliant server for krep
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Set up error handling for uncaught exceptions
process.on('uncaughtException', error => {
  console.error(`[MCP Server] Uncaught exception: ${error.message}`);
  console.error(`[MCP Server] Stack trace: ${error.stack}`);
  // Don't exit the process, just log the error
});

// Set up error handling for unhandled promise rejections
process.on('unhandledRejection', reason => {
  console.error(`[MCP Server] Unhandled promise rejection: ${reason}`);
  // Don't exit the process, just log the error
});

// Determine optimal thread count based on available CPU cores
function getOptimalThreadCount() {
  // Get the number of CPU cores available
  const cpuCount = os.cpus().length;
  
  // Use all available cores (can be adjusted as needed)
  // Some strategies use cpuCount - 1 to leave a core for the OS
  return cpuCount;
}

// Find the krep binary
function findKrepBinary() {
  // Get the full path to the node executable directory
  const nodeDirectory = path.dirname(process.execPath);

  // Try multiple possible paths for the krep binary - ensure all are absolute
  const possiblePaths = [
    // Project-specific directories
    path.resolve(__dirname, '../../krep-native/krep'), // Relative to project directory
    path.resolve(__dirname, '../krep-native/krep'), // Alternative relative path

    // Standard installation locations
    '/usr/local/bin/krep', // Standard installation
    '/opt/homebrew/bin/krep', // Homebrew on Apple Silicon

    // Look near node executable
    path.join(nodeDirectory, 'krep'),

    // Home directory options
    path.join(process.env.HOME || '', 'krep-native/krep'),
    path.join(process.env.HOME || '', 'bin/krep'),
  ];

  // Always log the paths being searched to help with debugging
  console.error('Looking for krep binary in:');

  // Try each path and return the first one that exists
  for (const p of possiblePaths) {
    const exists = fs.existsSync(p);
    console.error(`- ${p} (${exists ? 'found' : 'not found'})`);
    if (exists) {
      return p;
    }
  }

  // If KREP_PATH is set in environment, use that even if it doesn't exist
  // This allows for testing and development scenarios
  if (process.env.KREP_PATH) {
    console.error(`Using KREP_PATH from environment: ${process.env.KREP_PATH}`);
    return process.env.KREP_PATH;
  }

  return null; // Return null if no binary found
}

// Path to the krep binary - allow it to be set via environment variable
const KREP_PATH =
  process.env.KREP_PATH || findKrepBinary() || path.join(__dirname, '../../krep-native/krep');
console.error(`[MCP Server] Using krep binary at: ${KREP_PATH}`);

// MCP JSON-RPC server
class KrepMcpServer {
  constructor() {
    // Store start time for performance logging
    this.startTime = Date.now();

    // Log server initialization
    console.error(`[MCP Server] Initializing krep-mcp-server at ${new Date().toISOString()}`);
    console.error(`[MCP Server] Node version: ${process.version}`);
    console.error(`[MCP Server] Working directory: ${process.cwd()}`);

    // Check if krep binary exists, unless we're in test mode
    if (!fs.existsSync(KREP_PATH) && !process.env.KREP_SKIP_CHECK) {
      const errorMessage = `Error: krep binary not found at ${KREP_PATH}`;
      console.error(`[MCP Server] ${errorMessage}`);
      console.error('[MCP Server] Please install krep or set KREP_PATH environment variable');

      // In production mode, exit. In test mode with KREP_TEST_MODE, continue.
      if (!process.env.KREP_TEST_MODE) {
        this.sendLogMessage('error', {
          message: errorMessage,
          binaryPath: KREP_PATH,
          cwd: process.cwd(),
          env: {
            HOME: process.env.HOME,
            PATH: process.env.PATH,
            // Only include non-sensitive variables
          },
        });

        // Exit after a short delay to allow log message to be processed
        setTimeout(() => process.exit(1), 100);
        return;
      }
      console.error('[MCP Server] Running in test mode, continuing despite missing krep binary');
    } else {
      console.error(`[MCP Server] Using krep binary at: ${KREP_PATH}`);
    }

    this.functions = {
      krep: this.krepFunction.bind(this),
    };

    this.initialized = false;
    this.handleInput();
  }

  // Main handler for stdin/stdout communication
  handleInput() {
    console.error('[MCP Server] Setting up stdin/stdout handlers');

    // For MCP Inspector compatibility, use raw Buffer chunks for reliable binary handling
    process.stdin.setEncoding('utf8');

    // Use buffer for UTF-8 safe accumulation
    let buffer = '';

    process.stdin.on('data', chunk => {
      // Log chunk details with clear identifier
      console.error(`[MCP Server] Received chunk of ${chunk.length} bytes`);
      if (process.env.DEBUG) {
        console.error(
          `[MCP Server] Chunk preview: ${chunk.substring(0, Math.min(50, chunk.length))}`
        );
      }

      // Append the chunk to our buffer
      buffer += chunk;

      try {
        // Look for complete JSON-RPC messages
        const messages = this.extractMessages(buffer);

        if (messages.extracted.length > 0) {
          // Update buffer and process messages
          buffer = messages.remainingBuffer;
          console.error(
            `[MCP Server] Processing ${messages.extracted.length} message(s), ${buffer.length} bytes remaining in buffer`
          );

          for (const message of messages.extracted) {
            this.processMessage(message);
          }
        }
      } catch (error) {
        // Log properly and recover
        console.error(`[MCP Server] Error processing input: ${error.message}`);
        console.error(`[MCP Server] Stack trace: ${error.stack}`);
        this.sendLogMessage('error', { message: 'Error processing input', error: error.message });
        this.sendErrorResponse(null, `Error processing request: ${error.message}`);

        // Attempt to recover by clearing buffer if it's growing too large
        if (buffer.length > 10000) {
          console.error('[MCP Server] Buffer too large, clearing for recovery');
          buffer = '';
        }
      }
    });

    // Handle stdin closing
    process.stdin.on('end', () => {
      console.error('[MCP Server] stdin stream ended, shutting down');
      this.sendLogMessage('info', 'Server shutting down due to stdin close');

      // Don't exit the process, just log the event
      console.error('[MCP Server] Not exiting process despite stdin close');
    });

    // Handle errors
    process.stdin.on('error', error => {
      console.error(`[MCP Server] stdin error: ${error.message}`);
      this.sendLogMessage('error', { message: 'stdin error', error: error.message });

      // Don't exit the process, just log the error
      console.error('[MCP Server] Not exiting process despite stdin error');
    });
  }

  // Extract complete JSON messages from buffer
  extractMessages(buffer) {
    console.error(`[MCP Server] Processing buffer of length: ${buffer.length}`);
    if (buffer.length > 0) {
      console.error(
        `[MCP Server] Buffer preview: ${buffer.substring(0, Math.min(50, buffer.length))}`
      );
    }

    const extracted = [];
    let startIdx = 0;

    // First, try to parse as direct JSON if it looks like JSON
    if (buffer.startsWith('{') && buffer.includes('"method"')) {
      try {
        // Try to parse the entire buffer as a single JSON message
        const message = JSON.parse(buffer);
        console.error('[MCP Server] Successfully parsed direct JSON message');
        extracted.push(message);
        return {
          extracted,
          remainingBuffer: '',
        };
      } catch (error) {
        console.error(`[MCP Server] Failed to parse direct JSON: ${error.message}`);
        // Continue with header-based parsing
      }
    }

    while (startIdx < buffer.length) {
      // Look for Content-Length header with multiple possible formats
      // 1. Standard format with \r\n\r\n
      // 2. Alternative format with just \n\n
      // 3. Single line format with just \n
      let headerMatch = buffer.slice(startIdx).match(/Content-Length:\s*(\d+)\r\n\r\n/);

      if (!headerMatch) {
        headerMatch = buffer.slice(startIdx).match(/Content-Length:\s*(\d+)\n\n/);
      }

      if (!headerMatch) {
        headerMatch = buffer.slice(startIdx).match(/Content-Length:\s*(\d+)\n/);
      }

      if (!headerMatch) {
        // No complete header found, wait for more data
        console.error('[MCP Server] No complete Content-Length header found in buffer');

        // If the buffer looks like it might be a direct JSON message, try to parse it
        if (buffer.startsWith('{') && buffer.endsWith('}')) {
          try {
            const message = JSON.parse(buffer);
            console.error('[MCP Server] Successfully parsed direct JSON message');
            extracted.push(message);
            return {
              extracted,
              remainingBuffer: '',
            };
          } catch (error) {
            console.error(`[MCP Server] Failed to parse as direct JSON: ${error.message}`);
          }
        }

        break;
      }

      // Calculate where header ends and content begins
      const headerMatchLength = headerMatch[0].length;
      const headerMatchStart = startIdx + headerMatch.index;
      const contentStart = headerMatchStart + headerMatchLength;

      // Parse the content length
      const contentLength = parseInt(headerMatch[1], 10);
      console.error(`[MCP Server] Found header: Content-Length: ${contentLength}`);

      // Check if we have the complete content
      if (buffer.length < contentStart + contentLength) {
        console.error(
          `[MCP Server] Incomplete message: have ${buffer.length - contentStart} of ${contentLength} bytes`
        );
        break;
      }

      // Extract and parse the JSON content
      const jsonContent = buffer.slice(contentStart, contentStart + contentLength);

      try {
        // Make sure we parse the content as a complete block
        const jsonStr = jsonContent.toString('utf8');
        const message = JSON.parse(jsonStr);
        extracted.push(message);
        console.error('[MCP Server] Successfully parsed message');
      } catch (error) {
        console.error(`[MCP Server] Failed to parse JSON message: ${error.message}`);
        console.error(`[MCP Server] Problematic content: ${jsonContent.substring(0, 100)}`);
      }

      // Move past this message
      startIdx = contentStart + contentLength;
    }

    return {
      extracted,
      remainingBuffer: buffer.slice(startIdx),
    };
  }

  // Process an incoming message
  processMessage(message) {
    // Ensure all logging goes to stderr only
    console.error(`[MCP Server] Received message: ${JSON.stringify(message)}`);

    if (message.method === 'initialize') {
      console.error('[MCP Server] Handling initialize message...');
      this.handleInitialize(message);
      console.error('[MCP Server] Initialize handler completed');
    } else if (this.initialized && message.method === 'executeFunction') {
      console.error('[MCP Server] Handling executeFunction message...');
      this.handleExecuteFunction(message);
    } else {
      console.error(`[MCP Server] Unknown method: ${message.method}`);
      this.sendErrorResponse(message.id, `Unknown or unsupported method: ${message.method}`);
    }
  }

  // Handle initialize method
  handleInitialize(message) {
    this.initialized = true;

    const capabilities = {
      functions: [
        {
          name: 'krep',
          description: 'Unified function for pattern searching in files or strings',
          parameters: {
            type: 'object',
            properties: {
              pattern: {
                type: 'string',
                description: 'Pattern to search for',
              },
              target: {
                type: 'string',
                description: 'File path or string to search in',
              },
              mode: {
                type: 'string',
                description: 'Search mode: "file" (default), "string", or "count"',
                enum: ['file', 'string', 'count'],
              },
              caseSensitive: {
                type: 'boolean',
                description: 'Case-sensitive search (default: true)',
              },
              threads: {
                type: 'integer',
                description: `Number of threads to use (default: auto-detected based on CPU cores, currently ${getOptimalThreadCount()})`,
              },
            },
            required: ['pattern', 'target'],
          },
        },
      ],
    };

    this.sendResponse(message.id, { capabilities });
  }

  // Handle executeFunction method
  handleExecuteFunction(message) {
    const { function: functionName, parameters } = message.params;

    if (!this.functions[functionName]) {
      return this.sendErrorResponse(message.id, `Function not found: ${functionName}`);
    }

    try {
      this.functions[functionName](parameters, message.id);
    } catch (error) {
      this.sendErrorResponse(message.id, `Error executing function: ${error.message}`);
    }
  }

  // Unified krep function
  krepFunction(params, id) {
    const { pattern, target, mode = 'file', caseSensitive = true } = params;
    const threads = params.threads !== undefined ? params.threads : getOptimalThreadCount();

    console.error(
      `[MCP Server] krep called with pattern: ${pattern}, target: ${target}, mode: ${mode}`
    );

    if (!pattern || !target) {
      console.error('[MCP Server] Missing required parameters');
      return this.sendErrorResponse(id, 'Missing required parameters: pattern and target');
    }

    // Build command based on mode
    const caseFlag = caseSensitive ? '' : '-i';
    const threadFlag = `-t ${threads}`;
    let command = '';

    if (mode === 'string') {
      // String search mode
      command = `${KREP_PATH} ${caseFlag} ${threadFlag} -s "${pattern}" "${target}"`;
    } else if (mode === 'count') {
      // Count mode
      command = `${KREP_PATH} ${caseFlag} ${threadFlag} -c "${pattern}" "${target}"`;
    } else {
      // Default file search mode
      command = `${KREP_PATH} ${caseFlag} ${threadFlag} "${pattern}" "${target}"`;
    }

    console.error(`[MCP Server] Executing command: ${command}`);

    // Return a mock response for testing mode
    if (process.env.KREP_TEST_MODE) {
      console.error('[MCP Server] In test mode, returning mock response');
      this.sendResponse(id, {
        pattern,
        target,
        mode,
        results: `Found 5 matches for "${pattern}" in ${target}`,
        performance: {
          matchCount: 5,
          searchTime: 0.001,
          searchSpeed: 100,
          algorithmUsed: this.getAlgorithmInfo(pattern),
          threads,
          caseSensitive,
        },
        success: true,
      });
      return;
    }
        
    // Handle the case where the krep binary doesn't exist
    if (!fs.existsSync(KREP_PATH) && !process.env.KREP_SKIP_CHECK) {
      console.error(`[MCP Server] krep binary not found at ${KREP_PATH}`);

      return this.sendErrorResponse(id, `krep binary not found at ${KREP_PATH}`);
    }

    exec(command, { maxBuffer: 1024 * 1024 * 10 }, (error, stdout, stderr) => {
      if (error) {
        console.error(`[MCP Server] Error executing krep: ${error.message}`);
        console.error(`[MCP Server] stderr: ${stderr}`);

        // For file not found or permission errors, still return a valid response
        if (
          error.message.includes('No such file') ||
          error.message.includes('Permission denied') ||
          error.message.includes('not found') ||
          error.message.includes('cannot access')
        ) {
          console.error('[MCP Server] Handling file access error gracefully');
          this.sendResponse(id, {
            pattern,
            target,
            mode,
            results: `No matches found (${error.message})`,
            performance: {
              matchCount: 0,
              searchTime: 0,
              searchSpeed: 0,
              algorithmUsed: this.getAlgorithmInfo(pattern),
              threads,
              caseSensitive,
            },
            success: true,
          });
          return;
        }

        return this.sendErrorResponse(id, error.message, stderr);
      }

      console.error(`[MCP Server] krep executed successfully, stdout length: ${stdout.length}`);

      // Extract performance metrics from output
      const matchCountMatch = stdout.match(/Found (\d+) matches/);
      const timeMatch = stdout.match(/Search completed in ([\d.]+) seconds/);
      const speedMatch = stdout.match(/([\d.]+) MB\/s/);
      const algorithmMatch = stdout.match(/Using ([^\\n]+) algorithm/);

      const matchCount = matchCountMatch ? parseInt(matchCountMatch[1]) : 0;
      const searchTime = timeMatch ? parseFloat(timeMatch[1]) : null;
      const searchSpeed = speedMatch ? parseFloat(speedMatch[1]) : null;
      const algorithmUsed = algorithmMatch
        ? algorithmMatch[1].trim()
        : this.getAlgorithmInfo(pattern);

      // Build response based on mode
      const response = {
        pattern,
        target,
        mode,
        results: stdout,
        performance: {
          matchCount,
          searchTime,
          searchSpeed,
          algorithmUsed,
          threads,
          caseSensitive,
        },
        success: true,
      };

      this.sendResponse(id, response);
    });
  }

  // Get algorithm info based on pattern
  getAlgorithmInfo(pattern) {
    const patternLen = pattern.length;

    if (patternLen < 3) {
      return 'KMP (Knuth-Morris-Pratt) - Optimized for very short patterns';
    } else if (patternLen > 16) {
      return 'Rabin-Karp - Efficient for longer patterns with better hash distribution';
    }
    // Check if we're likely on a platform with SIMD support
    const isAppleSilicon = process.platform === 'darwin' && process.arch === 'arm64';
    const isModernX64 = process.platform !== 'darwin' && process.arch === 'x64';

    if (isAppleSilicon) {
      return 'NEON SIMD - Hardware-accelerated search on Apple Silicon';
    } else if (isModernX64) {
      return 'SSE4.2/AVX2 - Hardware-accelerated search with vector instructions';
    }
    return 'Boyer-Moore-Horspool - Efficient general-purpose string search';
  }

  // Send a JSON-RPC response
  sendResponse(id, result) {
    console.error('Sending response for id:', id);
    const response = {
      jsonrpc: '2.0',
      id,
      result,
    };

    this.sendMessage(response);
  }

  // Send a JSON-RPC error response
  sendErrorResponse(id, message, data = null) {
    console.error('Sending error response for id:', id, 'Message:', message);
    const response = {
      jsonrpc: '2.0',
      id,
      error: {
        code: -32000,
        message,
        data,
      },
    };

    this.sendMessage(response);
  }

  // Send a message following the JSON-RPC over stdin/stdout protocol
  sendMessage(message) {
    try {
      // Use Buffer to ensure proper UTF-8 encoding for all characters (including emoji)
      const jsonMessage = JSON.stringify(message);
      const messageBuffer = Buffer.from(jsonMessage, 'utf8');
      const contentLength = messageBuffer.length;

      // Exactly Content-Length: N\r\n\r\n with no extra spaces
      const header = `Content-Length: ${contentLength}\r\n\r\n`;

      // Only log the header info to stderr, not stdout
      console.error(`[MCP Server] Sending response with length: ${contentLength}`);
      if (process.env.DEBUG) {
        console.error(
          `[MCP Server] Response preview: ${jsonMessage.substring(0, Math.min(100, jsonMessage.length))}`
        );
      }

      // Write the header and content separately to avoid Buffer.concat issues
      process.stdout.write(header);
      process.stdout.write(jsonMessage);

      // Flush stdout to ensure the message is sent immediately
      if (typeof process.stdout.flush === 'function') {
        process.stdout.flush();
      }
    } catch (error) {
      console.error(`[MCP Server] Error sending message: ${error.message}`);
      console.error(`[MCP Server] Stack trace: ${error.stack}`);
    }
  }

  // Send a log message notification to the client
  sendLogMessage(level, data) {
    const message = {
      jsonrpc: '2.0',
      method: 'log',
      params: {
        level: level || 'info',
        data: data || {},
      },
    };

    this.sendMessage(message);
    console.error(
      `[MCP Server] Log message sent (${level}): ${typeof data === 'string' ? data : JSON.stringify(data)}`
    );
  }
}

// Start the server if this file is executed directly
if (require.main === module) {
  new KrepMcpServer();
}

module.exports = KrepMcpServer;
