'use client';

import { motion } from 'framer-motion';
import { Wallet, Sparkles, Search, MessageSquare } from 'lucide-react';
import React from 'react';

interface ChatLandingProps {
  submitQuery: (query: string) => void;
}

const ChatLanding: React.FC<ChatLandingProps> = ({ submitQuery }) => {
  // Suggested questions that the user can click on
  const suggestedQuestions = [
    {
      icon: <Wallet className="h-4 w-4" />,
      text: 'Analyze my Sei wallet for token holdings and transaction history',
    },
    {
      icon: <Sparkles className="h-4 w-4" />,
      text: 'Show me NFT history and collection analysis for my wallet',
    },
    {
      icon: <Search className="h-4 w-4" />,
      text: 'Explain this transaction hash and its details',
    },
    {
      icon: <MessageSquare className="h-4 w-4" />,
      text: 'What is Sei blockchain and how does it work?',
    },
  ];

  // Animation variants for staggered animation
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
    },
  };

  return (
    <motion.div
      className="flex w-full flex-col items-center px-4 py-6"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      {/* Welcome message */}
      <motion.div className="mb-8 text-center" variants={itemVariants}>
        <h2 className="mb-3 text-2xl font-semibold">
            Sei Blockchain Assistant
        </h2>
        <p className="text-muted-foreground mx-auto max-w-md">
          Your intelligent guide to the Sei blockchain ecosystem. Analyze wallets, track tokens, explore NFTs, and understand transactions.
        </p>
      </motion.div>

      {/* Suggested questions */}
      <motion.div
        className="w-full max-w-md space-y-3"
        variants={containerVariants}
      >
        {suggestedQuestions.map((question, index) => (
          <motion.button
            key={index}
            className="bg-accent hover:bg-accent/80 flex w-full items-center rounded-lg px-4 py-3 transition-colors"
            onClick={() => submitQuery(question.text)}
            variants={itemVariants}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <span className="bg-background mr-3 rounded-full p-2">
              {question.icon}
            </span>
            <span className="text-left">{question.text}</span>
          </motion.button>
        ))}
      </motion.div>
    </motion.div>
  );
};

export default ChatLanding;
