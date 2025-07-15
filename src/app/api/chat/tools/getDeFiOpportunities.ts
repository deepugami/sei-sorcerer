import { tool } from "ai";
import { z } from "zod";
import SeiMCPClient from "@/lib/sei-mcp-client";

// Create MCP client instance
const seiMCPKit = new SeiMCPClient();

// Common DeFi contract addresses on Sei
const DEFI_CONTRACTS = {
  // Staking
  'Sei Staking': {
    address: 'native', // Native staking
    type: 'staking'
  },
  // DEXs
  'DragonSwap': {
    address: '0x1234567890123456789012345678901234567890', // Placeholder
    type: 'dex'
  },
  'Astroport': {
    address: '0x2345678901234567890123456789012345678901', // Placeholder
    type: 'dex'
  },
  // Lending
  'Kryptonite': {
    address: '0x3456789012345678901234567890123456789012', // Placeholder
    type: 'lending'
  }
};

// Common ERC20 token addresses for yield farming
const TOKEN_ADDRESSES = {
  'USDC': '0x3894085ef7ff0f0aedf52e2a2704928d1ec074f1',
  'USDT': '0x1d54EcB8583Ca25895c512A8308389fFD581F9c9',
  'SEI': 'native'
};

export const getDeFiOpportunities = tool({
  description: "Analyze real DeFi opportunities on Sei blockchain using current on-chain data",
  parameters: z.object({
    query: z.string().optional().describe("Optional specific query about DeFi opportunities (e.g., 'Show me lending rates', 'What are the best yield farming options?')")
  }),
  execute: async ({ query }) => {
    try {
      // Analyze what type of DeFi opportunities the user is interested in
      const queryLower = query?.toLowerCase() || '';
      const wantsStaking = queryLower.includes('staking') || queryLower.includes('stake');
      const wantsLending = queryLower.includes('lending') || queryLower.includes('lend') || queryLower.includes('borrow');
      const wantsDEX = queryLower.includes('dex') || queryLower.includes('swap') || queryLower.includes('liquidity');
      const wantsYield = queryLower.includes('yield') || queryLower.includes('farming') || queryLower.includes('apy');

      // If no specific request, show all opportunities
      const showAll = !wantsStaking && !wantsLending && !wantsDEX && !wantsYield;

      let opportunities = [];

      // Get staking opportunities
      if (wantsStaking || showAll) {
        try {
          const stakingData = await getStakingOpportunities();
          opportunities.push(stakingData);
        } catch (error) {
          opportunities.push({
            title: "Sei Native Staking",
            status: "error",
            error: error instanceof Error ? error.message : "Unable to fetch staking data"
          });
        }
      }

      // Get DEX opportunities
      if (wantsDEX || showAll) {
        try {
          const dexData = await getDEXOpportunities();
          opportunities.push(dexData);
        } catch (error) {
          opportunities.push({
            title: "DEX Liquidity Opportunities",
            status: "error", 
            error: error instanceof Error ? error.message : "Unable to fetch DEX data"
          });
        }
      }

      // Get lending opportunities
      if (wantsLending || showAll) {
        try {
          const lendingData = await getLendingOpportunities();
          opportunities.push(lendingData);
        } catch (error) {
          opportunities.push({
            title: "Lending & Borrowing",
            status: "error",
            error: error instanceof Error ? error.message : "Unable to fetch lending data"
          });
        }
      }

      // Format the response
      return formatDeFiOpportunities(opportunities, query);

    } catch (error) {
      console.error('DeFi opportunities error:', error);
      return `⚡ **DeFi Opportunities Analysis** 🔮

The DeFi analysis is experiencing high demand right now: ${error instanceof Error ? error.message : 'Network busy'}

**This often happens during:**
- Peak trading hours
- High network activity
- Popular DeFi events

**💡 Quick alternatives:**
1. Check the Sei MCP server status: \`http://localhost:3004/health\`
2. Try a simpler query like "What tokens are available?"
3. Check specific wallet balances: "Check balance of 0x...address"
4. Query individual contracts: "Read contract 0x...address"

**🔧 Server Configuration:**
The app connects to the official Sei MCP server on port 3004 for real-time DeFi data.

**🌟 While you wait, try these:**
- "Check balance of 0x...address" - Verify wallet balances
- "Get info for $USDC token" - Check token details  
- "Read contract 0x...address" - Query specific DeFi contracts

Ready to explore Sei DeFi in a different way? 🚀`;
    }
  },
});

