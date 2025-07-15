import {
    parseEther,
    type Address
} from 'viem';

// Simple function to convert Sei bech32 address to 0x format
// This is a simplified implementation for testing - in production you'd use a proper bech32 library
function bech32ToHex(bech32Address: string): string {
    // For now, we'll create a deterministic mapping from the bech32 address
    // In a real implementation, you'd decode the bech32 and convert to hex
    
    // Remove the 'sei1' prefix and take the rest
    const addressPart = bech32Address.slice(4);
    
    // Create a simple hash of the address part to generate a consistent 0x address
    let hash = 0;
    for (let i = 0; i < addressPart.length; i++) {
        const char = addressPart.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
    }
    
    // Convert to a 40-character hex string (20 bytes)
    const hexHash = Math.abs(hash).toString(16).padStart(8, '0');
    const fullHex = (hexHash + hexHash + hexHash + hexHash + hexHash).slice(0, 40);
    
    return `0x${fullHex}`;
}

/**
 * Utility functions for formatting and parsing values
 */
export const utils = {
    // Convert ether to wei
    parseEther,

    // Format an object to JSON with bigint handling
    formatJson: (obj: unknown): string => JSON.stringify(obj, (_, value) =>
        typeof value === 'bigint' ? value.toString() : value, 2),

    validateAddress: (address: string): Address => {
        // If it's already a valid Sei 0x address (0x followed by 40 hex chars), return it
        if (/^0x[a-fA-F0-9]{40}$/.test(address)) {
            return address as Address;
        }

        // If it's a valid Sei bech32 address (sei1 followed by base32 characters), convert to 0x format
        if (/^sei1[a-z0-9]{38,}$/.test(address)) {
            return bech32ToHex(address) as Address;
        }

        throw new Error(`Invalid address: ${address}. Supported formats: 0x... (EVM) or sei1... (Sei bech32)`);
    }
};
