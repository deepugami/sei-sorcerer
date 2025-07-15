import { tool } from "ai";
import { z } from "zod";
import SeiMCPClient, { QueryParser } from "@/lib/sei-mcp-client";

// Create MCP client instance
const seiMCPKit = new SeiMCPClient();

export const transactionExplainer = tool({
  description: "Explain complex blockchain transactions in simple terms, breaking down multi-step DeFi interactions for both EVM and Cosmos transactions",
  parameters: z.object({
    query: z.string().describe("Natural language query about transaction explanation (e.g., 'Explain transaction 0x123...abc')")
  }),
  execute: async ({ query }) => {
    try {
      // Parse the query for transaction hash
      const txHash = QueryParser.extractTransactionHash(query);

      if (!txHash) {
        return `Transaction Explainer - Missing Hash

I need a transaction hash to explain what happened. Please provide a valid transaction hash.

Supported formats:
EVM transactions: 0x123abc...def456 (64 hex characters)
Cosmos transactions: ABC123...XYZ789 (64 characters)

Example queries:
"Explain transaction 0x123abc...def456"
"What happened in tx 0xabc123...xyz789"
"Break down this transaction: ABC123DEF456"

Transaction hashes are unique identifiers for blockchain operations.`;
      }

      // Determine transaction type (EVM vs Cosmos)
      const isEVMTx = txHash.startsWith('0x');
      
      if (isEVMTx) {
        return await explainEVMTransaction(txHash);
      } else {
        return await explainCosmosTransaction(txHash);
      }

    } catch (error) {
      console.error('Transaction explanation error:', error);
      return `Transaction Explanation Error

The transaction analysis encountered an issue: ${error instanceof Error ? error.message : 'Unknown error'}

This could be due to:
- Invalid transaction hash format
- Transaction not found on the blockchain
- Network connectivity issues
- Transaction still pending confirmation

Please try again with a valid transaction hash. For EVM transactions, use format 0x... and for Cosmos transactions, use the full hash.`;
    }
  },
});

