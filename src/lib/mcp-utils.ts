// MCP Utilities for Sei Blockchain Integration
// Helper functions for client management, validation, and data processing

import SeiMCPClient, { MCPConnectionError, MCPRequestError, MCPTimeoutError } from './sei-mcp-client';

// Create a shared instance for utility functions
const seiMCPClient = new SeiMCPClient();

// Validation utilities
export class ValidationUtils {
  /**
   * Validates a Sei wallet address
   */
  static isValidSeiAddress(address: string): boolean {
    return /^sei1[a-z0-9]{38,}$/.test(address);
  }

  /**
   * Validates a transaction hash
   */
  static isValidTransactionHash(hash: string): boolean {
    return /^0x[a-fA-F0-9]{64}$/.test(hash);
  }

  /**
   * Validates a token symbol
   */
  static isValidTokenSymbol(symbol: string): boolean {
    return /^[A-Z]{2,10}$/.test(symbol);
  }

  /**
   * Normalizes a token symbol (removes $ prefix if present)
   */
  static normalizeTokenSymbol(symbol: string): string {
    return symbol.startsWith('$') ? symbol.slice(1).toUpperCase() : symbol.toUpperCase();
  }

  /**
   * Validates and normalizes a DEX name
   */
  static normalizeDEXName(dex: string): string {
    const knownDEXes: { [key: string]: string } = {
      'dragonswap': 'DragonSwap',
      'astroport': 'Astroport',
      'terraswap': 'TerraSwap',
      'loop': 'Loop',
      'whitewhale': 'White Whale'
    };

    const lowerDex = dex.toLowerCase();
    return knownDEXes[lowerDex] || dex;
  }
}

// Data formatting utilities
export class FormatUtils {
  /**
   * Formats large numbers with appropriate suffixes
   */
  static formatLargeNumber(value: number | string): string {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    
    if (num >= 1e9) {
      return `${(num / 1e9).toFixed(2)}B`;
    } else if (num >= 1e6) {
      return `${(num / 1e6).toFixed(2)}M`;
    } else if (num >= 1e3) {
      return `${(num / 1e3).toFixed(2)}K`;
    }
    
    return num.toFixed(2);
  }

  /**
   * Formats time duration in human readable format
   */
  static formatDuration(milliseconds: number): string {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days} day${days !== 1 ? 's' : ''}`;
    } else if (hours > 0) {
      return `${hours} hour${hours !== 1 ? 's' : ''}`;
    } else if (minutes > 0) {
      return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
    } else {
      return `${seconds} second${seconds !== 1 ? 's' : ''}`;
    }
  }

  /**
   * Formats percentage with appropriate precision
   */
  static formatPercentage(value: number, precision: number = 2): string {
    return `${value.toFixed(precision)}%`;
  }

  /**
   * Formats a timestamp to relative time (e.g., "2 hours ago")
   */
  static formatRelativeTime(timestamp: string): string {
    const now = new Date();
    const time = new Date(timestamp);
    const diffMs = now.getTime() - time.getTime();

    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays > 0) {
      return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    } else if (diffHours > 0) {
      return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    } else if (diffMinutes > 0) {
      return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`;
    } else {
      return 'Just now';
    }
  }
}

