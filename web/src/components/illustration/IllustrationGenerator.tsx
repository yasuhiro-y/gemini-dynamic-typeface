'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { ImageDropzone } from '@/components/shared/ImageDropzone';
import { StatusIndicator } from '@/components/shared/StatusIndicator';
import { useImageUpload } from '@/hooks/useImageUpload';
import { useSSEStream } from '@/hooks/useSSEStream';
import {
  IllustrationSessionState,
  IllustrationIterationResult,
  IllustrationDNA,
  IllustrationMode,
  ColorVariation,
} from '@/types/illustration';
import { IllustrationDNADisplay } from './IllustrationDNADisplay';
import { IllustrationResultCard } from './IllustrationResultCard';
import { ColorVariationGrid } from './ColorVariationGrid';

// SSE message types
interface SSEMessage {
  type: string;
  [key: string]: unknown;
}

export function IllustrationGenerator() {
  const [mode, setMode] = useState<IllustrationMode>('transform');
  const [targetSubject, setTargetSubject] = useState('');
  const [colorVariationCount, setColorVariationCount] = useState(3);
  const { image, isDragging, fileInputRef, handlers, openFilePicker } = useImageUpload();

  const [session, setSession] = useState<IllustrationSessionState>({
    status: 'idle',
    currentStep: '',
    mode: 'transform',
    colorVariationCount: 3,
    iterations: [],
  });

  const { isStreaming, start, cancel } = useSSEStream<SSEMessage>({
    onError: (error) => {
      setSession((prev) => ({
        ...prev,
        status: 'error',
        error: error.message,
      }));
    },
  });

  const handleMessage = useCallback((data: SSEMessage) => {
    if (data.type === 'session') {
      setSession((prev) => ({
        ...prev,
        sessionId: data.sessionId as string,
      }));
    } else if (data.type === 'status') {
      setSession((prev) => ({
        ...prev,
        status: data.status as IllustrationSessionState['status'],
        currentStep: data.message as string,
      }));
    } else if (data.type === 'dna') {
      setSession((prev) => ({
        ...prev,
        referenceDNA: data.dna as IllustrationDNA,
        analysisTime: data.time as number,
      }));
    } else if (data.type === 'iteration_start') {
      setSession((prev) => {
        const exists = prev.iterations.find((i) => i.iteration === data.iteration);
        if (exists) return prev;
        return {
          ...prev,
          iterations: [
            {
              iteration: data.iteration as number,
              status: 'generating' as const,
            },
            ...prev.iterations,
          ],
        };
      });
    } else if (data.type === 'iteration_image') {
      setSession((prev) => {
        const exists = prev.iterations.find((i) => i.iteration === data.iteration);
        if (exists) {
          return {
            ...prev,
            iterations: prev.iterations.map((i) =>
              i.iteration === data.iteration
                ? {
                    ...i,
                    imageUrl: data.imageUrl as string,
                    status: 'evaluating' as const,
                    generationTime: data.generationTime as number,
                  }
                : i
            ),
          };
        }
        return {
          ...prev,
          iterations: [
            {
              iteration: data.iteration as number,
              imageUrl: data.imageUrl as string,
              status: 'evaluating' as const,
              generationTime: data.generationTime as number,
            },
            ...prev.iterations,
          ],
        };
      });
    } else if (data.type === 'iteration_eval') {
      setSession((prev) => {
        const existing = prev.iterations.find((i) => i.iteration === data.iteration);
        return {
          ...prev,
          iterations: prev.iterations.map((i) =>
            i.iteration === data.iteration
              ? {
                  ...i,
                  imageUrl: i.imageUrl || existing?.imageUrl,
                  score: data.score as number,
                  generatedDNA: data.generatedDNA as IllustrationDNA,
                  status: 'complete' as const,
                  evaluationTime: data.evaluationTime as number,
                }
              : i
          ),
        };
      });
    } else if (data.type === 'color_variation') {
      const variation = data.variation as ColorVariation;
      setSession((prev) => {
        // Find the iteration to update
        const iterationIndex = prev.iterations.findIndex(
          (i) => i.iteration === data.iteration
        );
        if (iterationIndex === -1) return prev;

        const updatedIterations = [...prev.iterations];
        const currentIteration = updatedIterations[iterationIndex];
        const existingVariations = currentIteration.colorVariations || [];

        // Update or add the variation
        const existingIndex = existingVariations.findIndex(
          (v) => v.id === variation.id
        );
        if (existingIndex >= 0) {
          existingVariations[existingIndex] = variation;
        } else {
          existingVariations.push(variation);
        }

        updatedIterations[iterationIndex] = {
          ...currentIteration,
          colorVariations: existingVariations,
        };

        return {
          ...prev,
          iterations: updatedIterations,
        };
      });
    } else if (data.type === 'iteration_error') {
      setSession((prev) => ({
        ...prev,
        iterations: prev.iterations.map((i) =>
          i.iteration === data.iteration
            ? { ...i, status: 'error' as const, errorMessage: data.message as string }
            : i
        ),
      }));
    } else if (data.type === 'complete') {
      setSession((prev) => ({
        ...prev,
        status: 'complete',
        currentStep: `Complete. Best score: ${data.bestScore}/100`,
        totalTime: data.totalTime as number,
      }));
    } else if (data.type === 'error') {
      setSession((prev) => ({
        ...prev,
        status: 'error',
        error: data.message as string,
      }));
    }
  }, []);

  const handleSubmit = async () => {
    if (!image || !targetSubject.trim()) return;

    setSession({
      status: 'uploading',
      currentStep: 'Uploading reference image...',
      mode,
      colorVariationCount,
      iterations: [],
    });

    try {
      await start(
        '/api/illustrate',
        {
          referenceImage: image,
          mode,
          targetSubject: targetSubject.trim(),
          colorVariationCount,
          maxIterations: 3,
        },
        handleMessage
      );
    } catch {
      // Error is handled by onError callback
    }
  };

  const handleCancel = useCallback(() => {
    cancel();
    setSession((prev) => ({
      ...prev,
      status: 'idle',
      currentStep: 'Cancelled',
    }));
  }, [cancel]);

  const isProcessing =
    isStreaming ||
    ['uploading', 'analyzing', 'generating', 'evaluating'].includes(session.status);

  // Get the latest iteration with color variations
  const latestIterationWithVariations = session.iterations.find(
    (i) => i.colorVariations && i.colorVariations.length > 0
  );

  return (
    <>
      {/* Input Section */}
      <div className="mb-12 max-w-lg">
        {/* Reference Image */}
        <div className="mb-4">
          <ImageDropzone
            image={image}
            isDragging={isDragging}
            fileInputRef={fileInputRef}
            onPaste={handlers.handlePaste}
            onDragOver={handlers.handleDragOver}
            onDragLeave={handlers.handleDragLeave}
            onDrop={handlers.handleDrop}
            onFileChange={handlers.handleFileChange}
            onClick={openFilePicker}
            placeholder="Drop reference illustration"
          />
        </div>

        {/* Mode Selection */}
        <div className="mb-4">
          <div className="text-xs text-white/40 mb-2">Mode</div>
          <div className="flex gap-2">
            <button
              onClick={() => setMode('transform')}
              className={`flex-1 py-2 px-4 text-sm rounded-lg border transition-colors ${
                mode === 'transform'
                  ? 'border-white bg-white/10 text-white'
                  : 'border-white/20 text-white/40 hover:border-white/40'
              }`}
            >
              Transform
              <span className="block text-[10px] text-white/30 mt-0.5">
                別のモチーフを生成
              </span>
            </button>
            <button
              onClick={() => setMode('extend')}
              className={`flex-1 py-2 px-4 text-sm rounded-lg border transition-colors ${
                mode === 'extend'
                  ? 'border-white bg-white/10 text-white'
                  : 'border-white/20 text-white/40 hover:border-white/40'
              }`}
            >
              Extend
              <span className="block text-[10px] text-white/30 mt-0.5">
                バリエーションを生成
              </span>
            </button>
          </div>
        </div>

        {/* Target Subject Input */}
        <div className="mb-4">
          <div className="text-xs text-white/40 mb-2">
            {mode === 'transform' ? 'Generate Subject' : 'Variation Description'}
          </div>
          <textarea
            value={targetSubject}
            onChange={(e) => setTargetSubject(e.target.value)}
            placeholder={
              mode === 'transform'
                ? '例: 犬, 建物, 食べ物...'
                : '例: 別ポーズ, 季節違い, 表情違い...'
            }
            rows={2}
            className="w-full py-2 px-3 text-sm bg-transparent border border-white/20 text-white placeholder:text-white/40 rounded-lg focus:outline-none focus:border-white/60 resize-y"
          />
        </div>

        {/* Color Variation Count */}
        <div className="mb-4">
          <div className="text-xs text-white/40 mb-2">
            Color Variations: {colorVariationCount}
          </div>
          <input
            type="range"
            min="1"
            max="5"
            value={colorVariationCount}
            onChange={(e) => setColorVariationCount(parseInt(e.target.value))}
            className="w-full accent-white"
          />
          <div className="flex justify-between text-[10px] text-white/30 mt-1">
            <span>1</span>
            <span>5</span>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex gap-2">
          {isProcessing ? (
            <Button
              onClick={handleCancel}
              variant="outline"
              className="flex-1 h-10 border-white/30 text-white/60 rounded-lg hover:bg-white/10 hover:text-white"
            >
              Cancel
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={!image || !targetSubject.trim()}
              className="flex-1 h-10 bg-white text-black rounded-lg hover:bg-white/90 disabled:opacity-30"
            >
              Generate
            </Button>
          )}
        </div>

        {/* Status */}
        <StatusIndicator
          status={session.status}
          currentStep={session.currentStep}
          totalTime={session.totalTime}
          error={session.error}
        />
      </div>

      {/* DNA Section */}
      {session.referenceDNA && (
        <IllustrationDNADisplay
          dna={session.referenceDNA}
          analysisTime={session.analysisTime}
        />
      )}

      {/* Results Section */}
      {session.iterations.length > 0 && (
        <div className="border-t border-white/10 pt-8">
          <div className="text-xs text-white/40 mb-4">
            {session.iterations.length} iteration
            {session.iterations.length > 1 ? 's' : ''}
          </div>

          <div className="flex gap-6 overflow-x-auto pb-4">
            {session.iterations.map((iter) => (
              <IllustrationResultCard
                key={iter.iteration}
                iteration={iter}
                referenceDNA={session.referenceDNA}
                sessionId={session.sessionId}
              />
            ))}
          </div>

          {/* Color Variations Grid */}
          {latestIterationWithVariations?.colorVariations && (
            <ColorVariationGrid
              variations={latestIterationWithVariations.colorVariations}
              sessionId={session.sessionId}
            />
          )}
        </div>
      )}
    </>
  );
}
