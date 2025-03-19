# MCP Protocol Compliance Guidelines

This document provides guidelines for ensuring proper compliance with the Model Context Protocol (MCP) when implemented in JavaScript-based tools. These guidelines are based on lessons learned while fixing compatibility issues between the `krep-mcp-server` and Claude Desktop/MCP Inspector.

## Common Issues and Solutions

### 1. JSON-RPC Message Formatting

The MCP protocol requires strict adherence to the JSON-RPC message format:

- **Content-Length Header**: Must be in the exact format `Content-Length: N\r\n\r\n` with precisely two carriage return + newline sequences.
- **No Extra Spaces**: There should be no extraneous spaces or characters in the header.
- **Buffer Handling**: Be careful with encodings - always use Buffer.from/toString with 'utf8' explicitly specified.

Solution:
```javascript
// Use this exact format for the header
const header = `Content-Length: ${contentLength}\r\n\r\n`;

// Use Buffer for proper encoding
const jsonMessage = JSON.stringify(message);
const messageBuffer = Buffer.from(jsonMessage, 'utf8');
const contentLength = messageBuffer.length;

// Write separately instead of using Buffer.concat to avoid issues
process.stdout.write(header);
process.stdout.write(jsonMessage);
```

### 2. Output Redirection

A critical requirement for MCP servers is to keep the stdout channel clean for JSON-RPC messages only:

- **Debug Logs**: All debug/log output MUST go to stderr, not stdout.
- **Startup Messages**: Even initial startup logs must use console.error().

Solution:
```javascript
// Instead of this (WRONG)
console.log('Server starting...');  

// Use this (CORRECT)
console.error('Server starting...');

// For detailed logs, use a consistent format
console.error(`[MCP Server] ${message}`);
```

### 3. Buffer Management

Buffer handling is crucial for correct protocol implementation:

- **Chunk Accumulation**: When processing binary data, handle chunk accumulation carefully.
- **Character Encoding**: Always explicitly specify UTF-8 encoding.
- **Buffer Type Checking**: When using Buffer.concat, ensure all chunks are Buffer instances, not strings.

Solution:
```javascript
// Make sure each chunk is a buffer
const bufferChunks = chunks.map(c => typeof c === 'string' ? Buffer.from(c, 'utf8') : c);
const buffer = Buffer.concat(bufferChunks, totalLength).toString('utf8');
```

### 4. Error Recovery

Robust error handling prevents protocol desynchronization:

- **Partial Message Recovery**: Implement logic to recover when incomplete messages are received.
- **Buffer Clearing**: Include a recovery mechanism to clear the buffer if it grows too large.
- **Error Logging**: Send detailed error messages to stderr, not stdout.

Solution:
```javascript
try {
  // Message processing code
} catch (error) {
  console.error(`[MCP Server] Error processing input: ${error.message}`);
  console.error(`[MCP Server] Stack trace: ${error.stack}`);
  
  // Send error message following the protocol
  this.sendErrorResponse(null, `Error processing request: ${error.message}`);
  
  // Recovery logic
  if (totalLength > 10000) {
    console.error('[MCP Server] Buffer too large, clearing for recovery');
    chunks = [];
    totalLength = 0;
  }
}
```

### 5. Message Parsing

Accurate message parsing is essential:

- **Header Format**: Strictly match the header pattern with `\r\n\r\n`.
- **Content Length**: Ensure the content length calculation is accurate, especially with Unicode characters.
- **String Conversion**: Convert binary buffers to strings explicitly with UTF-8 encoding.

Solution:
```javascript
// Look for Content-Length header with exact pattern 
// For MCP Inspector compatibility, strictly require \r\n\r\n
const headerMatch = buffer.slice(startIdx).match(/Content-Length:\s*(\d+)\r\n\r\n/);

if (!headerMatch) {
  // No complete header found, wait for more data
  console.error('[MCP Server] No complete Content-Length header found in buffer');
  break;
}

// Calculate where header ends and content begins
const headerMatchLength = headerMatch[0].length;
const headerMatchStart = startIdx + headerMatch.index;
const contentStart = headerMatchStart + headerMatchLength;

// Parse the content length
const contentLength = parseInt(headerMatch[1], 10);
```

## Testing MCP Compliance

### Testing with MCP Inspector

To verify compatibility with MCP Inspector:

1. Create a test script that simulates MCP Inspector's protocol handling
2. Test with the exact message format used by MCP Inspector
3. Verify initialization, function execution, and error handling

### Testing with Claude Desktop

For Claude Desktop compatibility:

1. Set the `CLAUDE_MCP` environment variable to true
2. Simulate the initialization and function execution sequence
3. Verify handling of Unicode characters and binary data
4. Check that error recovery works properly

## Reference Implementation

A fully compliant MCP server should:

1. Use stderr for all logging and debugging
2. Strictly adhere to the JSON-RPC message format
3. Properly handle UTF-8 and binary data 
4. Implement robust error recovery mechanisms
5. Include tests for both MCP Inspector and Claude Desktop

---

By following these guidelines, MCP servers can ensure reliable operation with both Claude Desktop and debugging tools like MCP Inspector.