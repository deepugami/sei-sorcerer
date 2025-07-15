// src/components/chat/chat-bottombar.tsx
'use client';

import { ChatRequestOptions } from 'ai';
import { motion } from 'framer-motion';
import { ArrowRight, Square } from 'lucide-react';
import React, { useEffect } from 'react';
import { toast } from 'sonner';

interface ChatBottombarProps {
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleSubmit: (
    e: React.FormEvent<HTMLFormElement>,
    chatRequestOptions?: ChatRequestOptions
  ) => void;
  isLoading: boolean;
  stop: () => void;
  input: string;
  isToolInProgress: boolean;
  isGeminiMode?: boolean;
}

export default function ChatBottombar({
  input,
  handleInputChange,
  handleSubmit,
  isLoading,
  stop,
  isToolInProgress,
  isGeminiMode = false,
}: ChatBottombarProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [shouldShake, setShouldShake] = React.useState(false);

  const handleInputAttempt = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isToolInProgress) {
      // Show a helpful toast when user tries to type during streaming
      toast.info('Please wait for the current response to complete before sending a new message', {
        duration: 2000,
      });
      return;
    }
    handleInputChange(e);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
      e.preventDefault();
      if (isToolInProgress) {
        toast.info('Please wait for the current response to complete', {
          duration: 2000,
        });
        return;
      }
      if (input.trim()) {
        handleSubmit(e as unknown as React.FormEvent<HTMLFormElement>);
      } else {
        // Trigger shake animation when input is empty
        setShouldShake(true);
        setTimeout(() => setShouldShake(false), 500);
      }
    }
  };

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, [inputRef]);

  // Refocus input when streaming completes
  useEffect(() => {
    if (!isToolInProgress && inputRef.current) {
      // Small delay to ensure the input is re-enabled
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isToolInProgress]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full pb-2 md:pb-8"
    >
      <form onSubmit={(e) => {
        e.preventDefault();
        if (isToolInProgress) {
          toast.info('Please wait for the current response to complete', {
            duration: 2000,
          });
          return;
        }
        if (input.trim()) {
          handleSubmit(e);
        } else {
          // Trigger shake animation when input is empty
          setShouldShake(true);
          setTimeout(() => setShouldShake(false), 500);
        }
      }} className="relative w-full md:px-4">
        <motion.div 
          className={`mx-auto flex items-center rounded-full border bg-background/90 py-2 pr-2 pl-6 shadow-sm backdrop-blur-sm ${isGeminiMode ? 'gemini-border' : 'border-border'} ${isToolInProgress ? 'bg-purple-50 border-purple-200' : ''}`}
          animate={shouldShake ? { x: [-10, 10, -10, 10, 0] } : {}}
          transition={{ duration: 0.4 }}
        >
          {/* Streaming indicator */}
          {isToolInProgress && (
            <div className="mr-3 flex items-center">
              <div className="flex space-x-1 streaming-dots">
                <div className="h-2 w-2 rounded-full bg-purple-400 dot"></div>
                <div className="h-2 w-2 rounded-full bg-purple-400 dot"></div>
                <div className="h-2 w-2 rounded-full bg-purple-400 dot"></div>
              </div>
            </div>
          )}
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={handleInputAttempt}
            onKeyDown={handleKeyPress}
            placeholder={
              isToolInProgress ? 'Sorcerer is weaving magic... ✨' : 'Ask me anything'
            }
            className="text-md w-full border-none bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none"
            disabled={isToolInProgress || isLoading}
          />

          <button
            type="submit"
            disabled={!isToolInProgress && (!input.trim() || isLoading)}
            className={`flex items-center justify-center rounded-full p-2 text-white disabled:opacity-50 transition-colors ${
              isToolInProgress 
                ? 'bg-red-500 hover:bg-red-600' 
                : 'bg-[#0171E3] hover:bg-blue-600'
            }`}
            onClick={(e) => {
              if (isToolInProgress || isLoading) {
                e.preventDefault();
                stop();
              }
            }}
            title={isToolInProgress ? "Stop streaming" : "Send message"}
          >
            {isToolInProgress ? (
              <Square className="h-4 w-4" />
            ) : (
              <ArrowRight className="h-6 w-6" />
            )}
          </button>
        </motion.div>
      </form>
    </motion.div>
  );
}
