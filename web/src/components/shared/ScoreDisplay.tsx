'use client';

import { IterationStatus } from '@/types/common';

interface ScoreDisplayProps {
  status: IterationStatus;
  score?: number;
}

export function ScoreDisplay({ status, score }: ScoreDisplayProps) {
  if (status === 'evaluating') {
    return (
      <div className="mb-3">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 border border-white/20 border-t-white rounded-full animate-spin" />
          <span className="text-xs text-white/40">Evaluating...</span>
        </div>
        <div className="h-1 bg-white/10 mt-2 rounded">
          <div className="h-full bg-white/30 rounded animate-pulse" style={{ width: '60%' }} />
        </div>
      </div>
    );
  }

  if (score !== undefined) {
    return (
      <div className="mb-3">
        <div className="flex justify-between items-baseline mb-1">
          <span className="text-xs text-white/40">Score</span>
          <span className="text-lg font-medium text-white">{score}</span>
        </div>
        <div className="h-1 bg-white/10 rounded">
          <div
            className="h-full bg-white transition-all duration-500 rounded"
            style={{ width: `${score}%` }}
          />
        </div>
      </div>
    );
  }

  return null;
}
