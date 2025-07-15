'use client';

import {
  ChatBubble,
  ChatBubbleMessage,
} from '@/components/ui/chat/chat-bubble';
import { AnimatePresence, motion } from 'framer-motion';
import ChatMessageContent from './chat-message-content';
import ToolRenderer from './tool-renderer';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt?: Date;
}

interface SimplifiedChatViewProps {
  message: Message;
  isLoading: boolean;
  reload: () => void;
  addToolResult?: (args: { toolCallId: string; result: string }) => void;
}

// Enhanced animation config for iOS-style transitions
const CONTAINER_MOTION_CONFIG = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: {
    duration: 0.2,
  },
};

const CONTENT_STAGGER_CONFIG = {
  animate: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};



export function SimplifiedChatView({
  message,
  isLoading,
  reload,
  addToolResult,
}: SimplifiedChatViewProps) {
  console.log('📺 SimplifiedChatView rendering with message:', {
    role: message.role,
    content: message.content,
    contentLength: message.content?.length,
    isLoading
  });
  
  if (message.role !== 'assistant') return null;

  // Since our Message interface doesn't have parts, we don't have tools
  const toolInvocations: any[] = [];
  const currentTool: any[] = [];

  const hasTextContent = message.content.trim().length > 0;
  const hasTools = currentTool.length > 0;

  console.log('📺 SimplifiedChatView render state:', {
    hasTextContent,
    hasTools,
    contentPreview: message.content.substring(0, 100)
  });

  return (
    <motion.div 
      {...CONTAINER_MOTION_CONFIG} 
      className="flex h-full w-full flex-col px-4"
    >
      {/* Single scrollable container for both tool and text content */}
      <motion.div 
        className="custom-scrollbar flex h-full w-full flex-col overflow-y-auto"
        {...CONTENT_STAGGER_CONFIG}
      >
        <AnimatePresence mode="wait">
        {/* Tool invocation result - displayed at the top */}
        {hasTools && (
                         <motion.div 
               key="tools"
               className="mb-4 w-full"
               initial={{ opacity: 0, y: 15, scale: 0.98 }}
               animate={{ opacity: 1, y: 0, scale: 1 }}
               transition={{
                 type: "spring",
                 damping: 20,
                 stiffness: 300,
                 mass: 0.8,
               }}
             >
            <ToolRenderer
              toolInvocations={currentTool}
              messageId={message.id || 'current-msg'}
            />
            </motion.div>
        )}

          {/* Text content with AI animation */}
        {hasTextContent && (
            <motion.div 
              key="text-content"
              className="w-full"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: hasTools ? 0.1 : 0 }}
            >
              <ChatBubble 
                variant="received" 
                layout="ai"
                className="w-full"
                animate={true}
                index={0}
              >
                <ChatBubbleMessage 
                  className="w-full"
                  animate={true}
                  layout="ai"
                >
                <ChatMessageContent
                  message={message}
                  isLast={true}
                  isLoading={isLoading}
                  reload={reload}
                  addToolResult={addToolResult}
                  skipToolRendering={true}
                />
              </ChatBubbleMessage>
            </ChatBubble>
            </motion.div>
        )}
        </AnimatePresence>

        {/* Add some padding at the bottom for better scrolling experience */}
        <div className="pb-4"></div>
      </motion.div>
    </motion.div>
  );
}
