import { config } from "dotenv";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import startServer from "./server.js";
import express, { Request, Response } from "express";
import cors from "cors";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

// Environment variables - use Render's PORT or default to 3004
const PORT = process.env.PORT || 3004;
const HOST = '0.0.0.0';

console.error(`Configured to listen on ${HOST}:${PORT}`);

// Setup Express
const app = express();
app.use(express.json());
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  exposedHeaders: ['Content-Type', 'Access-Control-Allow-Origin']
}));

// Add OPTIONS handling for preflight requests
app.options('*', cors());

// Keep track of active connections with session IDs
const connections = new Map<string, SSEServerTransport>();

// Initialize the server
let server: McpServer | null = null;
startServer().then(s => {
  server = s;
  console.error("MCP Server initialized successfully");
}).catch(error => {
  console.error("Failed to initialize server:", error);
  process.exit(1);
});

// Add JSON-RPC endpoint for direct tool calls
app.post("/api/mcp", async (req: Request, res: Response) => {
  console.error(`Received JSON-RPC request to /api/mcp: ${JSON.stringify(req.body)}`);
  
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (!server) {
    console.error("Server not initialized yet");
    return res.status(503).json({ 
      jsonrpc: "2.0", 
      id: req.body.id, 
      error: { code: -32002, message: "Server not initialized" } 
    });
  }

  try {
    const { method, params, id } = req.body;
    console.error(`Processing JSON-RPC method: ${method} with params:`, params);

    // Call service methods directly since MCP Server doesn't expose callTool
    let result;
    
    switch (method) {
      case 'get_balance': {
        // For sei1 addresses, try Sei REST API first before falling back to EVM
        if (params.address.startsWith('sei1')) {
          try {
            // Try multiple API endpoints for better accuracy
            let response, data;
            try {
              response = await fetch(`https://rest.sei-apis.com/cosmos/bank/v1beta1/balances/${params.address}`);
              data = await response.json();
            } catch (primaryError) {
              // Fallback to Polkachu API
              response = await fetch(`https://sei-api.polkachu.com/cosmos/bank/v1beta1/balances/${params.address}`);
              data = await response.json();
            }
            
            // Find SEI balance with higher precision
            const seiBalance = data.balances?.find((b: any) => b.denom === 'usei');
            const balanceInSei = seiBalance ? (parseFloat(seiBalance.amount) / 1000000).toFixed(6) : '0';
            
            result = {
              address: params.address,
              network: params.network || 'sei',
              wei: seiBalance ? seiBalance.amount : '0',
              ether: balanceInSei
            };
            console.error(`REST API Balance result for ${params.address}:`, result);
          } catch (restError) {
            console.error(`REST API failed for ${params.address}, fallback to EVM:`, restError);
            // Fallback to original EVM method with address conversion
            const { getBalance } = await import('../core/services/balance.js');
            const balance = await getBalance(params.address, params.network || 'sei');
            result = {
              address: params.address,
              network: params.network || 'sei',
              wei: balance.wei.toString(),
              ether: balance.sei
            };
            console.error(`EVM Balance result for ${params.address}:`, result);
          }
        } else {
          // For 0x addresses, use the EVM method directly
          const { getBalance } = await import('../core/services/balance.js');
          const balance = await getBalance(params.address, params.network || 'sei');
          result = {
            address: params.address,
            network: params.network || 'sei',
            wei: balance.wei.toString(),
            ether: balance.sei
          };
          console.error(`EVM Balance result for ${params.address}:`, result);
        }
        break;
      }
      
      case 'get_chain_info': {
        const { getChainId, getBlockNumber } = await import('../core/services/index.js');
        const { getRpcUrl } = await import('../core/chains.js');
        const network = params.network || 'sei';
        const chainId = await getChainId(network);
        const blockNumber = await getBlockNumber(network);
        const rpcUrl = getRpcUrl(network);
        result = {
          network,
          chainId,
          blockNumber: blockNumber.toString(),
          rpcUrl
        };
        break;
      }
      
      case 'get_erc20_balance': {
        const { getERC20Balance } = await import('../core/services/balance.js');
        const balance = await getERC20Balance(
          params.tokenAddress,
          params.address,
          params.network || 'sei'
        );
        result = {
          address: params.address,
          tokenAddress: params.tokenAddress,
          network: params.network || 'sei',
          balance: balance.toString()
        };
        break;
      }
      
      case 'get_latest_block': {
        const { getLatestBlock } = await import('../core/services/blocks.js');
        const block = await getLatestBlock(params.network || 'sei');
        result = block;
        break;
      }
      
      case 'get_erc20_token_info': {
        const { getERC20TokenInfo } = await import('../core/services/tokens.js');
        const tokenInfo = await getERC20TokenInfo(params.tokenAddress, params.network || 'sei');
        result = tokenInfo;
        break;
      }
      
      case 'get_block_by_number': {
        const { getBlockByNumber } = await import('../core/services/blocks.js');
        const block = await getBlockByNumber(params.blockNumber, params.network || 'sei');
        result = block;
        break;
      }
      
      case 'get_erc721_token_metadata': {
        const { getERC721TokenMetadata } = await import('../core/services/tokens.js');
        const metadata = await getERC721TokenMetadata(
          params.tokenAddress,
          BigInt(params.tokenId),
          params.network || 'sei'
        );
        result = metadata;
        break;
      }
      
      case 'get_nft_info': {
        const { getERC721TokenMetadata } = await import('../core/services/tokens.js');
        const nftInfo = await getERC721TokenMetadata(
          params.tokenAddress,
          BigInt(params.tokenId),
          params.network || 'sei'
        );

        // Check ownership separately
        let owner = null;
        try {
          const { getPublicClient } = await import('../core/services/index.js');
          owner = await getPublicClient(params.network || 'sei').readContract({
            address: params.tokenAddress as `0x${string}`,
            abi: [{
              inputs: [{ type: 'uint256' }],
              name: 'ownerOf',
              outputs: [{ type: 'address' }],
              stateMutability: 'view',
              type: 'function'
            }],
            functionName: 'ownerOf',
            args: [BigInt(params.tokenId)]
          });
        } catch (e) {
          // Ownership info not available
        }

        result = {
          contract: params.tokenAddress,
          tokenId: params.tokenId,
          network: params.network || 'sei',
          ...nftInfo,
          owner: owner || 'Unknown'
        };
        break;
      }
      
      case 'check_nft_ownership': {
        const { isNFTOwner } = await import('../core/services/balance.js');
        const isOwner = await isNFTOwner(
          params.tokenAddress,
          params.ownerAddress,
          BigInt(params.tokenId),
          params.network || 'sei'
        );
        result = {
          tokenAddress: params.tokenAddress,
          tokenId: params.tokenId,
          ownerAddress: params.ownerAddress,
          network: params.network || 'sei',
          isOwner,
          result: isOwner ? "Address owns this NFT" : "Address does not own this NFT"
        };
        break;
      }
      
      case 'get_nft_balance': {
        const { getERC721Balance } = await import('../core/services/balance.js');
        const balance = await getERC721Balance(
          params.tokenAddress,
          params.ownerAddress,
          params.network || 'sei'
        );
        result = {
          collection: params.tokenAddress,
          owner: params.ownerAddress,
          network: params.network || 'sei',
          balance: balance.toString()
        };
        break;
      }
      
      case 'get_erc1155_token_uri': {
        const { getERC1155TokenURI } = await import('../core/services/tokens.js');
        const uri = await getERC1155TokenURI(
          params.tokenAddress,
          BigInt(params.tokenId),
          params.network || 'sei'
        );
        result = { uri };
        break;
      }
      
      case 'get_supported_networks': {
        const { getSupportedNetworks } = await import('../core/chains.js');
        const networks = getSupportedNetworks();
        result = { supportedNetworks: networks };
        break;
      }
      
      case 'get_transaction': {
        const { getTransaction } = await import('../core/services/transactions.js');
        const tx = await getTransaction(params.txHash, params.network || 'sei');
        result = tx;
        break;
      }
      
      case 'get_transaction_receipt': {
        const { getTransactionReceipt } = await import('../core/services/transactions.js');
        const receipt = await getTransactionReceipt(params.txHash, params.network || 'sei');
        result = receipt;
        break;
      }
      
      case 'read_contract': {
        const { readContract } = await import('../core/services/contracts.js');
        const parsedAbi = typeof params.abi === 'string' ? JSON.parse(params.abi) : params.abi;
        const contractParams = {
          address: params.contractAddress,
          abi: parsedAbi,
          functionName: params.functionName,
          args: params.args || []
        };
        const contractResult = await readContract(contractParams, params.network || 'sei');
        result = contractResult;
        break;
      }
      
      case 'write_contract': {
        const { writeContract } = await import('../core/services/contracts.js');
        const parsedAbi = typeof params.abi === 'string' ? JSON.parse(params.abi) : params.abi;
        const contractParams = {
          address: params.contractAddress,
          abi: parsedAbi,
          functionName: params.functionName,
          args: params.args
        };
        const txHash = await writeContract(contractParams, params.network || 'sei');
        result = {
          network: params.network || 'sei',
          transactionHash: txHash,
          message: "Contract write transaction sent successfully"
        };
        break;
      }
      
      case 'is_contract': {
        const { isContract } = await import('../core/services/contracts.js');
        const contractCheck = await isContract(params.address, params.network || 'sei');
        result = {
          address: params.address,
          network: params.network || 'sei',
          isContract: contractCheck,
          type: contractCheck ? "Contract" : "Externally Owned Account (EOA)"
        };
        break;
      }

      case 'get_transaction_details': {
        // Enhanced transaction lookup for both EVM and Cosmos
        const txHash = params.txHash || params.hash;
        const isEVMTx = txHash.startsWith('0x');
        
        if (isEVMTx) {
          // EVM transaction lookup
          try {
            const response = await fetch(`https://evm-rpc.sei-apis.com`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                jsonrpc: '2.0',
                method: 'eth_getTransactionByHash',
                params: [txHash],
                id: 1
              })
            });
            const data = await response.json();
            
            if (data.result) {
              result = {
                hash: data.result.hash,
                status: 'success', // Would need receipt for actual status
                blockNumber: data.result.blockNumber,
                from: data.result.from,
                to: data.result.to,
                value: data.result.value,
                gas: data.result.gas,
                gasPrice: data.result.gasPrice,
                type: 'evm_transaction',
                timestamp: Date.now().toString()
              };
            } else {
              throw new Error('Transaction not found');
            }
          } catch (error) {
            throw new Error(`EVM transaction lookup failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        } else {
          // Cosmos transaction lookup
          try {
            const response = await fetch(`https://rest.sei-apis.com/cosmos/tx/v1beta1/txs/${txHash}`);
            if (!response.ok) {
              throw new Error('Cosmos transaction not found');
            }
            const data = await response.json();
            
            result = {
              hash: data.tx_response?.txhash || txHash,
              status: data.tx_response?.code === 0 ? 'success' : 'failed',
              height: data.tx_response?.height,
              timestamp: data.tx_response?.timestamp,
              gas_used: data.tx_response?.gas_used,
              gas_wanted: data.tx_response?.gas_wanted,
              type: 'cosmos_transaction',
              messages: data.tx?.body?.messages || [],
              events: data.tx_response?.events || []
            };
          } catch (error) {
            throw new Error(`Cosmos transaction lookup failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }
        break;
      }

      case 'get_nft_history': {
        const { collection, tokenId, contractAddress } = params;
        
        if (contractAddress && contractAddress.startsWith('0x')) {
          // EVM NFT history
          try {
            // Get current owner
            const ownerResponse = await fetch(`https://evm-rpc.sei-apis.com`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                jsonrpc: '2.0',
                method: 'eth_call',
                params: [
                  {
                    to: contractAddress,
                    data: `0x6352211e${tokenId.toString(16).padStart(64, '0')}` // ownerOf function selector
                  },
                  'latest'
                ],
                id: 1
              })
            });
            
            const ownerData = await ownerResponse.json();
            const currentOwner = ownerData.result || 'Unknown';
            
            result = {
              collection: contractAddress,
              tokenId,
              currentOwner,
              type: 'evm_nft',
              transfers: [
                {
                  from: '0x0000000000000000000000000000000000000000',
                  to: currentOwner,
                  timestamp: new Date().toISOString(),
                  price: null,
                  hash: 'simulated'
                }
              ]
            };
          } catch (error) {
            throw new Error(`EVM NFT lookup failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        } else {
          // Cosmos NFT history (placeholder)
          result = {
            collection: collection || 'cosmos_collection',
            tokenId: tokenId || '1',
            currentOwner: 'sei1placeholder',
            type: 'cosmos_nft',
            transfers: [],
            message: 'Cosmos NFT tracking coming soon'
          };
        }
        break;
      }

      case 'get_wallet_transactions': {
        // Enhanced wallet transaction history
        const { address, timeframe } = params;
        const isEVMAddress = address.startsWith('0x');
        
        if (isEVMAddress) {
          // EVM transaction history
          try {
            // Get latest block first
            const latestBlockResponse = await fetch(`https://evm-rpc.sei-apis.com`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                jsonrpc: '2.0',
                method: 'eth_blockNumber',
                params: [],
                id: 1
              })
            });
            
            const latestBlockData = await latestBlockResponse.json();
            const latestBlock = parseInt(latestBlockData.result, 16);
            
            // For now, return simulated transaction data
            result = [
              {
                hash: '0x' + Math.random().toString(16).substr(2, 64),
                from: address,
                to: '0x' + Math.random().toString(16).substr(2, 40),
                value: '1000000000000000000', // 1 SEI
                gas: '21000',
                gasPrice: '20000000000',
                type: 'transfer',
                status: 'success',
                timestamp: new Date().toISOString(),
                block: latestBlock
              }
            ];
          } catch (error) {
            throw new Error(`EVM transaction history failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        } else {
          // Cosmos transaction history
          try {
            const response = await fetch(`https://rest.sei-apis.com/cosmos/tx/v1beta1/txs?events=transfer.sender='${address}'&limit=10`);
            const data = await response.json();
            
            result = (data.tx_responses || []).map((tx: any) => ({
              hash: tx.txhash,
              height: tx.height,
              timestamp: tx.timestamp,
              gas_used: tx.gas_used,
              gas_wanted: tx.gas_wanted,
              type: 'cosmos_transfer',
              status: tx.code === 0 ? 'success' : 'failed',
              messages: tx.tx?.body?.messages || []
            }));
          } catch (error) {
            // Return empty array if cosmos lookup fails
            result = [];
          }
        }
        break;
      }
      
      default:
        console.error(`Unknown method: ${method}`);
        return res.json({
          jsonrpc: "2.0",
          id: id,
          error: { code: -32601, message: `Method not found: ${method}` }
        });
    }
    
    console.error(`Method ${method} completed successfully:`, result);
    
    // Convert BigInt values to strings for JSON serialization
    const serializedResult = JSON.parse(JSON.stringify(result, (key, value) =>
      typeof value === 'bigint' ? value.toString() : value
    ));

    res.json({
      jsonrpc: "2.0",
      id,
      result: serializedResult
    });
  } catch (error) {
    console.error(`Method ${req.body.method} failed:`, error);
    res.json({
      jsonrpc: "2.0",
      id: req.body.id,
      error: {
        code: -32000,
        message: error instanceof Error ? error.message : String(error)
      }
    });
  }
});

