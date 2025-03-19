# Thread Optimization in krep-mcp-server

## Overview

This document summarizes the thread optimization improvements made to the krep-mcp-server to maximize CPU utilization and improve search performance.

## Changes Implemented

1. **Dynamic CPU Core Detection**
   - Added functionality to automatically detect the number of available CPU cores using `os.cpus().length`
   - Implemented in both `mcp_server.js` and `index.js`

2. **Optimal Thread Allocation**
   - Created `getOptimalThreadCount()` function that returns the number of available CPU cores
   - This function can be easily modified in the future to implement different thread optimization strategies (e.g., leaving one core free for the OS)

3. **Thread Parameter Handling**
   - Updated all endpoints and functions to use dynamically detected thread count when not explicitly specified
   - Maintained backward compatibility by allowing explicit thread count override

4. **Updated Documentation**
   - Updated the thread parameter description to reflect the automatic detection
   - Added information about the thread optimization in README.md
   - Added a note about the current core count in the capabilities description

## Key Implementation Details

The core implementation is based on the `os.cpus().length` method from Node.js, which returns the number of logical CPU cores available on the system. 

```javascript
function getOptimalThreadCount() {
  // Get the number of CPU cores available
  const cpuCount = os.cpus().length;
  
  // Use all available cores (can be adjusted as needed)
  // Some strategies use cpuCount - 1 to leave a core for the OS
  return cpuCount;
}
```

This function is called when no thread count is explicitly provided in the request parameters, ensuring that the krep utility maximizes available CPU resources by default.

## Usage

With this optimization, users don't need to manually specify the thread count. The server will automatically use all available CPU cores for maximum performance. 

However, users can still override this behavior by explicitly setting the `threads` parameter if they need to control resource usage for specific use cases.

Example usage with automatic thread detection:
```json
{
  "pattern": "search pattern",
  "target": "file path or string to search",
  "mode": "file"
}
```

Example usage with explicit thread count:
```json
{
  "pattern": "search pattern",
  "target": "file path or string to search",
  "mode": "file",
  "threads": 2
}
```

## Performance Implications

This optimization should significantly improve search performance on high-core-count systems where the default of 4 threads was underutilizing available CPU resources. For large file searches, this can result in proportionally faster search times.

Note that on systems with very high core counts (e.g., server-grade CPUs with 32+ cores), there might be diminishing returns beyond a certain point due to I/O bottlenecks. Future optimizations could implement more sophisticated logic that considers the file size and I/O characteristics when determining the optimal thread count.