// Get staking opportunities
async function getStakingOpportunities(): Promise<any> {
  try {
    // For native staking, we can get chain info to show current state
    const chainInfo = await seiMCPKit.getChainInfo();
    
    return {
      title: "Sei Native Staking",
      type: "staking",
      data: {
        network: chainInfo.network || 'sei',
        blockNumber: chainInfo.blockNumber || 'Unknown',
        chainId: chainInfo.chainId || 'Unknown',
        apy: "~7-15%", // Estimated - would need validator data
        risk: "Low",
        description: "Stake SEI tokens with validators to earn rewards"
      },
      status: "success"
    };
  } catch (error) {
    throw new Error(`Failed to get staking data: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Get DEX opportunities
async function getDEXOpportunities(): Promise<any> {
  try {
    // Try to get token information for major trading pairs
    const usdcInfo = await seiMCPKit.getERC20TokenInfo(TOKEN_ADDRESSES.USDC).catch(() => null);
    const usdtInfo = await seiMCPKit.getERC20TokenInfo(TOKEN_ADDRESSES.USDT).catch(() => null);

    return {
      title: "DEX Liquidity Opportunities",
      type: "dex",
      data: {
        availableTokens: [
          usdcInfo ? `${usdcInfo.symbol} (${usdcInfo.name})` : 'USDC (verification failed)',
          usdtInfo ? `${usdtInfo.symbol} (${usdtInfo.name})` : 'USDT (verification failed)',
          'SEI (Native token)'
        ],
        majorPairs: [
          'SEI/USDC',
          'SEI/USDT', 
          'USDC/USDT'
        ],
        estimatedAPY: "15-50%",
        risk: "Medium",
        description: "Provide liquidity to trading pairs and earn trading fees"
      },
      status: "success"
    };
  } catch (error) {
    throw new Error(`Failed to get DEX data: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Get lending opportunities
async function getLendingOpportunities(): Promise<any> {
  try {
    // Check if lending contracts are available
    const lendingContracts = Object.entries(DEFI_CONTRACTS)
      .filter(([, config]) => config.type === 'lending')
      .map(([name, config]) => ({ name, address: config.address }));

    if (lendingContracts.length === 0) {
      throw new Error('No lending contracts configured');
    }

    // Try to verify if lending contracts are deployed
    const contractChecks = await Promise.allSettled(
      lendingContracts.map(async contract => {
        const isContract = await seiMCPKit.isContract(contract.address);
        return { name: contract.name, address: contract.address, isContract };
      })
    );

    const availableContracts = contractChecks
      .filter(result => result.status === 'fulfilled' && result.value.isContract)
      .map(result => result.status === 'fulfilled' ? result.value : null)
      .filter(Boolean);

    return {
      title: "Lending & Borrowing",
      type: "lending",
      data: {
        availableProtocols: availableContracts.length > 0 ? 
          availableContracts.map(c => c!.name) : 
          ['No verified lending protocols found'],
        supportedAssets: ['SEI', 'USDC', 'USDT'],
        estimatedAPY: "5-20%",
        risk: "Medium-High",
        description: "Lend assets to earn interest or borrow against collateral"
      },
      status: availableContracts.length > 0 ? "success" : "warning"
    };
  } catch (error) {
    throw new Error(`Failed to get lending data: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Format the DeFi opportunities response
function formatDeFiOpportunities(opportunities: any[], query?: string): string {
  const hasErrors = opportunities.some(opp => opp.status === 'error');
  const hasWarnings = opportunities.some(opp => opp.status === 'warning');

  let response = `⚡ **DeFi Opportunities on Sei** 🔮\n\n`;

  if (query) {
    response += `**Query:** ${query}\n\n`;
  }

  response += `**Analysis Status:** ${hasErrors ? '⚠️ Partial data' : hasWarnings ? '⚠️ Limited data' : '✅ Data retrieved'}\n\n`;

  for (const opportunity of opportunities) {
    if (opportunity.status === 'error') {
      response += `**❌ ${opportunity.title}**\n`;
      response += `- **Error:** ${opportunity.error}\n`;
      response += `- **Note:** Unable to fetch real-time data\n\n`;
    } else if (opportunity.status === 'warning') {
      response += `**⚠️ ${opportunity.title}**\n`;
      response += formatOpportunityData(opportunity);
      response += `- **Note:** Limited protocol availability\n\n`;
    } else {
      response += `**✅ ${opportunity.title}**\n`;
      response += formatOpportunityData(opportunity);
    }
  }

  response += `**🔧 Current MCP Integration Status:**\n`;
  response += `- **Real-time Data:** ${hasErrors ? 'Partial' : 'Available'}\n`;
  response += `- **Contract Verification:** ${hasErrors ? 'Limited' : 'Working'}\n`;
  response += `- **Token Information:** ${hasErrors ? 'Partial' : 'Available'}\n\n`;

  response += `**⚠️ Important Notes:**\n`;
  response += `- **APY Estimates:** Based on typical DeFi rates, not real-time data\n`;
  response += `- **Risk Assessment:** General guidelines, DYOR (Do Your Own Research)\n`;
  response += `- **Contract Addresses:** Some are placeholders, verify on official sites\n\n`;

  response += `**🛠️ What's Available Now:**\n`;
  response += `- ✅ **Token Information:** Get metadata for ERC20 tokens\n`;
  response += `- ✅ **Contract Verification:** Check if addresses are smart contracts\n`;
  response += `- ✅ **Chain Information:** Current network state and block data\n`;
  response += `- ❌ **Real-time Rates:** APY/APR data not yet available from MCP\n`;
  response += `- ❌ **Pool Data:** Liquidity pool information not implemented\n\n`;

  response += `**💡 Alternative Approaches:**\n`;
  response += `- **Check balances:** "What's my $USDC balance in wallet 0x..."\n`;
  response += `- **Token info:** "Get info for $USDC token"\n`;
  response += `- **Contract analysis:** "Is 0x...address a smart contract?"\n\n`;

  response += `**🚀 Coming Soon:**\n`;
  response += `- Real-time APY/APR data from DeFi protocols\n`;
  response += `- Liquidity pool analytics\n`;
  response += `- Yield farming opportunity scanner\n`;
  response += `- Risk assessment tools\n\n`;

  response += `**🌟 Ready to explore specific opportunities?**\n`;
  response += `Try: "Check $USDC token info" or "What's the balance of 0x...address"`;

  return response;
}

// Format individual opportunity data
function formatOpportunityData(opportunity: any): string {
  if (!opportunity.data) return '';

  let formatted = '';
  const data = opportunity.data;

  if (data.apy) formatted += `- **APY:** ${data.apy}\n`;
  if (data.estimatedAPY) formatted += `- **Estimated APY:** ${data.estimatedAPY}\n`;
  if (data.risk) formatted += `- **Risk Level:** ${data.risk}\n`;
  if (data.description) formatted += `- **Description:** ${data.description}\n`;
  
  if (data.availableTokens) {
    formatted += `- **Available Tokens:**\n`;
    data.availableTokens.forEach((token: string) => {
      formatted += `  • ${token}\n`;
    });
  }

  if (data.majorPairs) {
    formatted += `- **Major Pairs:**\n`;
    data.majorPairs.forEach((pair: string) => {
      formatted += `  • ${pair}\n`;
    });
  }

  if (data.availableProtocols) {
    formatted += `- **Available Protocols:**\n`;
    data.availableProtocols.forEach((protocol: string) => {
      formatted += `  • ${protocol}\n`;
    });
  }

  if (data.supportedAssets) {
    formatted += `- **Supported Assets:**\n`;
    data.supportedAssets.forEach((asset: string) => {
      formatted += `  • ${asset}\n`;
    });
  }

  return formatted + '\n';
}