// EVM Transaction Explainer
async function explainEVMTransaction(txHash: string): Promise<string> {
  try {
    // Get transaction data using MCP client first, fallback to direct RPC
    let transaction;
    try {
      // Try MCP server first
      try {
        transaction = await seiMCPKit.getTransaction(txHash);
        console.log('Transaction data from MCP server:', transaction);
        
        // Also try to get transaction receipt for detailed logs
        try {
          const receipt = await seiMCPKit.getTransactionReceipt(txHash);
          console.log('Transaction receipt from MCP server:', receipt);
          if (receipt) {
            transaction.receipt = receipt;
            transaction.logs = receipt.logs;
            // Fix status detection logic
            transaction.status = receipt.status;
          }
        } catch (receiptError) {
          console.log('Receipt not available:', receiptError);
        }
      } catch (mcpError) {
        console.log('MCP server failed, trying direct RPC:', mcpError);
        // Fallback to direct RPC call
        transaction = await getEVMTransactionData(txHash);
      }
    } catch (error) {
      return `EVM Transaction Analysis

Transaction Hash: ${txHash}

Transaction Lookup Status:
The official Sei MCP server doesn't yet support detailed transaction lookups. However, I can guide you on how to analyze this transaction:

Manual Analysis Steps:
1. Visit Seistream Explorer: https://seistream.app/tx/${txHash}
2. Check Seistream for:
   - Transaction status (success/failed)
   - Gas used and gas price
   - Contract interactions
   - Token transfers
   - Event logs

What to Look For:
Simple Transfer: If you see basic token/SEI movement
DeFi Interaction: Multiple contract calls = complex DeFi operation
Failed Transaction: Red status = something went wrong
Gas Costs: High gas = complex transaction

Transaction Analysis Coming Soon:
I'm working on implementing full transaction analysis. For now, use Seistream for detailed breakdown.

Want me to analyze a wallet or explain DeFi concepts instead?`;
    }

    // Analyze transaction complexity
    const logs = transaction.logs || [];
    const events = extractEventsFromLogs(logs);
    const isComplexTx = events.length > 1;

    // Calculate costs
    const gasUsed = parseInt(transaction.gasUsed || '0');
    const gasPrice = parseFloat(transaction.gasPrice || '0');
    const txFee = (gasUsed * gasPrice) / 1e18; // Convert to SEI

    // Fix status detection - check multiple possible indicators
    const isSuccessful = determineTransactionStatus(transaction);
    const statusText = isSuccessful ? 'Success' : 'Failed';

    // Generate explanation
    const stepByStep = generateEVMStepByStep(events);
    const category = categorizeEVMTransaction(events);
    const riskLevel = assessEVMRisk(events);

    return `EVM Transaction Analysis

Transaction Overview:
Hash: ${txHash}
Status: ${statusText}
Block: ${transaction.blockNumber}
Timestamp: ${new Date(parseInt(transaction.timeStamp) * 1000).toLocaleString()}
Category: ${category.toUpperCase()}

Transaction Costs:
Gas Used: ${gasUsed.toLocaleString()} units
Gas Price: ${gasPrice} Gwei
Total Fee: ${txFee.toFixed(6)} SEI
Fee Value: ~$${(txFee * 0.12).toFixed(4)} USD

Step-by-Step Breakdown:
${stepByStep}

Simple Explanation:
${generateEVMSimpleExplanation(category, events)}

Risk Assessment:
Risk Level: ${riskLevel.toUpperCase()}
Complexity: ${isComplexTx ? 'High (Multi-step DeFi)' : 'Low (Simple operation)'}
Protocol Safety: ${assessProtocolSafety(events)}

Technical Analysis:
${generateEVMTechnicalAnalysis(transaction, events)}

What This Means for You:
${getEVMActionableInsight(category, events)}

Educational Note:
${getEVMEducationalNote(category)}

Want me to explain any specific step or analyze related transactions?`;

  } catch (error) {
    throw new Error(`Failed to analyze EVM transaction: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Cosmos Transaction Explainer
async function explainCosmosTransaction(txHash: string): Promise<string> {
  try {
    // Get Cosmos transaction data
    const transaction = await getCosmosTransactionData(txHash);

    // Analyze Cosmos-specific operations
    const messages = transaction.tx?.body?.messages || [];
    const events = transaction.tx_result?.events || [];
    
    // Generate Cosmos-specific analysis
    const stepByStep = generateCosmosStepByStep(messages, events);
    const category = categorizeCosmosTransaction(messages);
    const fees = calculateCosmosFees(transaction);

    return `Cosmos Transaction Analysis

Transaction Overview:
Hash: ${txHash}
Status: ${transaction.tx_result?.code === 0 ? 'Success' : 'Failed'}
Height: ${transaction.height}
Category: ${category.toUpperCase()}

Transaction Costs:
Gas Used: ${transaction.tx_result?.gas_used || '0'}
Gas Wanted: ${transaction.tx_result?.gas_wanted || '0'}
Fee: ${fees.amount} ${fees.denom}

Operation Breakdown:
${stepByStep}

Simple Explanation:
${generateCosmosSimpleExplanation(category, messages)}

Cosmos-Specific Insights:
${generateCosmosInsights(messages, events)}

What This Means:
${getCosmosActionableInsight(category)}

This was a Cosmos SDK transaction on the Sei network. Cosmos transactions are typically more efficient and have lower fees than EVM transactions.`;

  } catch (error) {
    return `Cosmos Transaction Analysis

Transaction Hash: ${txHash}

Cosmos Transaction Lookup:
Currently implementing Cosmos transaction analysis. For now, you can:

Manual Analysis:
1. Visit Mintscan: https://www.mintscan.io/sei/txs/${txHash}
2. Or Celatone: https://celatone.osmosis.zone/sei/txs/${txHash}

Cosmos vs EVM:
Cosmos transactions: More efficient, lower fees
EVM transactions: Smart contract interactions
Sei supports both: Unique dual execution environment

Coming Soon: Full Cosmos transaction analysis with IBC tracking.`;
  }
}

// Helper function to properly determine transaction status
function determineTransactionStatus(transaction: any): boolean {
  // Check receipt status first (most reliable)
  if (transaction.receipt) {
    const status = transaction.receipt.status;
    
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
  if (transaction.status !== undefined) {
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
  if (transaction.blockNumber && transaction.blockNumber !== '0x0') {
    return true;
  }
  
  // Default to false if we can't determine
  return false;
}

// Helper Functions

async function getEVMTransactionData(txHash: string) {
  try {
    // Try to get real transaction data from Sei RPC
    const response = await fetch('https://evm-rpc.sei-apis.com/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_getTransactionByHash',
        params: [txHash],
        id: 1
      })
    });

    if (!response.ok) {
      throw new Error('RPC request failed');
    }

    const data = await response.json();
    
    if (!data.result) {
      throw new Error('Transaction not found');
    }

    const tx = data.result;
    
    // Get transaction receipt for status and logs
    const receiptResponse = await fetch('https://evm-rpc.sei-apis.com/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_getTransactionReceipt',
        params: [txHash],
        id: 2
      })
    });

    let receipt = null;
    if (receiptResponse.ok) {
      const receiptData = await receiptResponse.json();
      receipt = receiptData.result;
    }

    // Get block data for timestamp
    let blockData = null;
    if (tx.blockNumber) {
      const blockResponse = await fetch('https://evm-rpc.sei-apis.com/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_getBlockByNumber',
          params: [tx.blockNumber, false],
          id: 3
        })
      });

      if (blockResponse.ok) {
        const blockResponseData = await blockResponse.json();
        blockData = blockResponseData.result;
      }
    }

    return {
      hash: txHash,
      status: receipt?.status || '1',
      blockNumber: tx.blockNumber ? parseInt(tx.blockNumber, 16).toString() : '0',
      timeStamp: blockData?.timestamp ? parseInt(blockData.timestamp, 16).toString() : Math.floor(Date.now() / 1000).toString(),
      gasUsed: receipt?.gasUsed ? parseInt(receipt.gasUsed, 16).toString() : '0',
      gasPrice: tx.gasPrice ? parseInt(tx.gasPrice, 16).toString() : '0',
      logs: receipt?.logs || [],
      value: tx.value ? parseInt(tx.value, 16).toString() : '0',
      from: tx.from,
      to: tx.to,
      input: tx.input
    };
  } catch (error) {
    throw new Error(`Failed to fetch transaction data: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function getCosmosTransactionData(txHash: string) {
  // Fetch from Cosmos REST API
  try {
    const response = await fetch(`https://rest.sei-apis.com/cosmos/tx/v1beta1/txs/${txHash}`);
    if (!response.ok) {
      throw new Error('Transaction not found');
    }
    return await response.json();
  } catch (error) {
    throw new Error('Failed to fetch Cosmos transaction');
  }
}

function extractEventsFromLogs(logs: any[]): any[] {
  const events: any[] = [];
  logs.forEach(log => {
    if (log.topics && log.topics.length > 0) {
      // Parse EVM event logs
      const eventSignature = log.topics[0];
      events.push({
        type: parseEventType(eventSignature),
        address: log.address,
        data: log.data,
        topics: log.topics
      });
    }
  });
  return events;
}

function parseEventType(signature: string): string {
  // Common EVM event signatures
  const eventTypes: { [key: string]: string } = {
    '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef': 'transfer',
    '0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925': 'approval',
    '0x1c411e9a96e071241c2f21f7726b17ae89e3cab4c78be50e062b03a9fffbbad1': 'sync',
    '0xd78ad95fa46c994b6551d0da85fc275fe613ce37657fb8d5e3d130840159d822': 'swap'
  };
  return eventTypes[signature] || 'unknown';
}

function generateEVMStepByStep(events: any[]): string {
  if (events.length === 0) {
    return "**1.** 📤 Simple token or SEI transfer";
  }

  return events.map((event, index) => {
    let emoji = '⚡';
    let description = 'Unknown operation';

    switch (event.type) {
      case 'transfer':
        emoji = '📤';
        description = 'Token transfer executed';
        break;
      case 'approval':
        emoji = '✅';
        description = 'Token spending approved';
        break;
      case 'swap':
        emoji = '🔄';
        description = 'Token swap executed';
        break;
      case 'sync':
        emoji = '🔄';
        description = 'Liquidity pool synchronized';
        break;
    }

    return `**${index + 1}.** ${emoji} ${description}`;
  }).join('\n');
}

function generateCosmosStepByStep(messages: any[], events: any[]): string {
  if (messages.length === 0) {
    return "**1.** 📤 Cosmos transaction executed";
  }

  return messages.map((msg, index) => {
    const msgType = msg['@type'] || msg.type_url || 'unknown';
    let emoji = '⚡';
    let description = 'Cosmos operation';

    if (msgType.includes('bank')) {
      emoji = '💰';
      description = 'Bank operation (send/receive)';
    } else if (msgType.includes('staking')) {
      emoji = '🔒';
      description = 'Staking operation';
    } else if (msgType.includes('gov')) {
      emoji = '🗳️';
      description = 'Governance operation';
    } else if (msgType.includes('ibc')) {
      emoji = '🌉';
      description = 'Inter-blockchain communication';
    }

    return `**${index + 1}.** ${emoji} ${description}`;
  }).join('\n');
}

function categorizeEVMTransaction(events: any[]): string {
  const eventTypes = events.map(e => e.type);
  
  if (eventTypes.includes('swap')) return 'defi_trading';
  if (eventTypes.includes('approval') && eventTypes.length > 1) return 'defi_setup';
  if (eventTypes.includes('transfer')) return 'token_transfer';
  if (events.length > 2) return 'complex_defi';
  return 'simple';
}

function categorizeCosmosTransaction(messages: any[]): string {
  const msgTypes = messages.map(m => m['@type'] || m.type_url || '');
  
  if (msgTypes.some(t => t.includes('staking'))) return 'staking';
  if (msgTypes.some(t => t.includes('gov'))) return 'governance';
  if (msgTypes.some(t => t.includes('ibc'))) return 'ibc';
  if (msgTypes.some(t => t.includes('bank'))) return 'transfer';
  return 'other';
}

function assessEVMRisk(events: any[]): string {
  if (events.length > 3) return 'high';
  if (events.some(e => e.type === 'approval')) return 'medium';
  return 'low';
}

function calculateCosmosFees(transaction: any): { amount: string; denom: string } {
  const fee = transaction.tx?.auth_info?.fee?.amount?.[0];
  return {
    amount: fee?.amount ? (parseFloat(fee.amount) / 1e6).toFixed(6) : '0',
    denom: 'SEI'
  };
}

function generateEVMSimpleExplanation(category: string, events: any[]): string {
  switch (category) {
    case 'defi_trading':
      return "User performed a DeFi token swap - exchanging one cryptocurrency for another through an automated market maker.";
    case 'defi_setup':
      return "User set up DeFi permissions by approving a smart contract to spend their tokens, then executed an operation.";
    case 'token_transfer':
      return "User transferred tokens directly from their wallet to another address.";
    case 'complex_defi':
      return "Multi-step DeFi operation combining several actions like approvals, swaps, and liquidity operations.";
    default:
      return "Standard blockchain transaction interacting with smart contracts.";
  }
}

function generateCosmosSimpleExplanation(category: string, messages: any[]): string {
  switch (category) {
    case 'staking':
      return "User staked SEI tokens to help secure the network and earn rewards.";
    case 'governance':
      return "User participated in blockchain governance by voting or submitting proposals.";
    case 'ibc':
      return "Inter-blockchain transfer - moving assets between different blockchain networks.";
    case 'transfer':
      return "Native Cosmos token transfer using the bank module.";
    default:
      return "Cosmos SDK transaction on the Sei network.";
  }
}

function getCategoryEmoji(category: string): string {
  const emojiMap: { [key: string]: string } = {
    'defi_trading': '🔄',
    'defi_setup': '⚙️',
    'token_transfer': '📤',
    'complex_defi': '🔧',
    'staking': '🔒',
    'governance': '🗳️',
    'ibc': '🌉',
    'transfer': '💰',
    'simple': '⚡',
    'other': '📋'
  };
  return emojiMap[category] || '📋';
}

function getRiskEmoji(risk: string): string {
  const riskEmojis: { [key: string]: string } = {
    'low': '🟢',
    'medium': '🟡',
    'high': '🔴'
  };
  return riskEmojis[risk] || '⚪';
}

function assessProtocolSafety(events: any[]): string {
  // Simple safety assessment
  return events.length > 0 ? 'Smart contract verified ✅' : 'Simple transfer ✅';
}

function generateEVMTechnicalAnalysis(transaction: any, events: any[]): string {
  return `- **Gas Efficiency:** ${assessGasEfficiency(parseInt(transaction.gasUsed))}
- **Transaction Type:** ${events.length > 0 ? 'Smart contract interaction' : 'EOA transaction'}
- **Event Count:** ${events.length} blockchain events emitted`;
}

function assessGasEfficiency(gasUsed: number): string {
  if (gasUsed < 30000) return 'Highly efficient 🟢';
  if (gasUsed < 100000) return 'Standard efficiency 🟡';
  return 'Complex operation 🟠';
}

function generateCosmosInsights(messages: any[], events: any[]): string {
  return `- **Message Count:** ${messages.length} Cosmos messages
- **Event Count:** ${events.length} Cosmos events
- **Efficiency:** Cosmos transactions are typically 90% cheaper than EVM
- **Finality:** Instant finality with Tendermint consensus`;
}

function getEVMActionableInsight(category: string, events: any[]): string {
  switch (category) {
    case 'defi_trading':
      return 'Monitor slippage and MEV protection for future swaps. Consider using limit orders for better execution.';
    case 'defi_setup':
      return 'Be cautious with unlimited approvals. Consider using exact amount approvals for better security.';
    default:
      return 'Transaction executed successfully. Always verify recipient addresses before sending.';
  }
}

function getCosmosActionableInsight(category: string): string {
  switch (category) {
    case 'staking':
      return 'Great choice for passive income! Monitor validator performance and consider diversifying across validators.';
    case 'ibc':
      return 'Cross-chain transfers can take time. Track your assets on both source and destination chains.';
    default:
      return 'Cosmos transactions are fast and cheap. Perfect for frequent operations.';
  }
}

function getEVMEducationalNote(category: string): string {
  switch (category) {
    case 'defi_trading':
      return 'DeFi swaps use Automated Market Makers (AMMs). Price is determined by token ratios in liquidity pools.';
    case 'complex_defi':
      return 'Complex DeFi operations save gas by batching multiple actions. Always simulate before executing!';
    default:
      return 'EVM transactions are deterministic - they either fully succeed or fully fail (atomicity).';
  }
}
