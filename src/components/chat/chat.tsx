'use client';
import { useCustomChat } from '@/hooks/use-custom-chat';
import { AnimatePresence, motion } from 'framer-motion';
import { useRouter, useSearchParams } from 'next/navigation';
import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { toast } from 'sonner';

// Component imports
import ChatBottombar from '@/components/chat/chat-bottombar';
import ChatLanding from '@/components/chat/chat-landing';
import ChatMessageContent from '@/components/chat/chat-message-content';
import { SimplifiedChatView } from '@/components/chat/simple-chat-view';
import {
  ChatBubble,
  ChatBubbleMessage,
} from '@/components/ui/chat/chat-bubble';
import WelcomeModal from '@/components/welcome-modal';
import { Info } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import HelperBoost from './HelperBoost';
import SetWalletModal from '@/components/chat/set-wallet-modal';

// Simplified Avatar component - no dynamic import
interface AvatarProps {
  hasActiveTool: boolean;
  isTalking: boolean;
  onNavigateHome: () => void;
}

const Avatar = React.memo(({ hasActiveTool, isTalking, onNavigateHome }: AvatarProps) => {
  return (
    <div
      className={`flex items-center justify-center rounded-full transition-all duration-300 ${hasActiveTool ? 'h-16 w-16' : 'h-20 w-20'}`}
    >
      <div className="relative">
        <iframe
          src="https://lottie.host/embed/0ad41a89-d778-47ba-ba9f-0c0299f42587/zgi2nvzJmE.lottie"
          className="h-full w-full scale-[1.2] object-contain border-0"
          style={{ 
            background: 'transparent',
            border: 'none',
            outline: 'none'
          }}
          frameBorder="0"
          loading="lazy"
        />
        {/* Transparent overlay to handle clicks */}
        <div
          className="absolute inset-0 cursor-pointer z-10"
          onClick={onNavigateHome}
          title="Go to home page"
        />
      </div>
    </div>
  );
});

Avatar.displayName = 'Avatar';

const MOTION_CONFIG = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 20 },
  transition: {
    duration: 0.3,
  },
};

