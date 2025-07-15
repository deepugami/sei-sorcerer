#!/bin/bash
echo "🏢 Starting Official Sei MCP Server..."
echo "Port: 3001"
echo "Network: pacific-1"
echo "Press Ctrl+C to stop"
echo "=========================="

# Set environment variables
export NETWORK=pacific-1
export RPC_URL=https://evm-rpc.sei-apis.com
export CHAIN_ID=1329
export MCP_SERVER_PORT=3001
export LOG_LEVEL=info
export ENABLE_RATE_LIMITING=true
export MAX_REQUESTS_PER_MINUTE=60

# Start the server
bun run src/index.ts 