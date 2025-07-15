'use client';

import FluidCursor from '@/components/FluidCursor';
import { Button } from '@/components/ui/button';
import WelcomeModal from '@/components/welcome-modal';

import { motion } from 'framer-motion';
import {
  ArrowRight,
  Wallet,
  Layers,
  Activity,
  FileCode,
} from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import GitHubButton from 'react-github-btn';


/* ---------- quick-question data ---------- */
const questions = {
  'Wallet Analysis': 'Analyze wallet sei1... to check balance and asset composition',
  'NFT History': 'Track NFT contract 0x... and analyze ownership history',
  'Transaction Explain': 'Explain transaction 0x... and decode its details',
  'Blockchain Query': 'What is Sei blockchain and how does it work for DeFi?',
} as const;

const questionConfig = [
  { key: 'Wallet Analysis', color: '#329696', icon: Wallet },
  { key: 'NFT History', color: '#856ED9', icon: Layers },
  { key: 'Transaction Explain', color: '#B95F9D', icon: Activity },
  { key: 'Blockchain Query', color: '#C19433', icon: FileCode },
] as const;

/* ---------- component ---------- */
export default function Home() {
  const [input, setInput] = useState('');
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);


  // Optimized navigation with prefetching - now populates input instead of auto-executing
  const goToChat = useCallback((query: string) => {
    router.push(`/chat?query=${encodeURIComponent(query)}&populate=true`);
  }, [router]);

  /* hero animations (unchanged) */
  const topElementVariants = {
    hidden: { opacity: 0, y: -60 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.8 },
    },
  };
  const bottomElementVariants = {
    hidden: { opacity: 0, y: 80 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.8, delay: 0.2 },
    },
  };

  useEffect(() => {
    // Preload chat route for faster navigation
    router.prefetch('/chat');
    
    // Asset preloading removed - no media assets to preload
  }, [router]);



  return (
    <div className="relative flex h-screen flex-col items-center justify-center overflow-hidden px-4">
      {/* big blurred footer word */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center overflow-hidden">
        <div
          className="hidden bg-gradient-to-b from-neutral-500/10 to-neutral-500/0 bg-clip-text text-[8rem] leading-none font-black text-transparent select-none sm:block lg:text-[14rem]"
          style={{ marginBottom: '-1rem' }}
        >
          SORCERER
        </div>
      </div>

      {/* GitHub button */}
      <div className="absolute top-6 right-8 z-20">
        
      </div>

      <div className="absolute top-6 left-6 z-20 flex items-center gap-3">
        <button
          onClick={() => goToChat('What makes the Sei blockchain special for DeFi?')}
          className="cursor-pointer relative flex items-center gap-2 rounded-full border border-border bg-background/30 px-4 py-1.5 text-sm font-medium text-foreground shadow-md backdrop-blur-lg transition hover:bg-background/60 dark:border-border dark:text-foreground dark:hover:bg-accent"
        >
          {/* Purple magic pulse dot */}
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-purple-400 opacity-75"></span>
            <span className="relative inline-flex h-2 w-2 rounded-full bg-purple-500"></span>
          </span>
          magic awaits 
          <div className="w-8 md:w-10 h-8 md:h-10 flex items-center justify-center">
            <Image
              src="/sei_red_symbol.svg"
              alt="Sei Symbol"
              width={24}
              height={24}
              className="w-6 h-6 md:w-8 md:h-8"
            />
          </div>
        </button>


      </div>

      {/* header */}
      <motion.div
        className="z-1 mb-4 flex flex-col items-center text-center md:mb-6 mt-16 md:mt-4"
        variants={topElementVariants}
        initial="hidden"
        animate="visible"
      >
        <div className="z-100">
          <WelcomeModal />
        </div>

        <h2 className="text-secondary-foreground mt-1 text-lg font-semibold md:text-xl">
          Welcome, young apprentice
        </h2>
        <h1 className="text-3xl font-bold sm:text-4xl md:text-5xl lg:text-6xl">
          Sei Sorcerer
        </h1>
      </motion.div>

      {/* centre animation */}
      <div className="relative z-10 h-40 w-40 overflow-hidden sm:h-48 sm:w-48 md:h-52 md:w-52 rounded-lg">
        {/* Lottie Animation */}
        <iframe 
          //src="https://lottie.host/embed/0ad41a89-d778-47ba-ba9f-0c0299f42587/zgi2nvzJmE.lottie"
          src="https://lottie.host/embed/2db2c2c1-78cd-4e99-9b82-197de763af20/pKdtwMVQo3.lottie"
          frameBorder="0"
          width="100%"
          height="100%"
          className="rounded-lg"
          style={{
            border: 'none',
            outline: 'none',
          }}
          loading="lazy"
          title="Sei Sorcerer Animation"
        />
      </div>

      {/* input + quick buttons */}
      <motion.div
        variants={bottomElementVariants}
        initial="hidden"
        animate="visible"
        className="z-10 mt-4 flex w-full flex-col items-center justify-center md:px-0"
      >
        {/* free-form question */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (input.trim()) goToChat(input.trim());
          }}
          className="relative w-full max-w-lg"
        >
          <div className="mx-auto flex items-center rounded-full border border-border bg-background/30 py-2.5 pr-2 pl-6 backdrop-blur-lg transition-all hover:border-border/80 dark:border-border dark:bg-card dark:hover:border-border/60">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Cast your blockchain query..."
              className="w-full border-none bg-transparent text-base text-foreground placeholder:text-muted-foreground focus:outline-none dark:text-foreground dark:placeholder:text-muted-foreground"
            />
            <button
              type="submit"
              disabled={!input.trim()}
              aria-label="Submit query"
              className="flex items-center justify-center rounded-full bg-[#0171E3] p-2.5 text-white transition-colors hover:bg-blue-600 disabled:opacity-70 dark:bg-blue-600 dark:hover:bg-blue-700"
            >
              <ArrowRight className="h-5 w-5" />
            </button>
          </div>
        </form>

        {/* quick-question grid */}
        <div className="mt-3 grid w-full max-w-2xl grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-4">
          {questionConfig.map(({ key, color, icon: Icon }) => (
            <Button
              key={key}
              onClick={() => goToChat(questions[key])}
              variant="outline"
              className="shadow-none border-border hover:bg-border/30 aspect-square w-full cursor-pointer rounded-2xl border bg-background/30 py-4 backdrop-blur-lg transition-all duration-200 hover:scale-105 active:scale-95 md:py-6"
            >
              <div className="flex h-full flex-col items-center justify-center gap-1 text-foreground">
                <Icon size={18} strokeWidth={2} color={color} />
                <span className="text-xs font-medium">{key}</span>
              </div>
            </Button>
          ))}
        </div>
      </motion.div>
      <FluidCursor />
    </div>
  );
}