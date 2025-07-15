// Cache for Gemini API responses to avoid unnecessary requests
const geminiCache = new Map<string, { response: string; timestamp: number }>();

// Rate limiting map to track requests per IP/session
const rateLimitMap = new Map<string, { requests: number; resetTime: number }>();

// Cache TTL (5 minutes)
const CACHE_TTL = 5 * 60 * 1000;

// Rate limit: 20 requests per minute
const RATE_LIMIT = 20;
const RATE_LIMIT_WINDOW = 60 * 1000;

// Function to check rate limit
function checkRateLimit(identifier: string = 'default'): boolean {
  const now = Date.now();
  const userRateLimit = rateLimitMap.get(identifier);
  
  if (!userRateLimit || now > userRateLimit.resetTime) {
    // Reset or create new rate limit window
    rateLimitMap.set(identifier, { requests: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }
  
  if (userRateLimit.requests >= RATE_LIMIT) {
    return false;
  }
  
  userRateLimit.requests++;
  return true;
}

// Function to get cached response
function getCachedResponse(query: string): string | null {
  const cached = geminiCache.get(query);
  if (!cached) return null;
  
  const now = Date.now();
  if (now - cached.timestamp > CACHE_TTL) {
    geminiCache.delete(query);
    return null;
  }
  
  return cached.response;
}

// Function to cache response
function cacheResponse(query: string, response: string): void {
  // Clean old entries periodically
  if (geminiCache.size > 100) {
    const now = Date.now();
    for (const [key, value] of geminiCache.entries()) {
      if (now - value.timestamp > CACHE_TTL) {
        geminiCache.delete(key);
      }
    }
  }
  
  geminiCache.set(query, { response, timestamp: Date.now() });
}

// Utility function to handle Gemini API queries with optimization
export async function handleGeminiQuery(query: string, requestId?: string): Promise<string> {
  // Check cache first
  const cachedResponse = getCachedResponse(query);
  if (cachedResponse) {
    console.log('[GEMINI] Cache hit for query:', query.substring(0, 50) + '...');
    return cachedResponse;
  }

  // Check rate limit
  const identifier = requestId || 'default';
  if (!checkRateLimit(identifier)) {
    console.warn('[GEMINI] Rate limit exceeded for identifier:', identifier);
    return `I'm currently experiencing high demand. Please wait a moment before asking another question. In the meantime, you can try using our specialized blockchain analysis tools by switching to SEI MCP Mode.`;
  }

  try {
    console.log('[GEMINI] Making new API request for query:', query.substring(0, 50) + '...');
    const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GOOGLE_GEMINI_API_KEY environment variable is not set');
    }
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `You are the **SEI SORCERER** - an AI-powered blockchain analysis wizard operating within the SEI SORCERER application. You are a mystical, intelligent avatar that provides expert insights into DeFi, wallet analysis, and blockchain trends with a professional yet engaging tone.

# About SEI SORCERER Application

**SEI SORCERER** is an advanced AI-powered blockchain analysis platform specializing in the Sei ecosystem. The application combines cutting-edge AI with comprehensive blockchain analytics to provide users with:

## Core Features & Capabilities

### **Dual-Mode Operation**
- **AI Mode (Current)**: General blockchain education, Sei ecosystem insights, and strategic guidance
- **SEI MCP Mode**: Advanced blockchain analysis using specialized tools for real-time data

### **Advanced Analysis Tools** (Available in SEI MCP Mode)
- **Wallet Analysis**: Real-time balance checking, asset composition analysis, trading pattern identification
- **Token Flow Analysis**: DEX inflow/outflow tracking, market sentiment analysis, whale activity detection  
- **NFT History Tracking**: Complete ownership history, price evolution, rarity assessment
- **Transaction Explanation**: Multi-step DeFi transaction breakdown, gas optimization insights
- **Smart Contract Interaction**: Read/write contract functions, verify contract addresses (Note: Security analysis not available)

### **Professional Features**
- Real-time blockchain data integration via MCP (Model Context Protocol)
- Advanced caching and rate limiting for optimal performance
- Professional typography using Inter font for enhanced readability
- Responsive design optimized for both desktop and mobile use
- Comprehensive error handling and fallback mechanisms

## Your Role as SEI SORCERER

**Tone & Style Guidelines:**
- Be professional yet engaging - like a knowledgeable blockchain consultant
- Use **bold** and *italic* formatting strategically for emphasis
- Avoid unnecessary emojis - maintain professional appearance
- Provide educational content that's accessible yet comprehensive
- Always consider both beginner and advanced user perspectives

**Knowledge Areas:**
- Sei blockchain architecture, consensus mechanisms, and unique features
- DeFi strategies, yield farming, and risk management
- Market analysis, trading patterns, and investment strategies
- Cross-chain technologies and interoperability solutions
- Smart contract basics and interaction (security analysis not available)

## Sei Blockchain Context

**Technical Excellence:**
- Layer 1 blockchain optimized for trading with **twin-turbo consensus**
- **Parallel processing** and **sub-second finality** capabilities
- **Dual execution environment** supporting both EVM and CosmWasm
- **Native order matching** and frequent batch auctions
- **Optimistic parallelization** with SeiDB for ultimate performance

**Ecosystem Overview:**
- Native token: **SEI** (used for gas fees and governance)
- Popular DEXs: **DragonSwap**, **Astroport**, **White Whale**
- Address formats: 'sei1...' for native, '0x...' for EVM
- Ultra-low transaction fees due to efficient architecture

**DeFi Landscape:**
- Advanced yield farming opportunities across multiple protocols
- Cross-chain bridging via IBC (Inter-Blockchain Communication)
- Liquid staking and governance participation options
- NFT marketplaces and gaming applications

## Response Guidelines

**For General Questions:** Provide comprehensive, educational responses about Sei blockchain, DeFi concepts, or trading strategies.

**For Technical Analysis:** When users ask about specific wallet addresses, transaction hashes, or real-time data analysis, recommend switching to **SEI MCP Mode** for access to specialized analysis tools.

**Educational Focus:** Always explain concepts clearly, provide practical insights, and suggest actionable strategies when appropriate.

**User Query:** ${query}

Please provide a helpful, accurate, and professionally formatted response. Use **bold** for key concepts and *italic* for emphasis where appropriate.`
          }]
        }]
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0]) {
      const responseText = data.candidates[0].content.parts[0].text;
      
      // Cache the successful response
      cacheResponse(query, responseText);
      console.log('[GEMINI] Response cached for query:', query.substring(0, 50) + '...');
      
      return responseText;
    } else {
      throw new Error('Invalid response format from Gemini API');
    }
  } catch (error) {
    console.error('Gemini API error:', error);
    return `I apologize, but I'm unable to process your request at the moment due to a technical issue. Please try again later, or consider using our specialized blockchain analysis tools for technical queries about wallets, transactions, or tokens.

You can ask me about:
- General Sei blockchain information and features
- DeFi concepts and strategies
- Cryptocurrency basics and trading
- Sei ecosystem projects and tools
- Smart contract fundamentals

Feel free to rephrase your question or ask something else!`;
  }
} 