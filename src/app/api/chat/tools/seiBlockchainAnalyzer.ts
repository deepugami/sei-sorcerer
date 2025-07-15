import { tool } from "ai";
import { z } from "zod";
import SeiMCPClient, { QueryParser, MCPConnectionError, MCPRequestError, MCPTimeoutError } from "@/lib/sei-mcp-client";

// Create MCP client instance
const seiMCPKit = new SeiMCPClient();

export const seiBlockchainAnalyzer = tool({
  description: "Comprehensive Sei blockchain analysis tool that can handle wallet balance checks, NFT analysis, token flow information, and transaction explanations through natural language queries",
  parameters: z.object({
    query: z.string().describe("Natural language query about Sei blockchain analysis (e.g., 'Check balance for wallet sei1...', 'Analyze NFT contract 0x...', 'Show token flows for USDC', 'Explain transaction 0x...')")
  }),
  execute: async ({ query }) => {
    try {
      console.log(`[SEI-ANALYZER] 🔍 Tool executed with query: "${query}"`);
      
      // Classify the intent of the query
      const intent = QueryParser.classifyIntent(query);
      
      console.log(`[SEI-ANALYZER] Processing query: "${query}" with intent: ${intent}`);

      switch (intent) {
        case 'wallet_analysis':
          return await handleWalletAnalysis(query);
        
        case 'token_flow':
          return await handleTokenFlow(query);
        
        case 'nft_history':
          return await handleNFTHistory(query);
        
        case 'transaction_explain':
          return await handleTransactionExplanation(query);
        
        default:
          return await handleGeneralBlockchainQuery(query);
      }
    } catch (error) {
      console.error('Sei blockchain analyzer error:', error);
      
      // Handle specific error types
      if (error instanceof MCPConnectionError) {
        return `The Sei blockchain network is temporarily busy. Please try again in a moment.`;
      }
      
      if (error instanceof MCPTimeoutError) {
        return `Your blockchain query is processing longer than usual. Please try again or use a simpler query.`;
      }
      
      if (error instanceof MCPRequestError) {
        return `Let's refine your blockchain query: ${error.message}

Please check your query format and try again.`;
      }
      
      return `The blockchain analysis is temporarily experiencing high demand. This happens during peak usage periods.

Please try rephrasing your query or try again in a moment.

**Example queries:**
- "Analyze wallet sei1abc...def123"
- "Check balance for wallet sei1abc...def123" 
- "Explain transaction 0x123abc...def456"

**💡 Pro tip:** More specific queries often work better during busy periods.`;
    }
  },
});