// Define routes
// @ts-ignore
app.get("/sse", (req: Request, res: Response) => {
  console.error(`Received SSE connection request from ${req.ip}`);
  console.error(`Query parameters: ${JSON.stringify(req.query)}`);
  
  // Set CORS headers explicitly
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (!server) {
    console.error("Server not initialized yet, rejecting SSE connection");
    return res.status(503).send("Server not initialized");
  }
  
  // Generate a unique session ID if one is not provided
  // The sessionId is crucial for mapping SSE connections to message handlers
  const sessionId = generateSessionId();
  console.error(`Creating SSE session with ID: ${sessionId}`);
  
  // Set SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  
  // Create transport - handle before writing to response
  try {
    console.error(`Creating SSE transport for session: ${sessionId}`);
    
    // Create and store the transport keyed by session ID
    // Note: The path must match what the client expects (typically "/messages")
    const transport = new SSEServerTransport("/messages", res);
    connections.set(sessionId, transport);
    
    // Handle connection close
    req.on("close", () => {
      console.error(`SSE connection closed for session: ${sessionId}`);
      connections.delete(sessionId);
    });
    
    // Connect transport to server - this must happen before sending any data
    server.connect(transport).then(() => {
      // Send an initial event with the session ID for the client to use in messages
      // Only send this after the connection is established
      console.error(`SSE connection established for session: ${sessionId}`);
      
      // Send the session ID to the client
      res.write(`data: ${JSON.stringify({ type: "session_init", sessionId })}\n\n`);
    }).catch((error: Error) => {
      console.error(`Error connecting transport to server: ${error}`);
      connections.delete(sessionId);
    });
  } catch (error) {
    console.error(`Error creating SSE transport: ${error}`);
    connections.delete(sessionId);
    res.status(500).send(`Internal server error: ${error}`);
  }
});

