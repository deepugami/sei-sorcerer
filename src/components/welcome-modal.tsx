'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';

interface WelcomeModalProps {
  trigger?: React.ReactNode;
}

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    if (media.matches !== matches) {
      setMatches(media.matches);
    }
    const listener = () => setMatches(media.matches);
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, [matches, query]);

  return matches;
}

export default function WelcomeModal({ trigger }: WelcomeModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const isDesktop = useMediaQuery('(min-width: 768px)');

  const triggerElement = trigger || (
    <Button className="relative rounded-full px-8" variant="default">
      <span className="mr-2">🔮</span>
      Powered by Sei MCP
    </Button>
  );

  const content = (
    <div className="flex h-full max-h-[80vh] flex-col">
      {/* Header */}
      <div className="border-b border-border/40 px-4 py-6 md:px-8">
        <div className="flex items-center gap-3">
          <div className="text-3xl">🔮</div>
          <div>
            <h2 className="text-2xl font-bold">Welcome to Sei Sorcerer</h2>
            <p className="text-muted-foreground">
              Your AI-powered blockchain analysis companion
            </p>
          </div>
        </div>
      </div>

      {/* Content area */}
      <div className="space-y-6 overflow-y-auto px-2 py-4 md:px-8">
        <section className="bg-accent w-full space-y-8 rounded-2xl p-8">
          {/* What section */}
          <div className="space-y-3">
            <h3 className="text-primary flex items-center gap-2 text-xl font-semibold">
              What's this?
            </h3>
            <p className="text-accent-foreground text-base leading-relaxed">
              Welcome to the <strong>Sei Sorcerer</strong> - your AI-powered blockchain analysis companion!
              <br /> Whether you're a DeFi enthusiast, trader, investor, or just curious about Sei ecosystem,
              feel free to connect your wallet and explore!
            </p>
          </div>

          {/* Why section */}
          <div className="space-y-3">
            <h3 className="text-primary flex items-center gap-2 text-xl font-semibold">
              Why Sei Sorcerer? ⚡
            </h3>
            <p className="text-accent-foreground text-base leading-relaxed">
              Traditional blockchain explorers can't provide intelligent insights. <br /> 
              They can't understand your DeFi strategy or predict market opportunities. <br /> 
              Sei Sorcerer becomes{' '}
              <strong>
                your blockchain analyst that adapts to your specific investment needs.
              </strong>
            </p>
          </div>

          {/* Features section */}
          <div className="space-y-3">
            <h3 className="text-primary flex items-center gap-2 text-xl font-semibold">
              Magical Abilities 🧙‍♂️
            </h3>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <h4 className="font-medium">🔍 Wallet Analysis</h4>
                <p className="text-sm text-accent-foreground">
                  Comprehensive asset composition and performance tracking
                </p>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium">🎨 NFT History Tracking</h4>
                <p className="text-sm text-accent-foreground">
                  Complete ownership history and price evolution analysis
                </p>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium">⚡ Transaction Explanation</h4>
                <p className="text-sm text-accent-foreground">
                  Multi-step DeFi transaction breakdown and risk assessment
                </p>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium">🌟 Blockchain Intelligence</h4>
                <p className="text-sm text-accent-foreground">
                  Deep insights into Sei's unique features and DeFi ecosystem
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Footer */}
      <div className="flex flex-col items-center px-8 pt-4 pb-0 md:pb-8">
        <Button
          onClick={() => setIsOpen(false)}
          className="h-auto rounded-full px-4 py-3"
          size="sm"
        >
          Begin Your Journey
        </Button>
      </div>
    </div>
  );

  if (isDesktop) {
    return (
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>{triggerElement}</DialogTrigger>
        <DialogContent className="h-auto max-h-[85vh] w-full max-w-2xl p-0">
          <DialogHeader className="sr-only">
            <DialogTitle>Welcome to Sei Sorcerer</DialogTitle>
          </DialogHeader>
          {content}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={isOpen} onOpenChange={setIsOpen}>
      <DrawerTrigger asChild>{triggerElement}</DrawerTrigger>
      <DrawerContent className="h-[90vh]">
        <DrawerHeader className="sr-only">
          <DrawerTitle>Welcome to Sei Sorcerer</DrawerTitle>
          <DrawerDescription>Your AI-powered blockchain analysis companion</DrawerDescription>
        </DrawerHeader>
        {content}
      </DrawerContent>
    </Drawer>
  );
}
