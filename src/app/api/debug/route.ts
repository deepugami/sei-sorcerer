import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get('address') || 'sei1w3pmkxgzf6kwqtd4ng2yy0gqtdc63nxntk6nts'; // Default test address
  
  console.log(`[DEBUG] Testing balance fetch for address: ${address}`);
  
  if (!address.startsWith('sei1')) {
    return NextResponse.json({ 
      error: 'Invalid address format. Use sei1 address for testing.' 
    }, { status: 400 });
  }

  const results: any = {
    address,
    timestamp: new Date().toISOString(),
    tests: {}
  };

  // Test primary REST API
  try {
    console.log(`[DEBUG] Testing primary API: https://rest.sei-apis.com/cosmos/bank/v1beta1/balances/${address}`);
    const response1 = await fetch(`https://rest.sei-apis.com/cosmos/bank/v1beta1/balances/${address}`);
    
    results.tests.primary = {
      status: response1.status,
      statusText: response1.statusText,
      ok: response1.ok,
      headers: Object.fromEntries(response1.headers.entries())
    };
    
    if (response1.ok) {
      const data1 = await response1.json();
      results.tests.primary.data = data1;
      
      // Find SEI balance
      const seiBalance = data1.balances?.find((b: any) => b.denom === 'usei');
      if (seiBalance) {
        results.tests.primary.seiBalanceRaw = seiBalance.amount;
        results.tests.primary.seiBalanceFormatted = (parseFloat(seiBalance.amount) / 1000000).toFixed(6);
      }
    } else {
      results.tests.primary.errorText = await response1.text();
    }
  } catch (error) {
    results.tests.primary = {
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }

  // Test fallback REST API
  try {
    console.log(`[DEBUG] Testing fallback API: https://sei-api.polkachu.com/cosmos/bank/v1beta1/balances/${address}`);
    const response2 = await fetch(`https://sei-api.polkachu.com/cosmos/bank/v1beta1/balances/${address}`);
    
    results.tests.fallback = {
      status: response2.status,
      statusText: response2.statusText,
      ok: response2.ok,
      headers: Object.fromEntries(response2.headers.entries())
    };
    
    if (response2.ok) {
      const data2 = await response2.json();
      results.tests.fallback.data = data2;
      
      // Find SEI balance
      const seiBalance = data2.balances?.find((b: any) => b.denom === 'usei');
      if (seiBalance) {
        results.tests.fallback.seiBalanceRaw = seiBalance.amount;
        results.tests.fallback.seiBalanceFormatted = (parseFloat(seiBalance.amount) / 1000000).toFixed(6);
      }
    } else {
      results.tests.fallback.errorText = await response2.text();
    }
  } catch (error) {
    results.tests.fallback = {
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }

  // Test MCP server endpoint
  try {
    console.log(`[DEBUG] Testing MCP server balance endpoint`);
    const mcpResponse = await fetch(`${process.env.MCP_SERVER_URL || 'http://localhost:3001'}/api/mcp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'get_balance',
        params: { address },
        id: 1
      })
    });
    
    results.tests.mcp = {
      status: mcpResponse.status,
      statusText: mcpResponse.statusText,
      ok: mcpResponse.ok
    };
    
    if (mcpResponse.ok) {
      const mcpData = await mcpResponse.json();
      results.tests.mcp.data = mcpData;
    } else {
      results.tests.mcp.errorText = await mcpResponse.text();
    }
  } catch (error) {
    results.tests.mcp = {
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }

  return NextResponse.json(results, { 
    status: 200,
    headers: {
      'Cache-Control': 'no-store'
    }
  });
} 