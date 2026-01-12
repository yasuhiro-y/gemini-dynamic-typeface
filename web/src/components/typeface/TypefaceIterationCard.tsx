'use client';

import { TypefaceIterationResult, MathematicalDNA } from '@/types/typeface';
import { DownloadButtons } from '@/components/shared/DownloadButtons';
import { ScoreDisplay } from '@/components/shared/ScoreDisplay';
import { FeedbackSection } from '@/components/shared/FeedbackSection';
import { ComparisonTable } from './ComparisonTable';

interface TypefaceIterationCardProps {
  iteration: TypefaceIterationResult;
  referenceDNA?: MathematicalDNA;
  sessionId?: string;
}

export function TypefaceIterationCard({
  iteration,
  sessionId,
}: TypefaceIterationCardProps) {
  return (
    <div className="flex-shrink-0 w-80">
      {/* Image */}
      <div className="border border-white/10 mb-2 rounded-lg overflow-hidden">
        {iteration.imageUrl ? (
          <img
            src={iteration.imageUrl}
            alt={`Iteration ${iteration.iteration}`}
            className="w-full aspect-square object-contain bg-white"
          />
        ) : (
          <div className="w-full aspect-square bg-white/5 flex items-center justify-center">
            {iteration.status === 'error' ? (
              <span className="text-xs text-red-400">{iteration.errorMessage || 'Error'}</span>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                <span className="text-xs text-white/40">Generating...</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Download Buttons */}
      {iteration.imageUrl && (
        <DownloadButtons
          imageUrl={iteration.imageUrl}
          filenamePrefix="typoforge"
          iteration={iteration.iteration}
          showSvg={true}
        />
      )}

      {/* Header */}
      <div className="flex justify-between items-baseline mb-2">
        <span className="text-xs text-white/40">#{iteration.iteration}</span>
        <div className="text-xs text-white/30">
          {iteration.generationTime && <span>gen {(iteration.generationTime / 1000).toFixed(1)}s</span>}
          {iteration.evaluationTime && <span> · eval {(iteration.evaluationTime / 1000).toFixed(1)}s</span>}
        </div>
      </div>

      {/* Score */}
      <ScoreDisplay status={iteration.status} score={iteration.score} />

      {/* Comparison Table */}
      {iteration.comparison && (
        <ComparisonTable comparison={iteration.comparison} />
      )}

      {/* User Feedback Section */}
      {iteration.status === 'complete' && sessionId && (
        <FeedbackSection
          sessionId={sessionId}
          iteration={iteration.iteration}
          initialFeedback={iteration.userFeedback?.comment}
          initialRating={iteration.userFeedback?.rating}
        />
      )}
    </div>
  );
}
