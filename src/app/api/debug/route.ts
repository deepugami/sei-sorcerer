import { NextResponse } from 'next/server';
import { createMCPConfig } from '@/lib/config';

export async function GET() {
  try {
    const config = createMCPConfig();
    
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        MCP_SERVER_URL: process.env.MCP_SERVER_URL,
        configServerUrl: config.server.url,
        hasEnvVar: !!process.env.MCP_SERVER_URL,
      }
    });
  } catch (error) {
    return NextResponse.json({
      error: 'Failed to get debug info',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 