// Health check utilities
export class HealthCheckUtils {
  /**
   * Performs a basic health check on the MCP client
   */
  static async performHealthCheck(): Promise<{
    healthy: boolean;
    latency?: number;
    error?: string;
  }> {
    const startTime = Date.now();
    
    try {
      // Try a simple operation to test connectivity
      await seiMCPClient.getWalletBalance('sei1test000000000000000000000000000000000');
      
      const latency = Date.now() - startTime;
      return {
        healthy: true,
        latency
      };
    } catch (error) {
      return {
        healthy: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Checks if the MCP service is responsive
   */
  static async isServiceResponsive(): Promise<boolean> {
    try {
      const healthCheck = await this.performHealthCheck();
      return healthCheck.healthy && (healthCheck.latency || 0) < 10000; // 10 second timeout
    } catch {
      return false;
    }
  }
}

// Cache management utilities
export class CacheUtils {
  /**
   * Generates a cache key for wallet-related queries
   */
  static generateWalletCacheKey(address: string, operation: string, ...params: string[]): string {
    return `wallet_${operation}_${address}_${params.join('_')}`;
  }

  /**
   * Generates a cache key for token-related queries
   */
  static generateTokenCacheKey(token: string, operation: string, ...params: string[]): string {
    return `token_${operation}_${token}_${params.join('_')}`;
  }

  /**
   * Clears cache for a specific wallet
   */
  static clearWalletCache(address: string): void {
    // This would need to be implemented based on how the cache keys are structured
    seiMCPClient.clearCache(`wallet_balance_${address}`);
    seiMCPClient.clearCache(`wallet_txs_${address}`);
  }

  /**
   * Clears all cached data
   */
  static clearAllCache(): void {
    seiMCPClient.clearCache();
  }
}

// Error handling utilities
export class ErrorUtils {
  /**
   * Determines if an error is recoverable
   */
  static isRecoverableError(error: unknown): boolean {
    if (error instanceof MCPTimeoutError) {
      return true; // Timeouts are usually recoverable
    }
    
    if (error instanceof MCPConnectionError) {
      return true; // Connection errors might be temporary
    }
    
    if (error instanceof MCPRequestError) {
      // Some request errors are recoverable (rate limiting, temporary issues)
      const message = error.message.toLowerCase();
      return message.includes('rate limit') || 
             message.includes('temporary') || 
             message.includes('timeout');
    }
    
    return false;
  }

  /**
   * Gets a user-friendly error message
   */
  static getUserFriendlyErrorMessage(error: unknown): string {
    if (error instanceof MCPConnectionError) {
      return 'Unable to connect to the blockchain network. Please try again in a moment.';
    }
    
    if (error instanceof MCPTimeoutError) {
      return 'The request is taking longer than expected. Please try a simpler query or try again later.';
    }
    
    if (error instanceof MCPRequestError) {
      if (error.message.toLowerCase().includes('rate limit')) {
        return 'Too many requests. Please wait a moment before trying again.';
      }
      return `Request failed: ${error.message}`;
    }
    
    return 'An unexpected error occurred. Please try again or contact support if the issue persists.';
  }

  /**
   * Logs error details for debugging
   */
  static logError(error: unknown, context: string): void {
    console.error(`[MCP-ERROR] ${context}:`, {
      type: error instanceof Error ? error.constructor.name : typeof error,
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });
  }
}

// Performance monitoring utilities
export class PerformanceUtils {
  private static metrics: Map<string, number[]> = new Map();

  /**
   * Records a performance metric
   */
  static recordMetric(operation: string, duration: number): void {
    if (!this.metrics.has(operation)) {
      this.metrics.set(operation, []);
    }
    
    const operationMetrics = this.metrics.get(operation)!;
    operationMetrics.push(duration);
    
    // Keep only the last 100 measurements
    if (operationMetrics.length > 100) {
      operationMetrics.shift();
    }
  }

  /**
   * Gets average performance for an operation
   */
  static getAveragePerformance(operation: string): number | null {
    const metrics = this.metrics.get(operation);
    if (!metrics || metrics.length === 0) {
      return null;
    }
    
    return metrics.reduce((sum, duration) => sum + duration, 0) / metrics.length;
  }

  /**
   * Gets performance statistics for all operations
   */
  static getPerformanceStats(): { [operation: string]: { avg: number; count: number } } {
    const stats: { [operation: string]: { avg: number; count: number } } = {};
    
    for (const [operation, metrics] of this.metrics.entries()) {
      if (metrics.length > 0) {
        stats[operation] = {
          avg: metrics.reduce((sum, duration) => sum + duration, 0) / metrics.length,
          count: metrics.length
        };
      }
    }
    
    return stats;
  }
}

// Network-specific utilities
export class NetworkUtils {
  /**
   * Gets the appropriate block explorer URL for a transaction
   */
  static getExplorerUrl(txHash: string, network: 'mainnet' | 'testnet' = 'mainnet'): string {
    const baseUrls = {
      mainnet: 'https://www.seiscan.app/pacific-1/txs',
      testnet: 'https://www.seiscan.app/atlantic-2/txs'
    };
    
    return `${baseUrls[network]}/${txHash}`;
  }

  /**
   * Gets the appropriate block explorer URL for an address
   */
  static getAddressExplorerUrl(address: string, network: 'mainnet' | 'testnet' = 'mainnet'): string {
    const baseUrls = {
      mainnet: 'https://www.seiscan.app/pacific-1/accounts',
      testnet: 'https://www.seiscan.app/atlantic-2/accounts'
    };
    
    return `${baseUrls[network]}/${address}`;
  }
}

// Export all utilities as a single object for convenience
export const MCPUtils = {
  Validation: ValidationUtils,
  Format: FormatUtils,
  HealthCheck: HealthCheckUtils,
  Cache: CacheUtils,
  Error: ErrorUtils,
  Performance: PerformanceUtils,
  Network: NetworkUtils
}; 