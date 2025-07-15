// Real Sei MCP Client Implementation
// Connects to @sei-js/mcp-server for live blockchain data

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { createMCPConfig, MCPClientConfig, DEFAULT_CONFIG } from './config';
import { z } from 'zod';

// Re-export interfaces for compatibility
export interface SeiMCPConfig {
  network: 'mainnet' | 'testnet';
  rpcUrl?: string;
  apiKey?: string;
}

export interface Transaction {
  hash: string;
  block: number;
  timestamp: string;
  from: string;
  to: string;
  value: string;
  gas: string;
  gasPrice: string;
  type: string;
  status: 'success' | 'failed';
  events?: any[];
}

export interface WalletBalance {
  address: string;
  balance: string;
  tokens: Array<{
    symbol: string;
    amount: string;
    value: string;
    decimals: number;
  }>;
}

export interface TokenFlow {
  token: string;
  dex: string;
  period: string;
  inflows: string;
  outflows: string;
  netFlow: string;
  transactions: Array<{
    hash: string;
    type: 'buy' | 'sell';
    amount: string;
    price: string;
    timestamp: string;
  }>;
}

export interface NFTHistory {
  collection: string;
  tokenId: string;
  currentOwner: string;
  transfers: Array<{
    from: string;
    to: string;
    price?: string;
    timestamp: string;
    hash: string;
  }>;
}

// Error classes for better error handling
export class MCPConnectionError extends Error {
  constructor(message: string, public readonly cause?: Error) {
    super(message);
    this.name = 'MCPConnectionError';
  }
}

export class MCPRequestError extends Error {
  constructor(message: string, public readonly statusCode?: number) {
    super(message);
    this.name = 'MCPRequestError';
  }
}

export class MCPTimeoutError extends Error {
  constructor(message: string = 'MCP request timed out') {
    super(message);
    this.name = 'MCPTimeoutError';
  }
}

// HTTP Transport for server-side MCP communication
class HTTPMCPTransport {
  private serverUrl: string;
  private sessionId: string | null = null;
  private debug: boolean;

  constructor(serverUrl: string, debug: boolean = false) {
    this.serverUrl = serverUrl;
    this.debug = debug;
  }

