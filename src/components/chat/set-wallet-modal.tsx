'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input-landing';
import { Wallet, X, Check, Copy } from 'lucide-react';
import { toast } from 'sonner';

interface SetWalletModalProps {
  trigger?: React.ReactNode;
  onWalletSet?: (address: string) => void;
  onWalletReset?: () => void;
}

// Wallet validation utilities
const validateWalletAddress = (address: string): { isValid: boolean; type: string; error?: string } => {
  if (!address || address.trim() === '') {
    return { isValid: false, type: 'unknown', error: 'Address cannot be empty' };
  }

  const trimmedAddress = address.trim();

  // Check for Sei native address (sei1...)
  if (trimmedAddress.startsWith('sei1')) {
    // Sei addresses are bech32 encoded and should be around 43-44 characters
    if (trimmedAddress.length >= 39 && trimmedAddress.length <= 59) {
      // Basic bech32 validation (lowercase letters and numbers only after sei1)
      const addressPart = trimmedAddress.slice(4);
      if (/^[a-z0-9]+$/.test(addressPart)) {
        return { isValid: true, type: 'Sei Native (Cosmos)' };
      } else {
        return { isValid: false, type: 'sei1', error: 'Invalid Sei address format' };
      }
    } else {
      return { isValid: false, type: 'sei1', error: 'Sei address length invalid' };
    }
  }

  // Check for EVM address (0x...)
  if (trimmedAddress.startsWith('0x')) {
    if (trimmedAddress.length === 42) {
      // Check if it contains only valid hex characters
      const hexPart = trimmedAddress.slice(2);
      if (/^[a-fA-F0-9]+$/.test(hexPart)) {
        return { isValid: true, type: 'EVM (Ethereum-compatible)' };
      } else {
        return { isValid: false, type: '0x', error: 'Invalid EVM address format' };
      }
    } else {
      return { isValid: false, type: '0x', error: 'EVM address must be exactly 42 characters' };
    }
  }

  return { isValid: false, type: 'unknown', error: 'Address must start with "sei1" or "0x"' };
};

export default function SetWalletModal({ trigger, onWalletSet, onWalletReset }: SetWalletModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [address, setAddress] = useState('');
  const [currentWallet, setCurrentWallet] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [validation, setValidation] = useState<{ isValid: boolean; type: string; error?: string } | null>(null);

  // Load wallet from localStorage on component mount
  useEffect(() => {
    const savedWallet = localStorage.getItem('sei-sorcerer-wallet');
    if (savedWallet) {
      setCurrentWallet(savedWallet);
    }
  }, []);

  // Validate address as user types
  useEffect(() => {
    if (address.trim() === '') {
      setValidation(null);
      return;
    }

    setIsValidating(true);
    const timer = setTimeout(() => {
      const result = validateWalletAddress(address);
      setValidation(result);
      setIsValidating(false);
    }, 300); // Debounce validation

    return () => clearTimeout(timer);
  }, [address]);

  const handleSave = () => {
    if (!validation?.isValid) {
      toast.error('Please enter a valid wallet address');
      return;
    }

    const trimmedAddress = address.trim();
    
    // Save to localStorage
    localStorage.setItem('sei-sorcerer-wallet', trimmedAddress);
    setCurrentWallet(trimmedAddress);
    
    // Call callback
    onWalletSet?.(trimmedAddress);
    
    // Close modal and reset form
    setIsOpen(false);
    setAddress('');
    setValidation(null);
    
    toast.success(`Wallet set successfully! (${validation.type})`);
  };

  const handleReset = () => {
    // Remove from localStorage
    localStorage.removeItem('sei-sorcerer-wallet');
    setCurrentWallet(null);
    
    // Call callback
    onWalletReset?.();
    
    // Close modal and reset form
    setIsOpen(false);
    setAddress('');
    setValidation(null);
    
    toast.success('Wallet removed successfully');
  };

  const handleCopyAddress = () => {
    if (currentWallet) {
      navigator.clipboard.writeText(currentWallet);
      toast.success('Address copied to clipboard');
    }
  };

  const triggerElement = trigger || (
    <Button
      variant="outline"
      size="sm"
      className="flex items-center gap-2 bg-background/80 backdrop-blur-sm hover:bg-accent border border-border"
    >
      <Wallet className="h-4 w-4" />
      Set Wallet
    </Button>
  );

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {triggerElement}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Wallet Management
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Current Wallet Display */}
          {currentWallet && (
            <div className="p-3 bg-accent/50 rounded-lg border border-border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Current Wallet
                  </p>
                  <p className="text-xs text-muted-foreground font-mono break-all">
                    {currentWallet.slice(0, 8)}...{currentWallet.slice(-6)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {validateWalletAddress(currentWallet).type}
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCopyAddress}
                    className="h-8 w-8 p-0"
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleReset}
                    className="h-8 w-8 p-0 text-destructive hover:text-destructive/90 hover:bg-destructive/10"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Wallet Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              {currentWallet ? 'Update Wallet Address' : 'Enter Wallet Address'}
            </label>
            <Input
              placeholder="sei1abc...def123 or 0x123...abc"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="font-mono text-sm"
            />
            
            {/* Validation Feedback */}
            {isValidating && (
              <p className="text-xs text-muted-foreground">Validating...</p>
            )}
            
            {validation && !isValidating && (
              <div className={`text-xs ${validation.isValid ? 'text-foreground' : 'text-destructive'}`}>
                {validation.isValid ? (
                  <div className="flex items-center gap-1">
                    <Check className="h-3 w-3" />
                    Valid {validation.type} address
                  </div>
                ) : (
                  validation.error
                )}
              </div>
            )}
          </div>

          {/* Supported Formats Info */}
          <div className="text-xs text-muted-foreground space-y-1">
            <p className="font-medium">Supported wallet formats:</p>
            <ul className="list-disc list-inside space-y-0.5 ml-2">
              <li><strong>Sei Native:</strong> sei1abc...def123 (Cosmos format)</li>
              <li><strong>EVM Compatible:</strong> 0x123...abc (Ethereum format)</li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={!validation?.isValid}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {currentWallet ? 'Update Wallet' : 'Set Wallet'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 