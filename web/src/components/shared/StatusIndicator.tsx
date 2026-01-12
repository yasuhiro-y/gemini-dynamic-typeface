'use client';

import { SessionStatus } from '@/types/common';

interface StatusIndicatorProps {
  status: SessionStatus;
  currentStep: string;
  totalTime?: number;
  error?: string;
}

export function StatusIndicator({
  status,
  currentStep,
  totalTime,
  error,
}: StatusIndicatorProps) {
  const isProcessing = ['uploading', 'analyzing', 'generating', 'evaluating'].includes(status);

  return (
    <div className="mt-4">
      {currentStep && (
        <div className="flex items-center gap-2">
          {isProcessing && (
            <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
          )}
          <span className="text-xs text-white/60">{currentStep}</span>
          {totalTime && (
            <span className="text-xs text-white/40">({(totalTime / 1000).toFixed(1)}s)</span>
          )}
        </div>
      )}

      {error && (
        <div className="mt-2 text-xs text-red-400">{error}</div>
      )}
    </div>
  );
}
