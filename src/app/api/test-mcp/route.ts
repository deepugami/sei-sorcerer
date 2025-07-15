import { NextResponse } from 'next/server';
import { createMCPConfig } from '@/lib/config';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get('address') || 'sei13c7p3xrhd6q2rx3mna8ya8fac83p4pjt8ykdnq';
  
  try {
    const config = createMCPConfig();
    const mcpUrl = config.server.url;
    
    console.log(`[TEST-MCP] Testing address: ${address}`);
    console.log(`[TEST-MCP] MCP URL: ${mcpUrl}`);
    
    // Test get_balance method
    const balanceResponse = await fetch(`${mcpUrl}/api/mcp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 'test-balance',
        method: 'get_balance',
        params: { address, network: 'sei' }
      })
    });
    
    const balanceData = await balanceResponse.json();
    
    // Test with different network parameters
    const balanceResponse2 = await fetch(`${mcpUrl}/api/mcp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 'test-balance-mainnet',
        method: 'get_balance',
        params: { address, network: 'mainnet' }
      })
    });
    
    const balanceData2 = await balanceResponse2.json();
    
    // Test chain info
    const chainResponse = await fetch(`${mcpUrl}/api/mcp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 'test-chain',
        method: 'get_chain_info',
        params: { network: 'sei' }
      })
    });
    
    const chainData = await chainResponse.json();
    
    return NextResponse.json({
      address,
      timestamp: new Date().toISOString(),
      tests: {
        balance_sei: {
          request: { method: 'get_balance', params: { address, network: 'sei' } },
          response: balanceData,
          status: balanceResponse.status
        },
        balance_mainnet: {
          request: { method: 'get_balance', params: { address, network: 'mainnet' } },
          response: balanceData2,
          status: balanceResponse2.status
        },
        chain_info: {
          request: { method: 'get_chain_info', params: { network: 'sei' } },
          response: chainData,
          status: chainResponse.status
        }
      },
      environment: {
        mcpUrl: config.server.url
      }
    });
    
  } catch (error) {
    console.error(`[TEST-MCP] Error:`, error);
    
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      address,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
} 