  async connect(): Promise<void> {
    if (this.debug) {
      console.log(`[MCP] 🔗 Attempting HTTP connection to ${this.serverUrl}`);
    }

    try {
      // Check server health first
      const healthResponse = await fetch(`${this.serverUrl}/health`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!healthResponse.ok) {
        throw new Error(`Health check failed: ${healthResponse.status} ${healthResponse.statusText}`);
      }

      const healthData = await healthResponse.json();
      if (this.debug) {
        console.log(`[MCP] ✅ Server health check passed:`, healthData);
      }

      // For HTTP transport, we'll simulate a session ID
      this.sessionId = `http-session-${Date.now()}`;
      
      if (this.debug) {
        console.log(`[MCP] 🎯 HTTP MCP connection established with session: ${this.sessionId}`);
      }
    } catch (error) {
      if (this.debug) {
        console.error(`[MCP] ❌ HTTP connection failed:`, error);
      }
      throw new MCPConnectionError(`Failed to connect to MCP server at ${this.serverUrl}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async request(method: string, params: any = {}): Promise<any> {
    if (!this.sessionId) {
      throw new MCPConnectionError('Not connected to MCP server');
    }

    if (this.debug) {
      console.log(`[MCP] 📨 Making HTTP request: ${method} with params:`, params);
    }

    try {
      const id = Math.random().toString(36).substring(2, 15);
      const payload = {
        jsonrpc: '2.0',
        id,
        method,
        params
      };

      const response = await fetch(`${this.serverUrl}/api/mcp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-ID': this.sessionId
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        if (this.debug) {
          console.error(`[MCP] ❌ HTTP request failed: ${response.status} ${response.statusText}`);
        }
        throw new MCPRequestError(`MCP server request failed: ${response.status} ${response.statusText}`, response.status);
      }

      const result = await response.json();
      
      if (this.debug) {
        console.log(`[MCP] 📥 HTTP response received:`, result);
      }

      if (result.error) {
        throw new MCPRequestError(result.error.message || 'MCP request error');
      }

      return result.result;
    } catch (error) {
      if (this.debug) {
        console.error(`[MCP] ❌ HTTP request error:`, error);
      }
      
      if (error instanceof MCPRequestError) {
        throw error;
      }
      
      throw new MCPRequestError(`MCP request failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async close(): Promise<void> {
    if (this.debug) {
      console.log(`[MCP] 🔌 Closing HTTP MCP connection`);
    }
    this.sessionId = null;
  }
}

// Rate limiter for MCP requests
class RateLimiter {
  private requests: number[] = [];
  private maxRequests: number;
  private windowMs: number;

  constructor(maxRequests: number, windowMs: number = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  canMakeRequest(): boolean {
    const now = Date.now();
    this.requests = this.requests.filter(time => now - time < this.windowMs);
    return this.requests.length < this.maxRequests;
  }

  recordRequest(): void {
    this.requests.push(Date.now());
  }
}

export class SeiMCPClient {
  private transport: HTTPMCPTransport | null = null;
  private config: MCPClientConfig;
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private rateLimiter: RateLimiter;
  private connecting: Promise<void> | null = null;
  private connected: boolean = false;

  constructor(config?: Partial<MCPClientConfig>) {
    this.config = { ...createMCPConfig(), ...config };
    this.rateLimiter = new RateLimiter(
      this.config.rateLimit.maxRequestsPerMinute,
      60000 // 1 minute window
    );

    if (this.config.debug) {
      console.log('[MCP] 🚀 Initializing SeiMCPClient with config:', {
        serverUrl: this.config.server.url,
        network: this.config.network.network,
        debug: this.config.debug
      });
    }
  }

  private async ensureConnected(): Promise<void> {
    if (this.connected && this.transport) {
      if (this.config.debug) {
        console.log('[MCP] ✅ Already connected to MCP server');
      }
      return;
    }

    if (this.connecting) {
      if (this.config.debug) {
        console.log('[MCP] ⏳ Connection in progress, waiting...');
      }
      await this.connecting;
      return;
    }

    this.connecting = this.connect();
    await this.connecting;
    this.connecting = null;
  }

  private async connect(): Promise<void> {
    if (this.config.debug) {
      console.log(`[MCP] 🔄 Attempting to connect to MCP server at ${this.config.server.url}`);
    }

    try {
      // Create HTTP transport and connect
      this.transport = new HTTPMCPTransport(this.config.server.url, this.config.debug);
      await this.transport.connect();
      this.connected = true;
      
      if (this.config.debug) {
        console.log('[MCP] 🎉 Successfully connected to MCP server!');
      }
    } catch (error) {
      this.transport = null;
      this.connected = false;

      if (this.config.debug) {
        console.error('[MCP] ❌ MCP connection failed:', error instanceof Error ? error.message : error);
      }
      
      // No fallback - throw the error to be displayed in chat
      throw error;
    }
  }

  private async disconnect(): Promise<void> {
    if (this.transport) {
      try {
        await this.transport.close();
        this.transport = null;
        this.connected = false;
        if (this.config.debug) {
          console.log('[MCP] 🔌 Disconnected from MCP server');
        }
      } catch (error) {
        console.warn('[MCP] ⚠️ Error during disconnect:', error);
      }
    }
  }

  // Cache management
  private getCachedData<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    const isExpired = Date.now() - cached.timestamp > this.config.rateLimit.cacheTTL;
    if (isExpired) {
      this.cache.delete(key);
      return null;
    }

    return cached.data as T;
  }

  private setCachedData(key: string, data: any): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  clearCache(key?: string): void {
    if (key) {
      this.cache.delete(key);
    } else {
      this.cache.clear();
    }
  }

  // MCP request wrapper with caching and rate limiting
  private async makeRequest<T>(
    operation: string,
    params: any,
    cacheKey?: string
  ): Promise<T> {
    if (this.config.debug) {
      console.log(`[MCP] 🔍 Request: ${operation} with params:`, params);
    }

    // Check cache first
    if (cacheKey) {
      const cached = this.getCachedData<T>(cacheKey);
      if (cached) {
        if (this.config.debug) {
          console.log(`[MCP] 💾 Cache hit for ${cacheKey}`);
        }
        return cached;
      }
    }

    // Rate limiting
    if (!this.rateLimiter.canMakeRequest()) {
      if (this.config.debug) {
        console.warn(`[MCP] ⏸️ Rate limit exceeded for ${operation}`);
      }
      throw new MCPRequestError('Rate limit exceeded. Please try again later.');
    }

    this.rateLimiter.recordRequest();

    // Ensure connection
    await this.ensureConnected();

    // Make MCP request
    if (!this.connected || !this.transport) {
      throw new MCPConnectionError('Failed to establish MCP server connection');
    }

      try {
        if (this.config.debug) {
        console.log(`[MCP] 🚀 Using MCP server for ${operation}`);
      }

      // Use the operation name directly (it's already the correct MCP method name)
      const result = await this.transport.request(operation, params);
      
      if (this.config.debug) {
        console.log(`[MCP] ✅ MCP request ${operation} successful`);
      }

        // Cache the result
        if (cacheKey) {
          this.setCachedData(cacheKey, result);
        }

        return result;
      } catch (error) {
    if (this.config.debug) {
        console.error(`[MCP] ❌ MCP request ${operation} failed:`, error instanceof Error ? error.message : error);
      }
      
      // No fallback - rethrow the error to be displayed in chat
      throw error;
    }
  }

  // Utility formatting methods
  formatAddress(address: string): string {
    if (!address || address.length <= 12) return address || 'Unknown';
    return `${address.slice(0, 6)}...${address.slice(-6)}`;
  }

  formatAmount(amount: string, decimals: number = 6): string {
    const num = parseFloat(amount);
    if (isNaN(num)) return '0';
    
    // Handle large amounts with abbreviations
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(2)}M`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(2)}K`;
    }
    
    // Handle small amounts with appropriate precision
    if (num < 0.01) {
      return num.toFixed(6);
    } else if (num < 1) {
      return num.toFixed(4);
    } else {
      return num.toFixed(2);
    }
  }

  formatSEI(amount: string): string {
    const num = parseFloat(amount);
    // Use more decimal places for small amounts
    if (num < 0.01) {
      return `${num.toFixed(6)} SEI`;
    } else if (num < 1) {
      return `${num.toFixed(4)} SEI`;
    } else {
      return `${num.toFixed(2)} SEI`;
    }
  }

  formatUSD(amount: string): string {
    const num = parseFloat(amount);
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(num);
  }

  // Public API methods - Using correct MCP tool names (underscored as per actual HTTP server implementation)
  // Blockchain analysis methods
  async getWalletBalance(address: string, network: string = 'sei'): Promise<any> {
    return this.makeRequest('get_balance', { address, network });
  }

  async getChainInfo(network: string = 'sei'): Promise<any> {
    return this.makeRequest('get_chain_info', { network });
  }

  async getERC20Balance(tokenAddress: string, address: string, network: string = 'sei'): Promise<any> {
    return this.makeRequest('get_erc20_balance', { tokenAddress, address, network });
  }

  async getLatestBlock(network: string = 'sei'): Promise<any> {
    return this.makeRequest('get_latest_block', { network });
  }

  async getBlockByNumber(blockNumber: number, network: string = 'sei'): Promise<any> {
    return this.makeRequest('get_block_by_number', { blockNumber, network });
  }

  async getERC20TokenInfo(tokenAddress: string, network: string = 'sei'): Promise<any> {
    return this.makeRequest('get_token_info', { tokenAddress, network });
  }

  async getERC721TokenMetadata(tokenAddress: string, tokenId: string, network: string = 'sei'): Promise<any> {
    return this.makeRequest('get_nft_info', { tokenAddress, tokenId, network });
  }

  async getERC1155TokenURI(tokenAddress: string, tokenId: string, network: string = 'sei'): Promise<any> {
    return this.makeRequest('get_erc1155_token_uri', { tokenAddress, tokenId, network });
  }

  async getSupportedNetworks(): Promise<any> {
    return this.makeRequest('get_supported_networks', {});
  }

  // Additional MCP tools
  async readContract(contractAddress: string, abi: any[], functionName: string, args: any[] = [], network: string = 'sei'): Promise<any> {
    return this.makeRequest('read_contract', { contractAddress, abi, functionName, args, network });
  }

  async getTransaction(txHash: string, network: string = 'sei'): Promise<any> {
    return this.makeRequest('get_transaction', { txHash, network });
  }

  async isContract(address: string, network: string = 'sei'): Promise<any> {
    return this.makeRequest('is_contract', { address, network });
  }

  async checkNFTOwnership(tokenAddress: string, tokenId: string, ownerAddress: string, network: string = 'sei'): Promise<any> {
    return this.makeRequest('check_nft_ownership', { tokenAddress, tokenId, ownerAddress, network });
  }

  async getNFTBalance(tokenAddress: string, ownerAddress: string, network: string = 'sei'): Promise<any> {
    return this.makeRequest('get_nft_balance', { tokenAddress, ownerAddress, network });
  }

  async getERC1155Balance(tokenAddress: string, tokenId: string, ownerAddress: string, network: string = 'sei'): Promise<any> {
    return this.makeRequest('get_erc1155_balance', { tokenAddress, tokenId, ownerAddress, network });
  }

  // Additional MCP tools that were missing
  async getTransactionReceipt(txHash: string, network: string = 'sei'): Promise<any> {
    return this.makeRequest('get_transaction_receipt', { txHash, network });
  }

  async estimateGas(to: string, data?: string, value?: string, network: string = 'sei'): Promise<any> {
    return this.makeRequest('estimate_gas', { to, data, value, network });
  }

  async getTokenBalance(tokenAddress: string, address: string, network: string = 'sei'): Promise<any> {
    return this.makeRequest('get_token_balance', { tokenAddress, address, network });
  }

  async getTokenBalanceERC20(tokenAddress: string, address: string, network: string = 'sei'): Promise<any> {
    return this.makeRequest('get_token_balance_erc20', { tokenAddress, address, network });
  }

  async getAddressFromPrivateKey(privateKey: string): Promise<any> {
    return this.makeRequest('get_address_from_private_key', { privateKey });
  }

  // TRANSFER FUNCTIONS - These require private key to be set in MCP server environment
  async transferSei(to: string, amount: string, network: string = 'sei'): Promise<any> {
    return this.makeRequest('transfer_sei', { to, amount, network });
  }

  async transferERC20(tokenAddress: string, to: string, amount: string, network: string = 'sei'): Promise<any> {
    return this.makeRequest('transfer_erc20', { tokenAddress, to, amount, network });
  }

  async transferNFT(tokenAddress: string, to: string, tokenId: string, network: string = 'sei'): Promise<any> {
    return this.makeRequest('transfer_nft', { tokenAddress, to, tokenId, network });
  }

  async transferERC1155(tokenAddress: string, to: string, tokenId: string, amount: string, network: string = 'sei'): Promise<any> {
    return this.makeRequest('transfer_erc1155', { tokenAddress, to, tokenId, amount, network });
  }

  async transferToken(tokenAddress: string, to: string, amount: string, network: string = 'sei'): Promise<any> {
    return this.makeRequest('transfer_token', { tokenAddress, to, amount, network });
  }

  async approveTokenSpending(tokenAddress: string, spender: string, amount: string, network: string = 'sei'): Promise<any> {
    return this.makeRequest('approve_token_spending', { tokenAddress, spender, amount, network });
  }

  async writeContract(contractAddress: string, abi: any[], functionName: string, args: any[] = [], value?: string, network: string = 'sei'): Promise<any> {
    return this.makeRequest('write_contract', { contractAddress, abi, functionName, args, value, network });
  }

  // Enhanced methods - these are not directly supported by the official MCP server
  async getWalletTransactions(address: string, timeframe: string = 'day'): Promise<any> {
    throw new Error('Wallet transaction history is not yet implemented in the official Sei MCP server. Use get_transaction for specific transaction details.');
  }

  async getTokenFlows(token: string, dex: string, period: string): Promise<any> {
    throw new Error('Token flow analysis is not yet implemented in the official Sei MCP server. Use get_erc20_token_info for token metadata and read_contract for DEX data.');
  }

  async getNFTHistory(collection: string, tokenId: string): Promise<any> {
    throw new Error('NFT history is not yet implemented in the official Sei MCP server. Use get_erc721_token_metadata and check_nft_ownership for NFT data.');
  }

  async getTransactionDetails(hash: string): Promise<any> {
    return this.getTransaction(hash);
  }

  // Cleanup
  async close(): Promise<void> {
    await this.disconnect();
    this.clearCache();
  }
}

// Query parser utility class
export class QueryParser {
  static extractWalletAddress(query: string): string | null {
    // Check for sei1 addresses first
    const seiMatch = query.match(/sei1[a-z0-9]{38,58}/);
    if (seiMatch) {
      return seiMatch[0];
    }
    
    // Check for 0x addresses
    const evmMatch = query.match(/0x[a-fA-F0-9]{40}/);
    if (evmMatch) {
      return evmMatch[0];
    }
    
    return null;
  }

  static extractTokenSymbol(query: string): string | null {
    // First check for $ prefix
    const dollarMatch = query.match(/\$([A-Z]{2,10})/i);
    if (dollarMatch) {
      return dollarMatch[1].toUpperCase();
    }
    
    // Check for common tokens without $ prefix
    const queryLower = query.toLowerCase();
    const commonTokens = ['usdc', 'weth', 'sei', 'wbtc', 'usdt', 'dai', 'atom', 'osmo'];
    
    for (const token of commonTokens) {
      if (queryLower.includes(token)) {
        return token.toUpperCase();
      }
    }
    
    // Fallback to general pattern
    const match = query.match(/\b([A-Z]{2,10})\b/);
    return match ? match[1] : null;
  }

  static extractTransactionHash(query: string): string | null {
    const match = query.match(/0x[a-fA-F0-9]{64}|[a-fA-F0-9]{64}/);
    return match ? match[0] : null;
  }

  static extractTimeframe(query: string): string {
    const timeframes = {
      'hour': ['hour', 'hr', '1h'],
      'day': ['day', 'daily', '24h', '1d'],
      'week': ['week', 'weekly', '7d', '1w'],
      'month': ['month', 'monthly', '30d', '1m']
    };

    const queryLower = query.toLowerCase();
    
    for (const [period, keywords] of Object.entries(timeframes)) {
      if (keywords.some(keyword => queryLower.includes(keyword))) {
        return period;
      }
    }
    
    return 'day'; // default
  }

  static extractDEX(query: string): string | null {
    const dexes = ['dragonswap', 'astroport', 'fin', 'white whale', 'wyndex'];
    const queryLower = query.toLowerCase();
    
    for (const dex of dexes) {
      if (queryLower.includes(dex)) {
        return dex;
      }
    }
    
    return null;
  }

  static extractNFTCollection(query: string): { collection: string; tokenId: string } | null {
    const collectionMatch = query.match(/([a-zA-Z\s]+)\s*#(\d+)/);
    if (collectionMatch) {
      return {
        collection: collectionMatch[1].trim(),
        tokenId: collectionMatch[2]
      };
    }
    return null;
  }

  static classifyIntent(query: string): string {
    const queryLower = query.toLowerCase();
    
    if (queryLower.includes('wallet') || queryLower.includes('balance') || queryLower.includes('holdings')) {
      return 'wallet_analysis';
    }
    
    // Enhanced token flow detection
    if (queryLower.includes('token') && (queryLower.includes('flow') || queryLower.includes('trading') || queryLower.includes('movements'))) {
      return 'token_flow';
    }
    
    // Check for token symbols with flow-related keywords
    if ((queryLower.includes('flow') || queryLower.includes('movements') || queryLower.includes('inflow') || queryLower.includes('outflow')) && 
        (queryLower.includes('usdc') || queryLower.includes('sei') || queryLower.includes('weth') || queryLower.includes('$'))) {
      return 'token_flow';
    }
    
    // Check for DEX-related queries with token mentions
    if ((queryLower.includes('dragonswap') || queryLower.includes('astroport') || queryLower.includes('dex')) && 
        (queryLower.includes('usdc') || queryLower.includes('sei') || queryLower.includes('weth') || queryLower.includes('$'))) {
      return 'token_flow';
    }
    
    if (queryLower.includes('nft') || queryLower.includes('collection') || queryLower.includes('#')) {
      return 'nft_history';
    }
    
    if (queryLower.includes('transaction') || queryLower.includes('tx') || queryLower.includes('0x')) {
      return 'transaction_explain';
    }
    
    return 'general';
  }
}

// Default export
export default SeiMCPClient; 