const Chat = () => {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const bottomBarRef = useRef<HTMLDivElement | null>(null);
  const chatContentRef = useRef<HTMLDivElement | null>(null);
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('query');
  const shouldPopulate = searchParams.get('populate') === 'true';
  
  // Simplified state management
  const [autoSubmitted, setAutoSubmitted] = useState(false);
  const [loadingSubmit, setLoadingSubmit] = useState(false);
  const [isTalking, setIsTalking] = useState(false);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const [bottomPadding, setBottomPadding] = useState(80);
  const [isGeminiMode, setIsGeminiMode] = useState(false);
  const [currentWallet, setCurrentWallet] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);

  // Load wallet from localStorage on component mount
  useEffect(() => {
    const savedWallet = localStorage.getItem('sei-sorcerer-wallet');
    if (savedWallet) {
      setCurrentWallet(savedWallet);
    }
  }, []);

  // Wallet management handlers
  const handleWalletSet = useCallback((address: string) => {
    setCurrentWallet(address);
    toast.success('Wallet set successfully! It will be automatically used in wallet queries.');
  }, []);

  const handleWalletReset = useCallback(() => {
    setCurrentWallet(null);
    toast.success('Wallet removed successfully.');
  }, []);

  const handleNavigateHome = useCallback(() => {
    router.push('/');
  }, [router]);

  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    stop,
    setMessages,
    setInput,
    reload,
    addToolResult,
    append,
  } = useCustomChat({
    onResponse: (response) => {
      if (response) {
        setLoadingSubmit(false);
        setIsTalking(true);
      }
    },
    onFinish: () => {
      setLoadingSubmit(false);
      setIsTalking(false);
    },
    onError: (error) => {
      setLoadingSubmit(false);
      setIsTalking(false);
      console.error('Chat error:', error.message, error.cause);
      toast.error(`Error: ${error.message}`);
    },
    onToolCall: (tool) => {
      console.log('Tool call:', tool);
    },
    useGeminiOnly: isGeminiMode,
  });

  // Unified streaming state - true when any response is being generated
  const isResponseInProgress = loadingSubmit || isLoading || isStreaming;

  // Simplified message state computation
  const { currentAIMessage, latestUserMessage, hasActiveTool } = useMemo(() => {
    const latestAIMessageIndex = messages.findLastIndex(
      (m) => m.role === 'assistant'
    );
    const latestUserMessageIndex = messages.findLastIndex(
      (m) => m.role === 'user'
    );

    const result = {
      currentAIMessage:
        latestAIMessageIndex !== -1 ? messages[latestAIMessageIndex] : null,
      latestUserMessage:
        latestUserMessageIndex !== -1 ? messages[latestUserMessageIndex] : null,
      hasActiveTool: false,
    };

    // Hide AI message if we're waiting for a response to a newer user message
    if (result.currentAIMessage && latestAIMessageIndex < latestUserMessageIndex && !isLoading) {
      result.currentAIMessage = null;
    }

    return result;
  }, [messages, isLoading]);

  const isToolInProgress = isResponseInProgress;

  // Helper function to auto-inject wallet address in queries
  const processQueryWithWallet = useCallback((query: string): string => {
    const queryLower = query.toLowerCase();
    
    // Check if query mentions "wallet" and if we have a current wallet set
    if (queryLower.includes('wallet') && currentWallet) {
      // Check if query already contains a wallet address
      const hasWalletAddress = /sei1[a-z0-9]{38,58}|0x[a-fA-F0-9]{40}/.test(query);
      
      if (!hasWalletAddress) {
        // Replace common wallet placeholders or add wallet address
        let processedQuery = query;
        
        // Replace placeholders like "my wallet", "wallet", etc.
        processedQuery = processedQuery.replace(/\bmy wallet\b/gi, `wallet ${currentWallet}`);
        processedQuery = processedQuery.replace(/\banalyze wallet\s*/gi, `analyze wallet ${currentWallet}`);
        processedQuery = processedQuery.replace(/\bcheck wallet\s*/gi, `check wallet ${currentWallet}`);
        processedQuery = processedQuery.replace(/\bwallet\s+sei1\.\.\./gi, `wallet ${currentWallet}`);
        processedQuery = processedQuery.replace(/\bwallet\s+0x\.\.\./gi, `wallet ${currentWallet}`);
        
        // If none of the above replacements worked, try a more general approach
        if (processedQuery === query && queryLower.includes('wallet')) {
          // Check if the query is asking for wallet analysis without specifying an address
          if (/analyze|check|show|track|what|how/.test(queryLower)) {
            processedQuery = query.replace(/wallet\s*/i, `wallet ${currentWallet} `);
          }
        }
        
        return processedQuery;
      }
    }
    
    return query;
  }, [currentWallet]);

  // Optimized submit query function
  const submitQuery = useCallback(async (query: string) => {
    try {
      if (!query.trim() || isResponseInProgress) return;
      
      // Process query to auto-inject wallet address if needed
      const processedQuery = processQueryWithWallet(query);
      
      setLoadingSubmit(true);
      setIsStreaming(true);
      setShouldAutoScroll(true);
      
      // Clear the input field
      setInput('');
      
      const userMessage = {
        id: `user-${Date.now()}`,
        role: 'user' as const,
        content: processedQuery, // Use processed query instead of original
        createdAt: new Date(),
      };
      
      const newMessages = [...messages, userMessage];
      setMessages(newMessages);

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          messages: newMessages,
          useGeminiOnly: isGeminiMode 
        }),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      // Handle streaming response
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No reader available');
      }
      
      const decoder = new TextDecoder();
      const assistantMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant' as const,
        content: '',
        createdAt: new Date(),
      };
      
      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        
        for (const line of lines) {
          if (line.trim() === '' || !line.startsWith('0:')) continue;
          
          try {
            const data = JSON.parse(line.substring(2));
            if (data.type === 'text-delta') {
              assistantMessage.content += data.textDelta;
              const updatedMessages = [...newMessages, {
                ...assistantMessage,
                content: assistantMessage.content
              }];
              setMessages(updatedMessages);
            } else if (data.type === 'finish') {
              setLoadingSubmit(false);
              setIsStreaming(false);
              const finalMessages = [...newMessages, {
                ...assistantMessage,
                content: assistantMessage.content
              }];
              setMessages(finalMessages);
              break;
            }
          } catch (error) {
            console.error('Error parsing streaming data:', error);
          }
        }
      }
    } catch (error) {
      console.error('❌ submitQuery error:', error);
      setLoadingSubmit(false);
      setIsStreaming(false);
      toast.error(`Chat error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [messages, setMessages, isResponseInProgress, isGeminiMode, processQueryWithWallet, setInput]);

  // Handle initial query - either populate input or auto-submit
  useEffect(() => {
    if (initialQuery && !autoSubmitted) {
      setAutoSubmitted(true);
      if (shouldPopulate) {
        // Just populate the input field, don't auto-submit
        setInput(initialQuery);
      } else {
        // Auto-submit (backward compatibility)
        setInput('');
        submitQuery(initialQuery);
      }
    }
  }, [initialQuery, autoSubmitted, shouldPopulate, submitQuery, setInput]);

  // Simplified bottom bar height tracking
  useEffect(() => {
    if (!bottomBarRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const height = entry.contentRect.height;
        setBottomPadding(height);
      }
    });

    resizeObserver.observe(bottomBarRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  // Simplified auto-scroll
  useEffect(() => {
    if (!shouldAutoScroll || !chatContentRef.current) return;
    
    const element = chatContentRef.current;
    if (element.scrollHeight > element.clientHeight) {
      requestAnimationFrame(() => {
        element.scrollTo({
          top: element.scrollHeight - element.clientHeight,
          behavior: 'smooth'
        });
      });
    }
  }, [messages, loadingSubmit, isLoading, shouldAutoScroll]);

  const onSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isResponseInProgress) return;
    setShouldAutoScroll(true);
    // Use our submitQuery function which includes wallet injection
    submitQuery(input);
  }, [input, isResponseInProgress, submitQuery]);

  const handleStop = useCallback(() => {
    stop();
    setLoadingSubmit(false);
    setIsStreaming(false);
    setIsTalking(false);
  }, [stop]);

  // Check if this is the initial empty state
  const isEmptyState = messages.length === 0 && !loadingSubmit && !isLoading;
  const headerHeight = hasActiveTool ? 80 : 100;

  return (
    <div className="relative h-screen overflow-hidden">
      {/* Top-left Set Wallet Widget */}
      <div className="absolute top-6 left-8 z-[60] flex flex-col items-start justify-start gap-2">
        <SetWalletModal 
          onWalletSet={handleWalletSet}
          onWalletReset={handleWalletReset}
        />
        {/* Wallet Status Indicator */}
        {currentWallet && (
          <div className="bg-accent border border-border rounded-lg px-2 py-1 text-xs">
            <span className="text-accent-foreground font-medium">
              Wallet: {currentWallet.slice(0, 6)}...{currentWallet.slice(-4)}
            </span>
          </div>
        )}
      </div>

      {/* Top-right Controls */}
      <div className="absolute top-6 right-8 z-[60] flex flex-col-reverse items-center justify-center gap-1 md:flex-row">
        <WelcomeModal
          trigger={
            <div className="hover:bg-accent cursor-pointer rounded-2xl px-3 py-1.5 bg-background/50 backdrop-blur-sm border border-border/50">
              <Info className="text-foreground h-8" />
            </div>
          }
        />
        <div className="flex items-center gap-3 pt-2 bg-background/90 backdrop-blur-sm rounded-lg px-3 py-2 border border-border shadow-sm">
          <div className="text-sm font-medium text-foreground">
            {isGeminiMode ? 'AI Mode' : 'SEI MCP Mode'}
          </div>
          <Switch
            checked={isGeminiMode}
            onCheckedChange={setIsGeminiMode}
          />
        </div>
      </div>

      {/* Fixed Avatar Header with Gradient */}
      <div
        className="fixed top-0 right-0 left-0 z-50 bg-gradient-to-b from-background via-background/95 to-background/80"
      >
        <div
          className={`transition-all duration-300 ease-in-out ${hasActiveTool ? 'pt-4 pb-0' : 'pt-6 pb-0'}`}
        >
          <div className="flex justify-center">
            <Avatar
              hasActiveTool={hasActiveTool}
              isTalking={isTalking}
              onNavigateHome={handleNavigateHome}
            />
          </div>

          <AnimatePresence>
            {latestUserMessage && !currentAIMessage && (
              <motion.div
                {...MOTION_CONFIG}
                className="mx-auto flex max-w-3xl px-4"
              >
                <ChatBubble 
                  variant="sent"
                  animate={true}
                  index={0}
                >
                  <ChatBubbleMessage
                    animate={true}
                    variant="sent"
                  >
                    <ChatMessageContent
                      message={latestUserMessage}
                      isLast={true}
                      isLoading={false}
                      reload={() => Promise.resolve(null)}
                    />
                  </ChatBubbleMessage>
                </ChatBubble>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="container mx-auto flex h-full max-w-3xl flex-col">
        {/* Scrollable Chat Content */}
        <div
          ref={chatContentRef}
          className="flex-1 overflow-y-auto px-2 scroll-smooth"
          style={{ paddingTop: `${headerHeight}px`, paddingBottom: `${bottomPadding + 5}px` }}
        >
          <AnimatePresence mode="wait">
            {isEmptyState ? (
              <motion.div
                key="landing"
                className="flex min-h-full items-center justify-center"
                {...MOTION_CONFIG}
              >
                <ChatLanding submitQuery={submitQuery} />
              </motion.div>
            ) : currentAIMessage ? (
              <SimplifiedChatView
                message={currentAIMessage}
                isLoading={isLoading}
                reload={reload}
                addToolResult={addToolResult}
              />
            ) : (
              loadingSubmit && (
                <motion.div
                  key="loading"
                  {...MOTION_CONFIG}
                  className="px-4 pt-18"
                >
                  <ChatBubble 
                    variant="received"
                    animate={true}
                    index={0}
                  >
                    <ChatBubbleMessage 
                      isLoading 
                      animate={true}
                      variant="received"
                    />
                  </ChatBubble>
                </motion.div>
              )
            )}
          </AnimatePresence>
        </div>

        {/* Fixed Bottom Bar */}
        <div ref={bottomBarRef} className="fixed bottom-0 left-0 right-0 bg-background z-50">
          <div className="container mx-auto max-w-3xl px-2 md:px-0">
            <div className="relative flex flex-col items-center gap-1 py-1">
              <HelperBoost submitQuery={submitQuery} setInput={setInput} />
              <ChatBottombar
                input={input}
                handleInputChange={handleInputChange}
                handleSubmit={onSubmit}
                isLoading={isLoading}
                stop={handleStop}
                isToolInProgress={isToolInProgress}
                isGeminiMode={isGeminiMode}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chat;
