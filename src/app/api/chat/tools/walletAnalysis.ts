import { tool } from "ai";
import { z } from "zod";
import SeiMCPClient, { QueryParser } from "@/lib/sei-mcp-client";

// Create MCP client instance
const seiMCPKit = new SeiMCPClient();

export const walletAnalysis = tool({
  description: "Analyze wallet behavior and token holdings with detailed insights about trading patterns, holdings, and performance metrics",
  parameters: z.object({
    query: z.string().describe("Natural language query about wallet analysis (e.g., 'What has wallet sei1...xyz been doing with $SEIYAN token this week?')")
  }),
  execute: async ({ query }) => {
    try {
      // Parse the query for wallet address, token, and timeframe
      const walletAddress = QueryParser.extractWalletAddress(query);
      const tokenSymbol = QueryParser.extractTokenSymbol(query);
      const timeframe = QueryParser.extractTimeframe(query);

      if (!walletAddress) {
        return `🔮 **Wallet Analysis - Missing Address** ✨

I need a wallet address to perform the analysis! 

**💡 For Better Experience:**
- Click the **"Set Wallet"** button in the chat interface (top-right)
- Set your wallet once and I'll automatically use it in all wallet queries
- No need to paste your address every time!

**Manual Options:**
**Supported formats:**
- Sei bech32: sei1abc...def123
- EVM format: 0xE3F347...8795

**Example queries:**
- "Analyze wallet sei1abc...def123"
- "Analyze wallet 0xE3F347...8795"
- "What has wallet sei1xyz...789 been trading?"
- "Show me holdings for 0x1234...5678"

**🎯 Pro Tip:** Use the "Set Wallet" feature to save time and get instant wallet analysis by just saying "analyze my wallet" or "check wallet balance"!`;
      }

      // Get wallet data with enhanced transaction analysis
      let balanceResponse, transactions;
      try {
        [balanceResponse, transactions] = await Promise.all([
          seiMCPKit.getWalletBalance(walletAddress),
          seiMCPKit.getWalletTransactions(walletAddress, timeframe).catch(error => {
            console.warn('Transaction data unavailable:', error.message);
            return null; // Return null instead of throwing
          })
        ]);
      } catch (error) {
        console.error('Failed to get wallet data:', error);
        return `🔮 **Analysis Error** ✨

Failed to fetch wallet data: ${error instanceof Error ? error.message : 'Unknown error'}

This could be due to:
- Invalid wallet address format
- Network connectivity issues  
- Blockchain data unavailability

Please try again with a valid wallet address:
- Sei bech32: sei1abc...def123
- EVM format: 0xE3F347...8795 🌟`;
      }

      // Handle the actual MCP response format: {wei: "0", ether: "0"} 
      const actualBalance = balanceResponse as any; // Type cast to handle MCP response format
      const seiBalance = actualBalance.ether || actualBalance.sei || '0'; // Check both formats
      const weiBalance = actualBalance.wei || '0';
      
      // Create tokens array from the basic balance data
      const tokens = [
        {
          symbol: 'SEI',
          amount: seiBalance,
          value: seiBalance, // Keep as SEI value, not USD
          decimals: 18
        }
      ];

      // Calculate asset metrics
      const totalValue = parseFloat(seiBalance);
      const seiPercentage = 100; // Since we only have SEI balance for now

      // Handle transaction analysis - no fallback to simulated data
      const activityLevel = transactions?.length || 0;
      const recentTransactions = transactions?.slice(0, 3) || [];
      
      // Calculate transaction metrics
      let totalGasSpent = 0;
      let swapCount = 0;
      let transferCount = 0;
      let transactionAnalysis = "";
      
      if (transactions && transactions.length > 0) {
        transactions.forEach((tx: any) => {
          // Fix gas calculation - convert properly from wei to SEI
          const gasUsed = parseFloat(tx.gas || '0');
          const gasPriceWei = parseFloat(tx.gasPrice || '0');
          totalGasSpent += (gasUsed * gasPriceWei) / 1000000000000000000; // Convert wei to SEI
          if (tx.type === 'token_swap') swapCount++;
          if (tx.type === 'token_transfer') transferCount++;
        });
        
        transactionAnalysis = `**💰 Transaction Metrics:**
- **Total Transactions:** ${activityLevel}
- **Swaps:** ${swapCount}
- **Transfers:** ${transferCount}
- **Gas Spent:** ${totalGasSpent.toFixed(6)} SEI`;
      } else {
        transactionAnalysis = `**💰 Transaction Analysis:**
- **Status:** Transaction history not available from MCP server
- **Reason:** ${transactions === null ? 'Feature not yet implemented in official Sei MCP server' : 'No transactions found'}
- **Available:** Balance data only`;
      }

      // Analyze specific token if requested
      let tokenAnalysis = "";
      if (tokenSymbol) {
        const tokenTxs = transactions?.filter((tx: any) => 
          tx.events?.some((event: any) => 
            event.token === tokenSymbol || 
            event.token_in === tokenSymbol || 
            event.token_out === tokenSymbol
          )
        ) || [];

          tokenAnalysis = `

**🎯 ${tokenSymbol} Token Analysis:**
- **Current Holdings:** ${tokenSymbol === 'SEI' ? seiMCPKit.formatSEI(seiBalance) : '0 ' + tokenSymbol}
- **Activity (${timeframe}):** ${tokenTxs.length} transactions
- **Behavior:** ${tokenTxs.length > 0 ? 'Active trader 🔄' : 'HODL mode 💎'}`;
      }

      // Generate activity timeline - no simulated data
      const activities = recentTransactions.length > 0 ? 
        recentTransactions.map((tx: any) => {
        const date = new Date(tx.timestamp).toLocaleDateString();
          let action = "Transaction";
        
        if (tx.type === 'token_swap') {
          const swapEvent = tx.events?.find((e: any) => e.type === 'swap');
          if (swapEvent) {
            action = `Swapped ${seiMCPKit.formatAmount(swapEvent.amount_in)} ${swapEvent.token_in} → ${seiMCPKit.formatAmount(swapEvent.amount_out)} ${swapEvent.token_out}`;
            } else {
              action = 'Token swap';
          }
        } else if (tx.type === 'token_transfer') {
            action = `Transferred ${seiMCPKit.formatAmount(tx.value)} tokens`;
        }

        return `• **${date}:** ${action}`;
        }).join('\n') : 
        (transactions === null ? 
          "• **Transaction history:** Not available from official Sei MCP server yet" : 
          "• **No recent activity** in this timeframe");

      return `🔮 **Wallet Analysis Complete!** ✨

      **📊 Asset Overview:**
- **Wallet:** ${seiMCPKit.formatAddress(walletAddress)}
- **Total Balance:** ${seiMCPKit.formatSEI(totalValue.toString())}
- **SEI Allocation:** ${seiPercentage.toFixed(1)}% (${seiMCPKit.formatSEI(seiBalance)})
- **Token Diversity:** ${tokens.length} different token${tokens.length > 1 ? 's' : ''}
- **Activity Level:** ${activityLevel} transactions in last ${timeframe}

**⚡ Token Breakdown:**
${tokens.map(token => 
  `• **${token.symbol}:** ${seiMCPKit.formatSEI(token.amount)}`
).join('\n')}
${tokenAnalysis}

**📈 Recent Activity (${timeframe}):**
${activities}

${transactionAnalysis}

**🎭 Analysis Insights:**
- **Balance Status:** ${parseFloat(seiBalance) > 0 ? 'Active wallet with SEI tokens' : 'Empty or very low balance'}
- **Wallet Type:** ${parseFloat(seiBalance) > 100 ? 'High value holder 💎' : parseFloat(seiBalance) > 1 ? 'Regular user 📱' : 'New or inactive wallet 🌱'}
- **Trading Style:** ${swapCount > transferCount ? 'Active trader 🔄' : transferCount > 0 ? 'Transfer focused 📤' : 'Transaction data not available 📊'}
- **MCP Integration:** Live balance data via official Sei MCP server ✅

**💡 Current Capabilities:**
${activityLevel === 0 ? 
  'Transaction history not available from MCP server yet 🌱' :
  activityLevel > 10 ? 
  'High-frequency user detected - very active on Sei network 🚀' :
  'Moderate activity - balanced usage pattern ⚖️'
}

**⚠️ MCP Server Limitations:**
${transactions === null ? 
  '- **Transaction History:** Not yet implemented in official Sei MCP server\n- **Available:** Balance data, token info, contract verification\n- **Coming Soon:** Full transaction analysis and history tracking' :
  '- **Full Analysis:** Transaction details available\n- **Advanced Features:** Flow analysis and behavioral patterns'
}`;

    } catch (error) {
      console.error('Wallet analysis error:', error);
      return `🔮 **Analysis Spell Failed** ✨

Something went wrong during the wallet analysis: ${error instanceof Error ? error.message : 'Unknown error'}

This could be due to:
- Invalid wallet address format
- Network connectivity issues
- Temporary blockchain query limitations

Please try again with a valid wallet address:
- Sei bech32: sei1abc...def123  
- EVM format: 0xE3F347...8795 ��`;
    }
  },
});
