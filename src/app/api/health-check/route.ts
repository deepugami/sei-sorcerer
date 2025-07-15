import { NextResponse } from 'next/server';
import { createMCPConfig } from '@/lib/config';

export async function GET() {
  const startTime = Date.now();
  
  try {
    const config = createMCPConfig();
    const mcpUrl = config.server.url;
    
    console.log(`[HEALTH-CHECK] Testing MCP server at: ${mcpUrl}`);
    
    // Test 1: Basic health endpoint
    const healthResponse = await fetch(`${mcpUrl}/health`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    
    const healthData = await healthResponse.json();
    const healthLatency = Date.now() - startTime;
    
    // Test 2: MCP API endpoint
    const mcpStartTime = Date.now();
    const mcpResponse = await fetch(`${mcpUrl}/api/mcp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 'health-test',
        method: 'get_balance',
        params: { address: 'sei1test000000000000000000000000000000000', network: 'sei' }
      })
    });
    
    const mcpData = await mcpResponse.json();
    const mcpLatency = Date.now() - mcpStartTime;
    
    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        MCP_SERVER_URL: process.env.MCP_SERVER_URL,
        configServerUrl: config.server.url,
      },
      tests: {
        health: {
          success: healthResponse.ok,
          status: healthResponse.status,
          latency: healthLatency,
          data: healthData
        },
        mcp: {
          success: mcpResponse.ok,
          status: mcpResponse.status,
          latency: mcpLatency,
          data: mcpData
        }
      },
      totalLatency: Date.now() - startTime
    });
    
  } catch (error) {
    console.error(`[HEALTH-CHECK] Error:`, error);
    
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        MCP_SERVER_URL: process.env.MCP_SERVER_URL,
        configServerUrl: createMCPConfig().server.url,
      },
      latency: Date.now() - startTime
    }, { status: 500 });
  }
} 