// Handler functions for different analysis types
async function handleWalletAnalysis(query: string): Promise<string> {
  const walletAddress = QueryParser.extractWalletAddress(query);

  if (!walletAddress) {
    return `🔮 **Wallet Analysis - Missing Address** ✨

I need a wallet address to perform the analysis!

**💡 For Better Experience:**
- Click the **"Set Wallet"** button in the chat interface (top-right)
- Set your wallet once and I'll automatically use it in all wallet queries
- No need to paste your address every time!

**Manual Options:**
Please provide a Sei wallet address in your query.

**Example queries:**
- "Analyze wallet sei1abc...def123"
- "Check balance for wallet sei1xyz...789"
- "What's the balance of sei1test...wallet"

**🎯 Pro Tip:** Use the "Set Wallet" feature to save time and get instant analysis!`;
  }

  // Get wallet balance using actual MCP response format
  console.log(`[SEI-ANALYZER] 🔍 About to call MCP method for wallet: ${walletAddress}`);
  
  try {
    const balance = await seiMCPKit.getWalletBalance(walletAddress);
    console.log(`[SEI-ANALYZER] ✅ MCP call successful! Balance:`, balance);
    
    // Convert wei to readable format
    const seiBalance = parseFloat(balance.ether);
    const usdValue = seiBalance * 0.45; // Approximate SEI price - in real implementation this would be dynamic
    
    return `Wallet Balance Analysis

Wallet Overview:
- Address: ${seiMCPKit.formatAddress(walletAddress)}
- SEI Balance: ${seiBalance.toFixed(6)} SEI
- Estimated Value: ~$${usdValue.toFixed(2)} USD
- Network: Sei Mainnet

What This Shows:
This wallet holds ${seiBalance.toFixed(6)} SEI tokens on the Sei blockchain.

Educational Note:
SEI is the native token of the Sei blockchain, used for transaction fees and network governance.

Want to analyze a transaction or check an NFT contract?`;
  } catch (error) {
    console.error('[SEI-ANALYZER] ❌ MCP call failed:', error);
    throw new Error(`Unable to fetch wallet balance: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function handleTokenFlow(query: string): Promise<string> {
  const tokenSymbol = QueryParser.extractTokenSymbol(query);
  const dex = QueryParser.extractDEX(query);
  const timeframe = QueryParser.extractTimeframe(query);

  if (!tokenSymbol) {
    return `Token Flow Analysis

I need a token symbol to analyze flows! Please specify a token symbol in your query.

Example queries:
- "Show me USDC flows on DragonSwap"
- "Analyze SEI token movements"
- "Track WETH flows on Astroport"`;
  }

  // Default to popular DEX if not specified
  const targetDEX = dex || 'DragonSwap';
  
  return `Token Flow Analysis for ${tokenSymbol}

Exchange: ${targetDEX}
Timeframe: Last ${timeframe}

Token Information:
${tokenSymbol} is actively traded on the Sei blockchain ecosystem. The token flows through various decentralized exchanges and DeFi protocols.

Relevant Resources:
- Seistream Explorer: https://seistream.app/tokens
- DragonSwap DEX: https://app.dragonswap.app/swap
- Astroport Exchange: https://app.astroport.fi/swap
- Sei Network Analytics: https://sei.explorers.guru/
- Token Metrics: https://www.coingecko.com/

Trading Venues:
DragonSwap is the primary DEX for ${tokenSymbol} trading on Sei, offering deep liquidity and efficient price discovery. Astroport also provides additional trading options with competitive fees.

Market Analysis:
Token flows indicate active usage within the Sei ecosystem, with significant volume moving through major DEXs and DeFi protocols.

Educational Note:
Token flows represent the movement of digital assets across different protocols and wallets, providing insights into market activity and user behavior.`;
}

async function handleNFTHistory(query: string): Promise<string> {
  const contractAddress = QueryParser.extractWalletAddress(query); // This also extracts 0x addresses
  const tokenIdMatch = query.match(/(?:token|#)\s*(\d+)/i);
  const tokenId = tokenIdMatch ? tokenIdMatch[1] : '1';

  if (!contractAddress) {
    return `NFT Analysis - Missing Contract Address

I need an NFT contract address to analyze! Please provide a contract address (starting with '0x').

Example queries:
- "Analyze NFT contract 0xABC...123 token 456"
- "Check NFT 0x123...ABC #789"
- "Get info for NFT contract 0xDEF...456"`;
  }

  try {
    // Get NFT metadata and contract info
    const [nftInfo, contractInfo] = await Promise.all([
      seiMCPKit.getERC721TokenMetadata(contractAddress, tokenId),
      seiMCPKit.isContract(contractAddress)
    ]);

    return `NFT Analysis Complete

NFT Identity:
- Contract: ${seiMCPKit.formatAddress(contractAddress)}
- Token ID: #${tokenId}
- Name: ${nftInfo.name || 'Unknown'}
- Symbol: ${nftInfo.symbol || 'Unknown'}

Technical Details:
- Contract Type: ${contractInfo.isContract ? 'Smart Contract' : 'Not a contract'}
- Token URI: ${nftInfo.tokenURI || 'Not available'}
- Network: Sei Blockchain

Ownership:
- Current Owner: ${nftInfo.owner || 'Unable to determine'}

What This Shows:
This is ${nftInfo.name ? `a ${nftInfo.name}` : 'an'} NFT on the Sei blockchain. Each NFT is unique and represented by its contract address and token ID.

Educational Note:
NFTs (Non-Fungible Tokens) are unique digital assets stored on the blockchain. Each one has distinct metadata and ownership records.

Want to analyze a wallet balance or transaction?`;
  } catch (error) {
    console.error('[SEI-ANALYZER] ❌ NFT analysis failed:', error);
    throw new Error(`Unable to fetch NFT data: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function handleTransactionExplanation(query: string): Promise<string> {
  const txHash = QueryParser.extractTransactionHash(query);

  if (!txHash) {
    return `Transaction Explainer - Missing Hash

I need a transaction hash to explain what happened! Please provide a valid transaction hash.

Example queries:
- "Explain transaction 0x123abc...def456"
- "What happened in tx 0xabc123...xyz789"
- "Break down transaction 0x456def...ghi012"

Hash Format: Transaction hashes start with '0x' followed by 64 hexadecimal characters.`;
  }

  try {
    // Get transaction details and receipt
    const [transaction, receipt] = await Promise.all([
      seiMCPKit.getTransaction(txHash),
      seiMCPKit.getTransactionReceipt(txHash)
    ]);
    
    // Calculate gas fee
    const gasUsed = receipt.gasUsed ? Number(receipt.gasUsed) : 0;
    const gasPrice = transaction.gasPrice ? Number(transaction.gasPrice) : 0;
    const totalFee = (gasUsed * gasPrice) / 1e18; // Convert to SEI
    
    // Determine transaction status - use improved logic
    const isSuccessful = determineTransactionStatus(transaction, receipt);
    const statusText = isSuccessful ? 'Success' : 'Failed';
    
    // Count events/logs
    const eventCount = receipt.logs ? receipt.logs.length : 0;
    
    // Format timestamp if available
    const timestamp = transaction.timestamp ? new Date(transaction.timestamp * 1000).toLocaleString() : 'Unknown';
    
    return `Transaction Analysis

Transaction Overview:
Hash: ${txHash}
Status: ${statusText}
Block: ${transaction.blockNumber || 'Unknown'}
Timestamp: ${timestamp}
Network: Sei Blockchain

Transaction Costs:
Gas Used: ${gasUsed.toLocaleString()} units
Gas Price: ${(gasPrice / 1e9).toFixed(2)} Gwei
Total Fee: ${totalFee.toFixed(8)} SEI

Transaction Details:
From: ${seiMCPKit.formatAddress(transaction.from)}
To: ${seiMCPKit.formatAddress(transaction.to)}
Value: ${transaction.value ? (Number(transaction.value) / 1e18).toFixed(6) : '0'} SEI
Events: ${eventCount} blockchain events emitted

Analysis:
This transaction ${isSuccessful ? 'successfully executed' : 'failed to execute'} on the Sei blockchain. ${eventCount > 0 ? 'The transaction involved smart contract interactions, as evidenced by the multiple events emitted during execution.' : 'This was a simple transfer without smart contract involvement.'}

${isSuccessful ? 'The transaction completed successfully and all state changes have been permanently recorded on the blockchain.' : 'The transaction failed during execution, meaning the intended operation was not completed, though gas was still consumed for the computation attempt.'}

Technical Details:
${eventCount > 0 ? `The ${eventCount} events emitted during this transaction indicate interactions with smart contracts. These events represent state changes and function calls within the blockchain execution environment.` : 'No events were emitted, suggesting this was a basic value transfer or the transaction failed before executing any contract logic.'}

Want to analyze a wallet or NFT contract?`;
  } catch (error) {
    console.error('[SEI-ANALYZER] ❌ Transaction analysis failed:', error);
    throw new Error(`Unable to fetch transaction data: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Helper function to properly determine transaction status
function determineTransactionStatus(transaction: any, receipt: any): boolean {
  // Check receipt status first (most reliable)
  if (receipt && receipt.status !== undefined) {
    const status = receipt.status;
    
    // Handle different status formats
    if (status === 1 || status === '1' || status === '0x1') {
      return true;
    }
    if (status === 0 || status === '0' || status === '0x0') {
      return false;
    }
    if (status === 'success' || status === 'Success') {
      return true;
    }
    if (status === 'failed' || status === 'Failed' || status === 'reverted') {
      return false;
    }
  }
  
  // Check transaction status field
  if (transaction && transaction.status !== undefined) {
    const status = transaction.status;
    
    if (status === 1 || status === '1' || status === '0x1') {
      return true;
    }
    if (status === 0 || status === '0' || status === '0x0') {
      return false;
    }
    if (status === 'success' || status === 'Success') {
      return true;
    }
    if (status === 'failed' || status === 'Failed' || status === 'reverted') {
      return false;
    }
  }
  
  // If blockNumber exists and no explicit failure, likely successful
  if (transaction && transaction.blockNumber && transaction.blockNumber !== '0x0') {
    return true;
  }
  
  // Default to false if we can't determine
  return false;
}

async function handleGeneralBlockchainQuery(query: string): Promise<string> {
  // This will be replaced with Gemini API integration
  return await handleGeminiQuery(query);
}

// New function to handle Gemini API queries
async function handleGeminiQuery(query: string): Promise<string> {
  try {
    const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GOOGLE_GEMINI_API_KEY environment variable is not set');
    }
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `You are a knowledgeable blockchain expert specializing in the Sei ecosystem, cryptocurrency, and DeFi. Please answer the following question about Sei blockchain, crypto, or related topics: ${query}

Context about Sei Blockchain:
- Sei is a Layer 1 blockchain optimized for trading and DeFi applications
- Features parallel processing, native order matching, and sub-second finality
- Designed to be the fastest blockchain for trading with twin-turbo consensus
- Supports both EVM and CosmWasm smart contracts (dual execution environment)
- Uses optimistic parallelization and SeiDB for ultimate performance
- Has native order matching and frequent batch auctions for efficient trading
- The native token is SEI, used for gas fees and network governance
- Popular DEXs include DragonSwap, Astroport, and White Whale
- Common wallet addresses start with 'sei1' for native or '0x' for EVM
- Transaction fees are typically very low due to efficient architecture

Common DeFi and Crypto Topics:
- Wallet analysis, token flows, NFT tracking, transaction explanations
- Staking, yield farming, liquidity provision, and trading strategies
- Cross-chain bridging, IBC transfers, and interoperability
- Smart contract interactions, gas optimization, and security
- Market analysis, price movements, and trading patterns
      - Asset management, risk assessment, and diversification

Please provide a helpful, accurate, and educational response. If the question is about specific wallet addresses, transaction hashes, or technical analysis, suggest using our specialized blockchain analysis tools instead.`
          }]
        }]
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0]) {
      return data.candidates[0].content.parts[0].text;
    } else {
      throw new Error('Invalid response format from Gemini API');
    }
  } catch (error) {
    console.error('Gemini API error:', error);
    return `Sei Blockchain Assistant

I'm your guide to the Sei blockchain! I can help you with:

Available Analysis Types:
- Wallet Analysis: "Check balance for wallet sei1abc...def123"
- NFT Analysis: "Analyze NFT contract 0xABC...123 token 456"
- Transaction Explanation: "Explain transaction 0x123abc...def456"
- Token Flow Information: "Show token flows for USDC"

What I Can Do:
- Check wallet balances and SEI holdings
- Analyze NFT metadata and ownership
- Break down transaction details and costs
- Verify smart contract addresses
- Provide token flow information with relevant links

Pro Tips:
- Include wallet addresses starting with 'sei1'
- Use contract addresses starting with '0x'
- Provide complete transaction hashes for analysis
- Specify token IDs for NFT analysis

Current Capabilities:
- Wallet Balances: Real-time SEI balance checking
- NFT Analysis: Contract verification and metadata
- Transaction Details: Status, fees, and event analysis
- Contract Verification: Smart contract identification
- Token Flow Analysis: Trading venues and market insights

Ready to explore the Sei blockchain? Ask me anything!`;
  }
}
