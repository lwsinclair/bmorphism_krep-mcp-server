/**
 * Mock server for testing SDK integration
 * 
 * This file provides a mock implementation of the krep-mcp-server API
 * to allow SDK integration tests to run without needing a real server.
 */

const http = require('http');

// Default port for the mock server
const PORT = 3000;

// Sample responses for different endpoints
const mockResponses = {
  search: {
    success: true,
    pattern: 'test',
    path: '/path/to/file',
    results: 'Found 5 matches\nSearch completed in 0.01 seconds',
    performance: {
      matchCount: 5,
      searchTime: 0.01,
      searchSpeed: 123.45,
      algorithmUsed: 'Boyer-Moore-Horspool',
      threads: 4,
      caseSensitive: true
    }
  },
  
  match: {
    success: true,
    pattern: 'test',
    text: 'This is a test string',
    results: 'Found 1 match\nSearch completed in 0.001 seconds',
    performance: {
      matchCount: 1,
      searchTime: 0.001,
      algorithmUsed: 'Boyer-Moore-Horspool',
      threads: 4,
      caseSensitive: true
    }
  },
  
  error: {
    error: 'An error occurred',
    details: 'Mock error for testing'
  },
  
  performance: {
    algorithms: {
      kmp: {
        name: 'Knuth-Morris-Pratt (KMP)',
        bestFor: 'Very short patterns (< 3 characters)'
      },
      boyerMoore: {
        name: 'Boyer-Moore-Horspool',
        bestFor: 'Medium-length patterns (3-16 characters)'
      },
      rabinKarp: {
        name: 'Rabin-Karp',
        bestFor: 'Longer patterns (> 16 characters)'
      }
    },
    optimizations: {
      memoryMapped: {
        description: 'Uses memory-mapped I/O for file access'
      },
      multiThreaded: {
        description: 'Parallel search using multiple threads'
      }
    }
  },
  
  algorithmSelection: {
    selectionCriteria: {
      patternLength: {
        short: {
          range: '1-2 characters',
          algorithm: 'KMP'
        },
        medium: {
          range: '3-16 characters',
          algorithm: 'Boyer-Moore-Horspool'
        },
        long: {
          range: '> 16 characters',
          algorithm: 'Rabin-Karp'
        }
      }
    }
  }
};

// Create the server
const server = http.createServer((req, res) => {
  // Parse URL and method
  const url = req.url;
  const method = req.method;
  
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle preflight requests
  if (method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }
  
  // Set content type
  res.setHeader('Content-Type', 'application/json');
  
  // Parse URL to determine response
  if (url === '/search' && method === 'POST') {
    res.statusCode = 200;
    res.end(JSON.stringify(mockResponses.search));
  } 
  else if (url === '/match' && method === 'POST') {
    res.statusCode = 200;
    res.end(JSON.stringify(mockResponses.match));
  }
  else if (url.startsWith('/mcp/search/')) {
    res.statusCode = 200;
    res.end(JSON.stringify(mockResponses.search));
  }
  else if (url.startsWith('/mcp/match/')) {
    res.statusCode = 200;
    res.end(JSON.stringify(mockResponses.match));
  }
  else if (url === '/performance' && method === 'GET') {
    res.statusCode = 200;
    res.end(JSON.stringify(mockResponses.performance));
  }
  else if (url === '/algorithm-selection' && method === 'GET') {
    res.statusCode = 200;
    res.end(JSON.stringify(mockResponses.algorithmSelection));
  }
  else if (url === '/error') {
    res.statusCode = 400;
    res.end(JSON.stringify(mockResponses.error));
  }
  else {
    // Default response for root path
    if (url === '/') {
      res.statusCode = 200;
      res.end(JSON.stringify({
        name: 'krep-mcp-server-mock',
        version: '0.1.0-mock',
        description: 'Mock server for testing'
      }));
    } else {
      // Not found
      res.statusCode = 404;
      res.end(JSON.stringify({ error: 'Not found' }));
    }
  }
});

// Start server function
function startServer(port = PORT) {
  return new Promise((resolve, reject) => {
    try {
      server.listen(port, () => {
        console.log(`Mock server running on port ${port}`);
        resolve(server);
      });
    } catch (err) {
      reject(err);
    }
  });
}

// Stop server function
function stopServer() {
  return new Promise((resolve, reject) => {
    try {
      server.close(() => {
        console.log('Mock server stopped');
        resolve();
      });
    } catch (err) {
      reject(err);
    }
  });
}

// Export functions for testing
module.exports = {
  startServer,
  stopServer,
  mockResponses
};

// If this file is executed directly, start the server
if (require.main === module) {
  startServer().catch(console.error);
}