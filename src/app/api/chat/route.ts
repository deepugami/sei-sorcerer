import { walletAnalysis } from './tools/walletAnalysis';
import { nftHistoryTracker } from './tools/nftHistoryTracker';
import { transactionExplainer } from './tools/transactionExplainer';
import { seiBlockchainAnalyzer } from './tools/seiBlockchainAnalyzer';
import { seiTransferTool } from './tools/seiTransferTool';
import { handleGeminiQuery } from './gemini-api';

export const maxDuration = 30;

// Error handler utility
function errorHandler(error: unknown) {
  if (error == null) {
    return 'Unknown error';
  }
  if (typeof error === 'string') {
    return error;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return JSON.stringify(error);
}

// Available blockchain tools
const tools = {
  seiBlockchainAnalyzer,
  walletAnalysis,
  nftHistoryTracker,
  transactionExplainer,
  seiTransferTool,
};

// Simple function to determine which tool to use based on the user's message
function selectTool(message: string): string {
  const lowerMessage = message.toLowerCase();
  
  // Check for transfer-related keywords first
  if (lowerMessage.includes('send') || lowerMessage.includes('transfer') || 
      lowerMessage.includes('approve') || lowerMessage.includes('estimate gas') ||
      lowerMessage.includes('allowance') || 
      (lowerMessage.includes('gas') && (lowerMessage.includes('fee') || lowerMessage.includes('cost')))) {
    return 'seiTransferTool';
  }
  
  if (lowerMessage.includes('wallet') && (lowerMessage.includes('analyze') || lowerMessage.includes('analysis'))) {
    return 'walletAnalysis';
  }
  if (lowerMessage.includes('token') && (lowerMessage.includes('flow') || lowerMessage.includes('track'))) {
    return 'tokenFlowAnalysis';
  }
  if (lowerMessage.includes('nft') || lowerMessage.includes('history')) {
    return 'nftHistoryTracker';
  }
  if (lowerMessage.includes('transaction') || lowerMessage.includes('explain') || lowerMessage.includes('hash')) {
    return 'transactionExplainer';
  }
  
  // Default to main blockchain analyzer for general queries
  return 'seiBlockchainAnalyzer';
}



export async function POST(req: Request) {
  try {
    const { messages, useGeminiOnly = false } = await req.json();
    console.log('[CHAT-API] Incoming messages:', messages);
    console.log('[CHAT-API] Gemini-only mode:', useGeminiOnly);
    
    // Get the last user message
    const lastMessage = messages[messages.length - 1];
    const userMessage = lastMessage?.content || '';
    
    let responseText: string;
    
    if (useGeminiOnly) {
      // Use Gemini API exclusively with rate limiting
      console.log('[CHAT-API] Using Gemini-only mode');
      const requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      responseText = await handleGeminiQuery(userMessage, requestId);
    } else {
      // Use SEI MCP mode (current default behavior)
      console.log('[CHAT-API] Using SEI MCP mode');
      
      // Select appropriate tool based on the message
      const selectedToolName = selectTool(userMessage);
      const selectedTool = tools[selectedToolName as keyof typeof tools];
      
      if (!selectedTool) {
        return new Response(
          JSON.stringify({ error: 'Tool not found' }),
          { status: 500 }
        );
      }
      
      // Execute the tool with the user's message and wallet context
      const toolResult = await selectedTool.execute({ 
        query: userMessage
      }, {
        toolCallId: `tool_${Date.now()}`,
        messages: [],
        abortSignal: undefined
      });
      
      responseText = typeof toolResult === 'string' ? toolResult : JSON.stringify(toolResult, null, 2);
    }
    
    // responseText is already defined above
    
    // Create a streaming response that mimics the AI SDK data stream format
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // AI SDK expects specific format with 0: prefix
          const words = responseText.split(' ');
          
          // Send text deltas with proper AI SDK format (with async streaming)
          for (let i = 0; i < words.length; i++) {
            const word = words[i];
            const delta = i === 0 ? word : ' ' + word;
            const chunk = `0:${JSON.stringify({
              type: 'text-delta',
              textDelta: delta,
            })}\n`;
            controller.enqueue(encoder.encode(chunk));
            
            // Add a small delay to simulate real streaming
            if (i < words.length - 1) {
              await new Promise(resolve => setTimeout(resolve, 50));
            }
          }
          
          // Send finish event with proper AI SDK format
          const finishChunk = `0:${JSON.stringify({
            type: 'finish',
            finishReason: 'stop',
            usage: { promptTokens: userMessage.length, completionTokens: words.length }
          })}\n`;
          controller.enqueue(encoder.encode(finishChunk));
          
          controller.close();
        } catch (error) {
          console.error('Streaming error:', error);
          controller.error(error);
        }
      },
    });
    
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    });
    
  } catch (err) {
    console.error('Global error:', err);
    const errorMessage = errorHandler(err);
    return new Response(errorMessage, { status: 500 });
  }
}
