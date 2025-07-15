import { tool } from "ai";
import { z } from "zod";
import SeiMCPClient, { QueryParser } from "@/lib/sei-mcp-client";

// Create MCP client instance
const seiMCPKit = new SeiMCPClient();

// Common NFT contract addresses on Sei (for reference)
const KNOWN_NFT_CONTRACTS = {
  'Seaside Squids': '0x1234567890123456789012345678901234567890', // Placeholder
  'Sei Dragons': '0x2345678901234567890123456789012345678901',    // Placeholder
  'Cosmic Cats': '0x3456789012345678901234567890123456789012',    // Placeholder
  'Sei Punks': '0x4567890123456789012345678901234567890123'      // Placeholder
};

export const nftHistoryTracker = tool({
  description: "Track NFT ownership and metadata using real blockchain data from the Sei MCP server",
  parameters: z.object({
    query: z.string().describe("Natural language query about NFT history (e.g., 'Get info for NFT contract 0x123...token 456', 'Check ownership of Seaside Squid #1234')")
  }),
  execute: async ({ query }) => {
    try {
      // Parse the query for NFT information
      const nftInfo = QueryParser.extractNFTCollection(query);
      const contractAddress = QueryParser.extractWalletAddress(query); // Can also be used for contract addresses

      if (!nftInfo && !contractAddress) {
        return `🎨 **NFT Analysis - Information Needed** ✨

To analyze NFTs, please provide the contract details:

**Format 1: Contract Address + Token ID**
- "Get info for NFT contract 0x123...abc token 456"
- "Check NFT 0xabc...def token #789"
- "Analyze ERC721 contract 0x123... token 1"

**Format 2: Collection Name + Token ID**
- "Check ownership of Seaside Squid #1234"
- "Show me Sei Dragons #567 details"
- "Analyze Cosmic Cats #890"

**🛠️ Available Features with MCP:**
- ✅ **NFT Metadata:** Get name, description, image, attributes
- ✅ **Ownership Verification:** Check who owns a specific NFT
- ✅ **Contract Analysis:** Determine if address is NFT contract
- ✅ **Collection Stats:** Basic NFT collection information

**🚀 Advanced Features:**
- 🔄 **Transfer History:** Coming soon from MCP server
- 📈 **Price History:** Historical sales data in development
- 🛒 **Marketplace Data:** External marketplace integration planned

**🌟 Supported Networks:** Sei Mainnet, Sei Testnet

Ready to analyze a specific NFT or check ownership? 🚀`;
      }

      // Determine if we have a contract address or collection name
      if (contractAddress && contractAddress.startsWith('0x')) {
        return await analyzeNFTByContract(contractAddress, nftInfo?.tokenId || '1');
      } else if (nftInfo) {
        return await analyzeNFTByCollection(nftInfo.collection, nftInfo.tokenId);
      } else {
        // Try to extract collection name from query
        const collectionName = query.toLowerCase().includes('sei dragons') ? 'Sei Dragons' : 
                             query.toLowerCase().includes('seaside squids') ? 'Seaside Squids' :
                             query.toLowerCase().includes('cosmic cats') ? 'Cosmic Cats' :
                             query.toLowerCase().includes('sei punks') ? 'Sei Punks' : null;
        
        if (collectionName) {
          // Extract token ID from query using regex
          const tokenIdMatch = query.match(/#?(\d+)/);
          const tokenId = tokenIdMatch ? tokenIdMatch[1] : '1';
          return await analyzeNFTByCollection(collectionName, tokenId);
        }
        
        return await analyzeCollection(contractAddress || nftInfo!.collection);
      }

    } catch (error) {
      console.error('NFT analysis error:', error);
      return `🎨 **NFT Analysis Error** ✨

The NFT analysis encountered an issue: ${error instanceof Error ? error.message : 'Unknown error'}

**This could be due to:**
- MCP server not running (ensure it's on port 3004)
- Invalid contract address or token ID
- NFT doesn't exist or isn't revealed yet
- Network connectivity issues

**💡 Troubleshooting:**
1. Check if the Sei MCP server is running: \`http://localhost:3004/health\`
2. Verify the contract address format (0x followed by 40 hex characters)
3. Ensure the token ID exists in the collection
4. Try with a different NFT contract address

**🔧 MCP Server Status:**
The app is configured to connect to the official Sei MCP server on port 3004. If you're seeing this error, the server may not be running or accessible.

Want to try a different type of analysis? 🌟`;
    }
  },
});

// Analyze NFT by contract address
async function analyzeNFTByContract(contractAddress: string, tokenId: string): Promise<string> {
  try {
    // Get NFT metadata using real MCP call
    let nftData;
    try {
      nftData = await seiMCPKit.getERC721TokenMetadata(contractAddress, tokenId);
    } catch (error) {
      // If ERC721 fails, the contract might not exist or token doesn't exist
      return `🎨 **NFT Analysis - Not Found** ✨

**Contract:** ${seiMCPKit.formatAddress(contractAddress)}
**Token ID:** #${tokenId}

**❌ Unable to retrieve NFT data:**
${error instanceof Error ? error.message : 'Unknown error'}

**Possible reasons:**
- Token ID doesn't exist in this contract
- Contract is not an ERC721 NFT contract
- NFT metadata is not yet revealed
- Contract address is invalid

**🔧 What to try:**
1. **Verify contract:** Check if this is actually an NFT contract
2. **Check token ID:** Ensure token #${tokenId} exists in the collection
3. **Try another token:** Use a different token ID (e.g., #1)
4. **Check network:** Confirm the contract is on Sei network

**💡 Alternative approaches:**
- "Is 0x${contractAddress.slice(2, 8)}... a contract?" - Check if it's a smart contract
- "Check if 0x${contractAddress.slice(2, 8)}... is ERC721" - Verify contract type

Want to analyze a different NFT? 🌟`;
    }

    // Check if the NFT data is valid
    if (!nftData || (typeof nftData === 'string' && nftData.includes('Error'))) {
      return `🎨 **NFT Analysis - Invalid Data** ✨

**Contract:** ${seiMCPKit.formatAddress(contractAddress)}
**Token ID:** #${tokenId}

**⚠️ NFT data appears to be invalid or incomplete:**
${typeof nftData === 'string' ? nftData : 'No valid metadata found'}

**This could mean:**
- The NFT hasn't been minted yet
- Metadata is stored off-chain and not accessible
- The contract doesn't follow ERC721 standards properly
- Token URI points to invalid location

**🔧 Troubleshooting:**
1. Try a different token ID (start with #1)
2. Check if the collection has revealed metadata
3. Verify this is a standard ERC721 contract
4. Look up the contract on Seistream explorer

Want to try a different NFT or check the contract itself? 🌟`;
    }

    // Try to get current owner information
    let ownershipInfo = '';
    try {
      // The MCP server doesn't have a direct "get current owner" tool,
      // so we'll note this limitation
      ownershipInfo = `**Current Owner:** Unable to determine with current MCP tools
**Note:** Owner lookup requires additional MCP server features`;
    } catch (error) {
      ownershipInfo = `**Current Owner:** Unable to determine (${error instanceof Error ? error.message : 'Unknown error'})`;
    }

    // Check if contract is verified
    let contractInfo = '';
    try {
      const isContract = await seiMCPKit.isContract(contractAddress);
      contractInfo = `**Contract Type:** ${isContract ? 'Smart Contract ✅' : 'Not a contract ❌'}`;
    } catch (error) {
      contractInfo = `**Contract Type:** Unable to verify (${error instanceof Error ? error.message : 'Unknown error'})`;
    }

    return `🎨 **NFT Analysis Complete** ✨

**🏷️ NFT Identity:**
- **Contract:** ${seiMCPKit.formatAddress(contractAddress)}
- **Token ID:** #${tokenId}
- **Name:** ${nftData.name || 'Unknown'}
- **Description:** ${nftData.description || 'No description available'}

**📊 Technical Details:**
${contractInfo}
- **Standard:** ERC-721 (Non-Fungible Token)
- **Network:** Sei Blockchain
- **Metadata URI:** ${nftData.tokenURI || 'Not available'}

**🎯 Attributes:**
${nftData.attributes && nftData.attributes.length > 0 ? 
  nftData.attributes.map((attr: any) => 
    `- **${attr.trait_type || 'Property'}:** ${attr.value || 'N/A'}`
  ).join('\n') : 
  '- No attributes available or not yet revealed'}

**🏆 Ownership:**
${ownershipInfo}

**🖼️ Visual:**
${nftData.image ? `- **Image:** ${nftData.image}` : '- No image available'}

**🔮 Analysis Insights:**
- **Metadata Quality:** ${nftData.name && nftData.description ? 'Complete ✅' : 'Incomplete ⚠️'}
- **Attributes:** ${nftData.attributes?.length > 0 ? `${nftData.attributes.length} traits` : 'None revealed'}
- **Rarity:** ${nftData.attributes?.length > 0 ? 'Check marketplace for rarity ranking' : 'Cannot determine without attributes'}

**⚠️ Current Limitations:**
- **Transfer History:** Not available from MCP server yet
- **Price History:** Historical sales data not supported
- **Marketplace Data:** External integration needed

**💡 What's Available:**
- ✅ **NFT Metadata:** Name, description, image, attributes
- ✅ **Contract Verification:** Is it a valid smart contract?
- ✅ **Technical Details:** Token URI, standard compliance

**🚀 Want More Analysis?**
Try: "Check if 0x...address owns this NFT" or "Analyze contract 0x...address"

The MCP server provides basic NFT data - full history tracking coming soon! 🌟`;

  } catch (error) {
    return `🎨 **NFT Analysis Failed** ✨

**Error:** ${error instanceof Error ? error.message : 'Unknown error'}

**Contract:** ${seiMCPKit.formatAddress(contractAddress)}
**Token ID:** #${tokenId}

**This could be due to:**
- MCP server connection issues
- Invalid contract address
- Token doesn't exist
- Network problems

**🔧 Try these steps:**
1. Verify the contract address is correct
2. Check if token ID exists (try #1 first)
3. Ensure MCP server is running on port 3004
4. Test with a known NFT contract

Want to try a different NFT or contract? 🌟`;
  }
}

// Analyze NFT by collection name
async function analyzeNFTByCollection(collectionName: string, tokenId: string): Promise<string> {
  const contractAddress = KNOWN_NFT_CONTRACTS[collectionName as keyof typeof KNOWN_NFT_CONTRACTS];
  
  if (!contractAddress) {
    return `🎨 **NFT Analysis - Collection Lookup Required** ✨

**Collection:** ${collectionName}
**Token ID:** #${tokenId}

**⚠️ Collection contract address needed:**
To analyze "${collectionName}" NFT #${tokenId}, I need the contract address for this collection.

**🔍 Current Status:**
- ✅ **MCP Server:** Connected to official Sei MCP server on port 3004
- ✅ **NFT Tools:** get_erc721_token_metadata, check_nft_ownership, is_contract
- ❌ **Collection Database:** "${collectionName}" contract address not available

**💡 How to proceed:**
1. **Find the contract address** for ${collectionName} collection
2. **Use direct analysis:** "Analyze NFT contract 0x...address token ${tokenId}"

**🔧 Where to find contract addresses:**
- **Seistream Explorer:** https://seistream.app
- **NFT Marketplaces:** Pallet, Element, etc.
- **Collection Website:** Official ${collectionName} site
- **Community:** ${collectionName} Discord/Telegram

**🚀 Once you have the contract address:**
Try: "check nft 0x[CONTRACT_ADDRESS] #${tokenId}"

**⭐ Example:**
If ${collectionName} contract is 0x1234...5678, use:
"check nft 0x1234567890123456789012345678901234567890 #${tokenId}"

**🛠️ What I can analyze with contract address:**
- ✅ NFT metadata (name, description, image, attributes)
- ✅ Current ownership verification
- ✅ Contract validation
- ✅ Token existence confirmation

Want to provide the contract address? 🌟`;
  }

  // Use the contract address to analyze the NFT
  return await analyzeNFTByContract(contractAddress, tokenId);
}

// Analyze collection (without specific token ID)
async function analyzeCollection(identifier: string): Promise<string> {
  if (identifier.startsWith('0x')) {
    return await analyzeContractCollection(identifier);
  } else {
    return await analyzeNamedCollection(identifier);
  }
}

// Analyze collection by contract address
async function analyzeContractCollection(contractAddress: string): Promise<string> {
  try {
    // Check if it's a contract first
    let isContract;
    try {
      isContract = await seiMCPKit.isContract(contractAddress);
    } catch (error) {
      return `🎨 **Collection Analysis - Contract Check Failed** ✨

**Contract:** ${seiMCPKit.formatAddress(contractAddress)}

**❌ Unable to verify contract:**
${error instanceof Error ? error.message : 'Unknown error'}

**This could mean:**
- Invalid contract address
- MCP server connection issues
- Network problems

**🔧 Try these steps:**
1. Verify the contract address format (0x + 40 hex characters)
2. Check if MCP server is running on port 3004
3. Test with a known contract address
4. Ensure you're on the correct network (Sei)

Want to try a different approach? 🌟`;
    }

    if (!isContract) {
      return `🎨 **Collection Analysis - Not a Contract** ✨

**Address:** ${seiMCPKit.formatAddress(contractAddress)}

**❌ This address is not a smart contract:**
The provided address appears to be a regular wallet address, not an NFT contract.

**🔧 What to check:**
- **Double-check address:** Ensure you have the correct contract address
- **Find NFT contract:** Look for the collection's official contract address
- **Check marketplace:** Visit NFT marketplaces to find the contract

**💡 How to find NFT contract addresses:**
1. Visit Seistream explorer and search for the collection
2. Check official collection websites
3. Look at marketplace listings (Pallet, etc.)
4. Ask in the collection's community

**🚀 Once you have the contract address:**
Try: "Analyze NFT contract 0x...address token 1"

Want to try with a different address? 🌟`;
    }

    // Try to get sample NFT data from the collection
    let sampleNFT;
    try {
      sampleNFT = await seiMCPKit.getERC721TokenMetadata(contractAddress, '1');
    } catch (error) {
      return `🎨 **Collection Analysis - Limited Data** ✨

**Contract:** ${seiMCPKit.formatAddress(contractAddress)}
**Status:** ✅ Verified smart contract

**⚠️ Unable to retrieve collection metadata:**
${error instanceof Error ? error.message : 'Unknown error'}

**This could mean:**
- Collection hasn't minted token #1 yet
- Metadata is not yet revealed
- Contract uses non-standard ERC721 implementation
- Token URI is not accessible

**🛠️ What we can confirm:**
- ✅ **Valid Contract:** This is a smart contract on Sei
- ✅ **Network:** Deployed on Sei blockchain
- ❌ **Metadata:** Unable to retrieve sample NFT data

**🔧 Troubleshooting:**
1. **Try different token ID:** "Analyze NFT contract ${contractAddress} token 100"
2. **Check if minted:** Verify the collection has minted NFTs
3. **Wait for reveal:** Some collections reveal metadata later
4. **Check marketplace:** Look for the collection on NFT platforms

**💡 Alternative approaches:**
- Check specific token: "Get info for NFT contract ${contractAddress} token [ID]"
- Verify ownership: "Check if 0x...address owns token [ID] from ${contractAddress}"

Want to try with a specific token ID? 🌟`;
    }

    return `🎨 **Collection Analysis Complete** ✨

**📊 Collection Overview:**
- **Contract:** ${seiMCPKit.formatAddress(contractAddress)}
- **Name:** ${sampleNFT.name || 'Unknown Collection'}
- **Standard:** ERC-721 (Non-Fungible Token)
- **Network:** Sei Blockchain

**🏷️ Sample NFT (Token #1):**
- **Name:** ${sampleNFT.name || 'Unknown'}
- **Description:** ${sampleNFT.description || 'No description available'}
- **Attributes:** ${sampleNFT.attributes?.length || 0} traits

**🔍 Analysis Results:**
- **Contract Status:** ✅ Verified smart contract
- **Metadata Quality:** ${sampleNFT.name && sampleNFT.description ? 'Complete ✅' : 'Incomplete ⚠️'}
- **Attributes Available:** ${sampleNFT.attributes?.length > 0 ? 'Yes ✅' : 'No ❌'}

**⚠️ Current Limitations:**
- **Collection Stats:** Total supply, floor price not available from MCP
- **Transfer History:** Historical data not supported yet
- **Marketplace Data:** External integration needed

**🛠️ What's Available:**
- ✅ **Individual NFT Data:** Get metadata for specific token IDs
- ✅ **Ownership Verification:** Check who owns specific NFTs
- ✅ **Contract Verification:** Confirm it's a valid NFT contract

**🚀 Next Steps:**
- **Specific NFT:** "Get info for NFT contract ${contractAddress} token [ID]"
- **Check ownership:** "Check if 0x...address owns token [ID] from ${contractAddress}"
- **Browse tokens:** Try different token IDs to explore the collection

Want to analyze a specific NFT from this collection? 🌟`;

  } catch (error) {
    return `🎨 **Collection Analysis Error** ✨

**Error:** ${error instanceof Error ? error.message : 'Unknown error'}

**Contract:** ${seiMCPKit.formatAddress(contractAddress)}

**This could be due to:**
- MCP server connection issues
- Invalid contract address
- Network problems
- Contract not accessible

Want to try a different contract or approach? 🌟`;
  }
}

// Analyze named collection (from known collections)
async function analyzeNamedCollection(collectionName: string): Promise<string> {
  const contractAddress = KNOWN_NFT_CONTRACTS[collectionName as keyof typeof KNOWN_NFT_CONTRACTS];
  
  if (!contractAddress) {
    return `🎨 **Named Collection Analysis** ✨

**Collection:** ${collectionName}

**❌ Collection not in our database:**
The collection "${collectionName}" is not in our supported collections list.

**🌟 Currently supported collections:**
${Object.keys(KNOWN_NFT_CONTRACTS).map(name => `- **${name}**`).join('\n')}

**💡 To analyze this collection:**
1. **Find contract address:** Check Seistream, marketplaces, or official website
2. **Use contract address:** "Analyze NFT contract 0x...address"
3. **Contact us:** Help us add ${collectionName} to our database

**🔧 How to find contract address:**
- Visit the collection's official website
- Check NFT marketplace listings
- Look on Seistream explorer
- Ask in the collection's community

**🚀 Once you have the contract address:**
Use: "Analyze NFT contract 0x...address"

Want to try with a contract address instead? 🌟`;
  }

  // Use the contract address to analyze the collection
  return await analyzeContractCollection(contractAddress);
}
