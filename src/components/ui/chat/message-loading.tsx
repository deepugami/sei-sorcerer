'use client';

import { motion } from 'framer-motion';

export default function MessageLoading() {
  return (
    <div className="flex items-center justify-center">
      <div className="px-2 py-1">
        <div className="flex items-center space-x-1">
          {[0, 1, 2].map((index) => (
            <motion.div
              key={index}
              className="w-2 h-2 bg-foreground/60 rounded-full"
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.4, 1, 0.4],
              }}
              transition={{
                duration: 0.6,
                ease: "easeInOut",
                repeat: Infinity,
                delay: index * 0.15,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
