// src/components/chat/tool-renderer.tsx
import { Wallet, TrendingUp, Sparkles, Search, Database } from 'lucide-react';

interface ToolRendererProps {
  toolInvocations: any[];
  messageId: string;
}

export default function ToolRenderer({
  toolInvocations,
  messageId,
}: ToolRendererProps) {
  return (
    <div className="w-full transition-all duration-300">
      {toolInvocations.map((tool) => {
        const { toolCallId, toolName } = tool;

        // Return specialized components based on tool name
        switch (toolName) {
          case 'seiBlockchainAnalyzer':
            return (
              <div
                key={toolCallId}
                className="w-full overflow-hidden rounded-lg border border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 p-4"
              >
                <div className="mb-2 flex items-center gap-2">
                  <Database className="h-5 w-5 text-blue-600" />
                  <h3 className="text-lg font-medium text-blue-900">Sei Blockchain Analysis</h3>
                </div>
                <div className="mt-2">
                  {typeof tool.result === 'object' ? (
                    <pre className="bg-white/60 overflow-x-auto rounded p-3 text-sm">
                      {JSON.stringify(tool.result, null, 2)}
                    </pre>
                  ) : (
                    <p className="text-blue-800">{String(tool.result)}</p>
                  )}
                </div>
              </div>
            );

          case 'walletAnalysis':
            return (
              <div
                key={toolCallId}
                className="w-full overflow-hidden rounded-lg border border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 p-4"
              >
                <div className="mb-2 flex items-center gap-2">
                  <Wallet className="h-5 w-5 text-green-600" />
                  <h3 className="text-lg font-medium text-green-900">Wallet Analysis</h3>
                </div>
                <div className="mt-2">
                  {typeof tool.result === 'object' ? (
                    <pre className="bg-white/60 overflow-x-auto rounded p-3 text-sm">
                      {JSON.stringify(tool.result, null, 2)}
                    </pre>
                  ) : (
                    <p className="text-green-800">{String(tool.result)}</p>
                  )}
                </div>
              </div>
            );

          case 'tokenFlowAnalysis':
            return (
              <div
                key={toolCallId}
                className="w-full overflow-hidden rounded-lg border border-purple-200 bg-gradient-to-br from-purple-50 to-violet-50 p-4"
              >
                <div className="mb-2 flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-purple-600" />
                  <h3 className="text-lg font-medium text-purple-900">Token Flow Analysis</h3>
                </div>
                <div className="mt-2">
                  {typeof tool.result === 'object' ? (
                    <pre className="bg-white/60 overflow-x-auto rounded p-3 text-sm">
                      {JSON.stringify(tool.result, null, 2)}
                    </pre>
                  ) : (
                    <p className="text-purple-800">{String(tool.result)}</p>
                  )}
                </div>
              </div>
            );

          case 'nftHistoryTracker':
            return (
              <div
                key={toolCallId}
                className="w-full overflow-hidden rounded-lg border border-pink-200 bg-gradient-to-br from-pink-50 to-rose-50 p-4"
              >
                <div className="mb-2 flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-pink-600" />
                  <h3 className="text-lg font-medium text-pink-900">NFT History Tracker</h3>
                </div>
                <div className="mt-2">
                  {typeof tool.result === 'object' ? (
                    <pre className="bg-white/60 overflow-x-auto rounded p-3 text-sm">
                      {JSON.stringify(tool.result, null, 2)}
                    </pre>
                  ) : (
                    <p className="text-pink-800">{String(tool.result)}</p>
                  )}
                </div>
              </div>
            );

          case 'transactionExplainer':
            return (
              <div
                key={toolCallId}
                className="w-full overflow-hidden rounded-lg border border-orange-200 bg-gradient-to-br from-orange-50 to-amber-50 p-4"
              >
                <div className="mb-2 flex items-center gap-2">
                  <Search className="h-5 w-5 text-orange-600" />
                  <h3 className="text-lg font-medium text-orange-900">Transaction Explainer</h3>
                </div>
                <div className="mt-2">
                  {typeof tool.result === 'object' ? (
                    <pre className="bg-white/60 overflow-x-auto rounded p-3 text-sm">
                      {JSON.stringify(tool.result, null, 2)}
                    </pre>
                  ) : (
                    <p className="text-orange-800">{String(tool.result)}</p>
                  )}
                </div>
              </div>
            );

          // Default renderer for other tools
          default:
            return (
              <div
                key={toolCallId}
                className="bg-secondary/10 w-full rounded-lg p-4"
              >
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-lg font-medium">{toolName}</h3>
                  <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-800 dark:bg-blue-900 dark:text-blue-100">
                    Blockchain Tool
                  </span>
                </div>
                <div className="mt-2">
                  {typeof tool.result === 'object' ? (
                    <pre className="bg-secondary/20 overflow-x-auto rounded p-3 text-sm">
                      {JSON.stringify(tool.result, null, 2)}
                    </pre>
                  ) : (
                    <p>{String(tool.result)}</p>
                  )}
                </div>
              </div>
            );
        }
      })}
    </div>
  );
}