# Sei Sorcerer - AI-Powered Blockchain Analysis Platform

A Next.js application that provides intelligent blockchain analysis through natural language interactions. Built specifically for the Sei blockchain ecosystem, this platform transforms complex blockchain data into conversational insights.

## Overview

Sei Sorcerer is an AI-powered interface that allows users to interact with blockchain data through natural language queries. Instead of navigating traditional block explorers, users can ask questions and receive intelligent analysis powered by advanced AI models and real-time blockchain connectivity.

## Key Features

### Wallet Analysis
- Comprehensive asset composition and performance tracking
- Token-specific behavior analysis and insights

### NFT Tracking
- Complete ownership history and lifetime tracking
- Price evolution and performance analysis

### Transaction Intelligence
- Multi-step DeFi transaction breakdown and explanation
- Smart contract interaction analysis
- Educational explanations suitable for all technical levels
- Gas optimization insights and recommendations

### Blockchain Intelligence
- Deep insights into Sei blockchain's unique features
- DeFi ecosystem analysis and mapping
- Real-time network performance metrics
- Protocol interaction visualization

## Technical Architecture

### Core Technologies
- **Frontend Framework**: Next.js 15.2.3 with React 19
- **Language**: TypeScript for type safety
- **Styling**: Tailwind CSS for responsive design
- **AI Integration**: Google Gemini API with streaming responses
- **Blockchain Connectivity**: Model Context Protocol (MCP) with Sei MCP Kit
- **Animation**: Framer Motion for smooth user interactions

### Backend Integration
- Real-time blockchain data access through MCP server
- Native Cosmos SDK integration for Sei blockchain
- Intelligent tool routing and response streaming
- Comprehensive error handling and recovery

## Installation and Setup

### Prerequisites
- Node.js 18.0 or higher
- Git version control system

### Quick Start

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd sei-sorcerer
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Setup MCP Server**
   ```bash
   cd official-sei-mcp-server
   npm install
   npm start
   ```

4. **Start the application** (in a new terminal)
   ```bash
   npm run dev
   ```

The application will be available at `http://localhost:3000`

### Build for Production
```bash
npm run build
npm start
```

## Usage Examples

The platform accepts natural language queries such as:

- "Analyze wallet sei1lygd9q3940wuqh97y2a09tthlxkg5h8k2002w6"
- "What is the current Sei network status?"
- "Explain the latest transaction in block 12345"
- "Show me the NFT trading activity for collection XYZ"

## Model Context Protocol Integration

The application leverages the Model Context Protocol for secure and efficient blockchain data access:

### Architecture Flow
```
User Query → AI Processor → MCP Client → MCP Server → Sei Blockchain
                     ↓
User Interface ← Formatted Response ← Processed Data ← Raw Blockchain Data
```

### MCP Server Features
- Native SEI balance and transaction analysis
- Real-time network status monitoring
- Comprehensive transaction decoding
- Robust error handling and data validation
- Streaming response capabilities

## Project Structure

```
src/
├── app/                    # Next.js app router pages
│   ├── api/               # API routes and AI integration
│   ├── chat/              # Chat interface components
│   └── layout.tsx         # Root layout configuration
├── components/            # Reusable UI components
│   ├── chat/              # Chat-specific components
│   ├── ui/                # Base UI components
│   └── providers/         # Context providers
├── hooks/                 # Custom React hooks
└── lib/                   # Utility functions and configurations

official-sei-mcp-server/   # MCP server implementation
├── src/                   # Server source code
├── bin/                   # Executable scripts
└── package.json           # Server dependencies
```

## Development Features

### AI Personality
The AI assistant maintains a knowledgeable and educational approach:
- Data-driven insights backed by real blockchain information
- Educational explanations that teach while analyzing
- Risk-aware recommendations considering security implications
- Professional yet accessible communication style

### Error Handling
- Comprehensive error recovery mechanisms
- User-friendly error messages with actionable guidance
- Graceful degradation when services are unavailable
- Real-time status monitoring and feedback

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint for code quality

## Dependencies

### Core Dependencies
- Next.js, React, and TypeScript for the foundation
- Tailwind CSS and Framer Motion for styling and animations
- AI SDK for Google Gemini integration
- Model Context Protocol SDK for blockchain connectivity
- Sei.js core libraries for blockchain interaction

### Development Dependencies
- ESLint and Prettier for code quality and formatting
- TypeScript compiler and type definitions
- Tailwind CSS for styling framework

## Contributing

This project follows standard open-source contribution practices:

1. Fork the repository
2. Create a feature branch
3. Make your changes with proper testing
4. Submit a pull request with clear documentation

## License

This project is licensed under the MIT License. See the LICENSE file for details.

## Status

**Current Version**: 0.1.0

**Development Status**:
- Core chat interface: Complete
- MCP blockchain integration: Complete
- AI analysis tools: Complete
- Error handling: Complete
- Advanced analytics: In active development

---

For questions, issues, or contributions, please refer to the project's GitHub repository.
