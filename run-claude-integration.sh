#!/bin/bash
# run-claude-integration.sh - Helper script for running the MCP server with Claude Desktop
# 
# Usage:
#   ./run-claude-integration.sh [krep_path]
#
# If krep_path is provided, it will set KREP_PATH to that value.
# Otherwise, it will try to find krep in standard locations.

set -e

# Determine script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
cd "$SCRIPT_DIR"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "Error: Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# Set KREP_PATH if provided as argument
if [ $# -eq 1 ]; then
    export KREP_PATH="$1"
    echo "Using provided krep path: $KREP_PATH"
fi

# Set environment variables for Claude Desktop integration
export CLAUDE_MCP=true
export DEBUG=true

echo "Starting krep-mcp-server for Claude Desktop integration..."
echo "Press Ctrl+C to stop the server"

# Run the server
node src/index.js

# This should not be reached unless the server exits on its own
echo "Server has stopped."