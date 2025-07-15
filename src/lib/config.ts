// Configuration for Sei MCP Integration
// Handles environment variables and provides configuration objects

export interface MCPServerConfig {
  url: string;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
}

export interface SeiNetworkConfig {
  network: 'mainnet' | 'testnet';
  rpcUrl: string;
  restUrl: string;
  chainId: string;
}

export interface MCPClientConfig {
  server: MCPServerConfig;
  network: SeiNetworkConfig;
  apiKeys?: {
    sei?: string;
    coingecko?: string;
  };
  rateLimit: {
    maxRequestsPerMinute: number;
    cacheTTL: number;
  };
  debug: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

// Environment variable helpers
function getEnvVar(key: string, defaultValue?: string): string {
  const value = process.env[key];
  if (!value && !defaultValue) {
    throw new Error(`Environment variable ${key} is required but not set`);
  }
  return value || defaultValue!;
}

function getEnvNumber(key: string, defaultValue: number): number {
  const value = process.env[key];
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) {
    throw new Error(`Environment variable ${key} must be a valid number`);
  }
  return parsed;
}

function getEnvBoolean(key: string, defaultValue: boolean): boolean {
  const value = process.env[key];
  if (!value) return defaultValue;
  return value.toLowerCase() === 'true';
}

// Network configurations
const MAINNET_CONFIG: SeiNetworkConfig = {
  network: 'mainnet',
  rpcUrl: 'https://sei-rpc.polkachu.com',
  restUrl: 'https://sei-api.polkachu.com',
  chainId: 'pacific-1'
};

const TESTNET_CONFIG: SeiNetworkConfig = {
  network: 'testnet',
  rpcUrl: 'https://sei-testnet-rpc.polkachu.com',
  restUrl: 'https://sei-testnet-api.polkachu.com',
  chainId: 'atlantic-2'
};

// Build configuration from environment variables
export function createMCPConfig(): MCPClientConfig {
  const network = getEnvVar('SEI_NETWORK', 'mainnet') as 'mainnet' | 'testnet';
  
  // Use provided URLs or defaults based on network
  const baseNetworkConfig = network === 'mainnet' ? MAINNET_CONFIG : TESTNET_CONFIG;
  
  const networkConfig: SeiNetworkConfig = {
    network,
    rpcUrl: getEnvVar('SEI_RPC_URL', baseNetworkConfig.rpcUrl),
    restUrl: getEnvVar('SEI_REST_URL', baseNetworkConfig.restUrl),
    chainId: getEnvVar('SEI_CHAIN_ID', baseNetworkConfig.chainId)
  };

  const serverConfig: MCPServerConfig = {
    url: getEnvVar('MCP_SERVER_URL', 'http://localhost:3004'),
    timeout: getEnvNumber('MCP_SERVER_TIMEOUT', 30000),
    retryAttempts: getEnvNumber('MCP_CONNECTION_RETRY_ATTEMPTS', 3),
    retryDelay: getEnvNumber('MCP_CONNECTION_RETRY_DELAY', 1000)
  };

  const apiKeys: { sei?: string; coingecko?: string } = {};
  if (process.env.SEI_API_KEY) apiKeys.sei = process.env.SEI_API_KEY;
  if (process.env.COINGECKO_API_KEY) apiKeys.coingecko = process.env.COINGECKO_API_KEY;

  return {
    server: serverConfig,
    network: networkConfig,
    apiKeys: Object.keys(apiKeys).length > 0 ? apiKeys : undefined,
    rateLimit: {
      maxRequestsPerMinute: getEnvNumber('MAX_REQUESTS_PER_MINUTE', 60),
      cacheTTL: getEnvNumber('REQUEST_CACHE_TTL', 30000)
    },
    debug: true, // Force debug mode to troubleshoot
    logLevel: (getEnvVar('LOG_LEVEL', 'info') as 'debug' | 'info' | 'warn' | 'error')
  };
}

// Default configuration for development
export const DEFAULT_CONFIG: MCPClientConfig = {
  server: {
    url: 'http://localhost:3004',
    timeout: 30000,
    retryAttempts: 3,
    retryDelay: 1000
  },
  network: MAINNET_CONFIG,
  rateLimit: {
    maxRequestsPerMinute: 60,
    cacheTTL: 30000
  },
  debug: false,
  logLevel: 'info'
}; 