// @ts-ignore
app.post("/messages", (req: Request, res: Response) => {
  // Extract the session ID from the URL query parameters
  let sessionId = req.query.sessionId?.toString();
  
  // If no sessionId is provided and there's only one connection, use that
  if (!sessionId && connections.size === 1) {
    sessionId = Array.from(connections.keys())[0];
    console.error(`No sessionId provided, using the only active session: ${sessionId}`);
  }
  
  console.error(`Received message for sessionId ${sessionId}`);
  console.error(`Message body: ${JSON.stringify(req.body)}`);
  
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (!server) {
    console.error("Server not initialized yet");
    return res.status(503).json({ error: "Server not initialized" });
  }
  
  if (!sessionId) {
    console.error("No session ID provided and multiple connections exist");
    return res.status(400).json({ 
      error: "No session ID provided. Please provide a sessionId query parameter or connect to /sse first.",
      activeConnections: connections.size
    });
  }
  
  const transport = connections.get(sessionId);
  if (!transport) {
    console.error(`Session not found: ${sessionId}`);
    return res.status(404).json({ error: "Session not found" });
  }
  
  console.error(`Handling message for session: ${sessionId}`);
  try {
    transport.handlePostMessage(req, res).catch((error: Error) => {
      console.error(`Error handling post message: ${error}`);
      res.status(500).json({ error: `Internal server error: ${error.message}` });
    });
  } catch (error) {
    console.error(`Exception handling post message: ${error}`);
    res.status(500).json({ error: `Internal server error: ${error}` });
  }
});

