# Krep MCP Server

A high-performance string search utility with MCP (Model Context Protocol) integration for the infinity-topos environment. This is a wrapper around [krep](https://github.com/barton-willis/krep-native), an ultra-fast pattern matching utility that significantly outperforms traditional tools like grep.

```
                   THE KREP-MCP-SERVER ABSURDITY DIAGRAM
                   ====================================
                             
          +-----------------------------------------------------+
          |                                                     |
          |                The KREP MCP Redundancy Zone         |
          |                                                     |
          +-----^--------------------+------------------------+-+
                |                    |                        |
    +-----------+----------+  +------+-------------+  +------+-------+
    |                      |  |                    |  |              |
    |    M E T A D A T A   |  |  F U N C T I O N   |  |  B I N A R Y |
    |    E X P L O S I O N  |  |  N A M E   C H A O S|  |  H U N T    |
    |                      |  |                    |  |              |
    +-----+----------+-----+  +---+-----------+----+  +------+-------+
          |          |            |           |              |
          v          v            v           v              v
 +--------+--+  +----+-----+  +---+----+  +---+-----+  +----+------+
 |           |  |          |  |        |  |         |  |           |
 | "Unified" |  | 37 Paths |  | krep   |  |krepSearch|  |  5 Error |
 | Function  |  | To Find  |  |        |  |krepMatch |  | Handlers |
 | That Does |  | The Same |  |        |  |krepCount |  |   For    |
 | 3 Things  |  | Binary   |  |        |  |          |  | 1 Error  |
 |           |  |          |  |        |  |          |  |           |
 +-----------+  +----------+  +--------+  +----------+  +-----------+
                                                  
          +-----------------------------------------------------+
          |                                                     |
          |         Configuration & Shell Script Hell           |
          |                                                     |
          +-----^--------------------+------------------------+-+
                |                    |                        |
    +-----------+----------+  +------+-------------+  +------+-------+
    |                      |  |                    |  |              |
    |    3 Scripts to      |  |  Integer           |  | Test Mode   |
    |    Install 1 Thing   |  |  Arithmetic in     |  | that Mocks  |
    |                      |  |  Shell that says   |  | Success When|
    |                      |  |  0 + 0 = Syntax    |  | Everything  |
    |                      |  |  Error             |  | Fails       |
    +----------------------+  +--------------------+  +--------------+

               "It's not redundant if it's resilient!"
                         - MCP Engineer, probably
```

## Overview

Krep MCP Server provides a unified interface to the krep binary, a high-performance string search utility similar to grep but with optimized algorithms and multi-threading capabilities. It exposes krep's functionality through the Model Context Protocol, allowing AI assistants to perform efficient pattern searching in files and strings.

## Features

- **High-Performance Search**: Uses optimized algorithms (KMP, Boyer-Moore-Horspool, Rabin-Karp) selected based on pattern length
- **Hardware Acceleration**: Leverages SIMD instructions (SSE4.2/AVX2 on x86/x64, NEON on ARM) when available
- **Optimized Multi-Threading**: Automatically uses all available CPU cores for maximum parallel search performance
- **Unified Interface**: Single function with multiple modes (file search, string search, count-only)
- **MCP Integration**: Seamless integration with AI assistants through the Model Context Protocol

## Why This Codebase Is Tragic

This codebase demonstrates how a simple tool (a wrapper for a string search utility) became bloated with unnecessary complexity:

1. **Simple Core, Complex Implementation**: The actual functionality is straightforward but buried under layers of over-engineering

2. **Documentation Overload**: 15 documentation files for a tool that could be explained in a single well-structured README

3. **Integration Madness**: 3 separate integration systems (Cline, Claude Desktop, SDK), each with redundant scripts and documentation

4. **Installation Script Proliferation**: 7 installation scripts when one configurable script would suffice

5. **Error Handling Duplication**: Error handling duplicated at multiple levels rather than having a unified approach

6. **Test Fragmentation**: Test files scattered across the codebase rather than being organized systematically

7. **Configuration Redundancy**: Configuration files and environment variables duplicated across multiple components

8. **Binary Path Overkill**: Searches 37 different paths for a single binary that should be in one predictable location

**What It Should Have Been:**
```
┌──────────────────────┐
│    krep-mcp-server   │
│  ┌────────────────┐  │
│  │  index.js      │  │
│  │  - one function│  │
│  └────────────────┘  │
│  ┌────────────────┐  │
│  │  README.md     │  │
│  │  - clear docs  │  │
│  └────────────────┘  │
│  ┌────────────────┐  │
│  │  install.sh    │  │
│  │  - one script  │  │
│  └────────────────┘  │
└──────────────────────┘
```

## Project Structure

Here's the actual project structure:

```
krep-mcp-server/
├── CLINE_README.md
├── CLINE_SETUP.md
├── CLAUDE_DESKTOP_INTEGRATION.md
├── CLAUDE_DESKTOP_README.md
├── EXAMPLES.md
├── IMPLEMENTATION_SUMMARY.md
├── INSTALL_NOW.md
├── LIFECYCLE_DESIGN.md
├── MCP_COMPLIANCE.md
├── MCP_URIS.md
├── README.md
├── SETUP_CLAUDE_DESKTOP.md
├── TESTING_STRATEGY.md
├── THREAD_OPTIMIZATION.md
├── analysis/
│   └── index.tree.json
├── auto-install-claude.sh
├── cline-config.js
├── direct-install.sh
├── eslint.config.js
├── fix-claude-desktop.sh
├── go-integration/
│   ├── example/
│   └── krep.go
├── install-claude-desktop.sh
├── install-cline-integration.sh
├── install-sdk-integrations.sh
├── jest.config.js
├── just-krep.sh
├── mcp-config.json
├── package-lock.json
├── package.json
├── python-integration/
│   └── krep_mcp_client.py
├── run-claude-desktop.sh
├── run-claude-integration.sh
├── run-cline-mcp-server.sh
├── run-cline-test.sh
├── run-tests.sh
├── run.sh
├── sdk-integration.js
├── src/
│   ├── index.js
│   ├── index.min.js
│   ├── mcp_server.js
│   └── mcp_server.min.js
├── Support/
│   └── Claude/
├── test/
│   ├── benchmark.js
│   ├── fixtures/
│   ├── integration/
│   ├── mcp_benchmark.js
│   ├── mock-server.js
│   ├── unit/
│   └── utils.js
└── various test scripts...
```

## Installation

1. Ensure you have the krep binary installed:
   ```
   cd /path/to/krep-native
   make
   ```

2. Configure the MCP server in your MCP settings file:
   ```json
   {
     "mcpServers": {
       "krep": {
         "command": "node",
         "args": [
           "/path/to/krep-mcp-server/src/index.js"
         ],
         "env": {
           "CLAUDE_MCP": "true",
           "KREP_PATH": "/path/to/krep-native/krep",
           "DEBUG": "true"
         },
         "description": "High-performance string search utility with unified interface",
         "disabled": false,
         "autoApprove": [
           "krep"
         ]
       }
     }
   }
   ```

## Usage

The krep MCP server exposes a single unified function:

```
<use_mcp_tool>
<server_name>krep</server_name>
<tool_name>krep</tool_name>
<arguments>
{
  "pattern": "search pattern",
  "target": "file path or string to search",
  "mode": "file|string|count",
  "caseSensitive": true|false,
  "threads": null // Automatically uses all CPU cores if not specified
}
</arguments>
</use_mcp_tool>
```

### Parameters

- **pattern** (required): The pattern to search for
- **target** (required): File path or string to search in
- **mode** (optional): Search mode
  - `file` (default): Search in a file
  - `string`: Search in a string
  - `count`: Count occurrences only
- **caseSensitive** (optional): Whether the search is case-sensitive (default: true)
- **threads** (optional): Number of threads to use (default: auto-detected based on CPU cores)

### Examples

See [examples.md](./examples.md) for detailed usage examples and patterns.

## How It Works

The krep MCP server works by:

1. Receiving requests through the Model Context Protocol
2. Parsing the request parameters
3. Building the appropriate krep command based on the mode and parameters
4. Executing the command using the krep binary
5. Parsing the results and returning them in a structured format

## Performance

Krep is designed for high-performance pattern searching:

- **Algorithm Selection**: Automatically selects the optimal algorithm based on pattern length
  - KMP (Knuth-Morris-Pratt) for very short patterns (< 3 characters)
  - Boyer-Moore-Horspool for medium-length patterns (3-16 characters)
  - Rabin-Karp for longer patterns (> 16 characters)
- **Hardware Acceleration**: Uses SIMD instructions when available
- **Dynamic Multi-Threading**: Automatically utilizes all available CPU cores for optimal parallel search performance

## Cline VSCode Extension Integration

The krep-mcp-server can be integrated with the Cline VSCode extension, allowing you to use high-performance string search capabilities directly in your VSCode environment.

### Installation with Cline

We provide an automatic installation script to set up the Cline integration:

```bash
# Install the integration
./install-cline-integration.sh

# Test the integration before installing
./run-cline-test.sh

# Uninstall the integration
./uninstall-cline-integration.sh
```

### Using krep in Cline

Once integrated, you can use krep directly in Cline conversations:

```
/krep krep pattern="function" target="/path/to/search" mode="file"
```

For detailed instructions and usage examples, see:
- [CLINE_SETUP.md](CLINE_SETUP.md) - Setup instructions
- [CLINE_README.md](CLINE_README.md) - Usage guide

## Integration with Infinity Topos

Krep MCP Server is designed to work seamlessly within the infinity-topos environment:

- **Babashka Integration**: Use Babashka to process search results
- **Say Integration**: Vocalize search results using the Say MCP server
- **Coin-Flip Integration**: Use randomization to determine search strategies

## Development

### Environment Variables

- `CLAUDE_MCP`: Set to "true" to run in MCP mode
- `KREP_PATH`: Path to the krep binary
- `DEBUG`: Set to "true" for verbose logging
- `KREP_TEST_MODE`: Set to "true" to run in test mode with mock responses
- `KREP_SKIP_CHECK`: Set to "true" to skip checking if the krep binary exists

### HTTP Server Mode

When not running in MCP mode, the server starts an HTTP server with the following endpoints:

- `GET /health`: Health check endpoint
- `GET /`: Server information
- `POST /search`: Search for patterns in files
- `POST /match`: Match patterns in strings
- `GET /performance`: Performance information
- `GET /algorithm-selection`: Algorithm selection guide

## License

MIT
