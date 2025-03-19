# Claude Desktop Integration Guide

This guide provides instructions for integrating the krep-mcp-server with Claude Desktop using the Model Context Protocol (MCP).

## Prerequisites

1. Claude Desktop installed
2. Node.js 14+ installed
3. krep binary installed (see installation instructions in README.md)

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourorg/krep-mcp-server.git
   cd krep-mcp-server
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Make sure the krep binary is available:
   - Either set the `KREP_PATH` environment variable to point to your krep binary
   - Or follow the installation instructions in README.md

## Testing the Integration

Before configuring Claude Desktop, it's a good idea to verify that the MCP server works correctly:

```bash
# Run the Claude Desktop integration test
node test-claude-desktop.js
```

You should see output indicating a successful test, with the server responding to initialize and function execution requests.

## Configuring Claude Desktop

1. Open Claude Desktop and go to Settings (gear icon in the bottom left)

2. Click on the "MCP" tab

3. Click "Add New MCP Server" and enter the following information:
   - **Name**: Krep String Search
   - **Description**: High-performance string search MCP server
   - **Command**: Provide the full path to the launch script:
     ```
     /usr/bin/env node /path/to/krep-mcp-server/src/index.js
     ```
   - **Environment Variables**:
     - `CLAUDE_MCP`: true
     - `DEBUG`: true (optional, for verbose logging)
     - `KREP_PATH`: /path/to/krep (if needed)

4. Click "Add Server"

## MCP URIs

The server supports the following MCP URI schemes:

### 1. Search Files

```
search://{path}?pattern={pattern}&case={true|false}&threads={n}&count={true|false}
```

Example:
```
search:///home/user/projects?pattern=function&case=true&threads=4
```

### 2. Match Text

```
match://{text}?pattern={pattern}&case={true|false}&threads={n}&count={true|false}
```

Example:
```
match://This is sample text with patterns?pattern=pattern&case=true&threads=2
```

## Using in Claude Desktop

Once configured, you can use the MCP server in Claude by:

1. Typing `/` in the input box to see available commands
2. Select the Krep String Search option
3. Enter the appropriate URI format with your search parameters

Examples:

- To search for "config" in your home directory:
  ```
  search:///home/user?pattern=config
  ```

- To match text:
  ```
  match://This is a test string, testing the pattern feature?pattern=test
  ```

## Troubleshooting

If you encounter issues:

1. Check the MCP server logs:
   - Look for stderr output from the server for error messages
   - Examine the logs at: `/Users/<username>/Library/Logs/Claude/mcp-server-krep.log`

2. Common issues:
   - **"Cannot find krep binary"**: Ensure the krep binary is installed and accessible, or set KREP_PATH
   - **"JSON-RPC protocol error"**: This usually means there's output going to stdout that isn't part of the protocol
   - **"Unicode/binary data errors"**: Check for issues with string/buffer handling

3. Run the test scripts:
   ```bash
   node test-claude-desktop.js
   node test-mcp-inspector.js
   ```

4. Verify protocol compliance by running:
   ```bash
   npm test -- -t "mcp.compliance"
   ```

## Advanced Configuration

### Performance Settings

You can adjust the performance of searches by setting:

- **Threads**: Set the `threads` parameter to control parallelism (default: 4)
- **Case sensitivity**: Use `case=false` to perform case-insensitive searches
- **Count-only**: Use `count=true` to only get match counts without details

### Environment Variables

Additional environment variables that can be used:

- `KREP_PATH`: Path to the krep binary
- `DEBUG`: Enable detailed logging (true/false)
- `KREP_SKIP_CHECK`: Skip checking for the krep binary (useful for testing)
- `KREP_TEST_MODE`: Run in test mode with consistent algorithm selection