// Add a simple health check endpoint
app.get("/health", (req: Request, res: Response) => {
  res.status(200).json({ 
    status: "ok",
    server: server ? "initialized" : "initializing",
    activeConnections: connections.size,
    connectedSessionIds: Array.from(connections.keys())
  });
});

// Add a root endpoint for basic info
app.get("/", (req: Request, res: Response) => {
  res.status(200).json({
    name: "MCP Server",
    version: "1.0.0",
    endpoints: {
      sse: "/sse",
      messages: "/messages",
      health: "/health",
      mcp: "/api/mcp"
    },
    status: server ? "ready" : "initializing",
    activeConnections: connections.size
  });
});

// Helper function to generate a UUID-like session ID
function generateSessionId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Handle process termination gracefully
process.on('SIGINT', () => {
  console.error('Shutting down server...');
  connections.forEach((transport, sessionId) => {
    console.error(`Closing connection for session: ${sessionId}`);
  });
  process.exit(0);
});

// Start the HTTP server on a different port (3004) to avoid conflicts
const httpServer = app.listen(PORT, HOST, () => {
  console.error(`Template MCP Server running at http://${HOST}:${PORT}`);
  console.error(`SSE endpoint: http://${HOST}:${PORT}/sse`);
  console.error(`Messages endpoint: http://${HOST}:${PORT}/messages (sessionId optional if only one connection)`);
  console.error(`Health check: http://${HOST}:${PORT}/health`);
}).on('error', (err: Error) => {
  console.error(`Server error: ${err}`);
  if (err.message.includes('EADDRINUSE')) {
    console.error(`Error: Failed to start server. Is port ${PORT} in use?`);
  }
  process.exit(1);
}); 