'use client';

import { Suspense } from 'react';
import Chat from '@/components/chat/chat';
import ChatErrorBoundary from '@/components/chat/chat-error-boundary';

export default function Page() {
  return (
    <ChatErrorBoundary>
      <Suspense fallback={
        <div className="flex h-screen items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <p className="text-lg font-medium">Summoning the Sorcerer...</p>
            <p className="text-sm text-gray-500 mt-2">Preparing your magical experience</p>
          </div>
        </div>
      }>
        <Chat />
      </Suspense>
    </ChatErrorBoundary>
  );
}