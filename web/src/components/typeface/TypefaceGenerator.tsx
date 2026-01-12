'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { ImageDropzone } from '@/components/shared/ImageDropzone';
import { StatusIndicator } from '@/components/shared/StatusIndicator';
import { useImageUpload } from '@/hooks/useImageUpload';
import { useSSEStream } from '@/hooks/useSSEStream';
import { TypefaceSessionState, TypefaceIterationResult, MathematicalDNA, ScriptType } from '@/types/typeface';
import { TypefaceDNADisplay } from './TypefaceDNADisplay';
import { TypefaceIterationCard } from './TypefaceIterationCard';

// SSE message types
interface SSEMessage {
  type: string;
  [key: string]: unknown;
}

export function TypefaceGenerator() {
  const [targetText, setTargetText] = useState('');
  const { image, isDragging, fileInputRef, handlers, openFilePicker } = useImageUpload();
  
  const [session, setSession] = useState<TypefaceSessionState>({
    status: 'idle',
    currentStep: '',
    iterations: [],
  });

  const { isStreaming, start, cancel } = useSSEStream<SSEMessage>({
    onError: (error) => {
      setSession(prev => ({
        ...prev,
        status: 'error',
        error: error.message,
      }));
    },
  });

  const handleMessage = useCallback((data: SSEMessage) => {
    if (data.type === 'session') {
      setSession(prev => ({
        ...prev,
        sessionId: data.sessionId as string,
      }));
    } else if (data.type === 'status') {
      setSession(prev => ({
        ...prev,
        status: data.status as TypefaceSessionState['status'],
        currentStep: data.message as string,
      }));
    } else if (data.type === 'dna') {
      setSession(prev => ({
        ...prev,
        referenceDNA: data.dna as MathematicalDNA,
        scriptType: data.scriptType as ScriptType,
        analysisTime: data.time as number,
        currentStep: data.warning ? `⚠️ ${data.warning}` : prev.currentStep,
      }));
      if (data.warning) {
        console.warn('DNA Warning:', data.warning);
      }
      if (data.error) {
        console.error('DNA Error:', data.error);
      }
    } else if (data.type === 'iteration_start') {
      setSession(prev => {
        const exists = prev.iterations.find(i => i.iteration === data.iteration);
        if (exists) return prev;
        return {
          ...prev,
          iterations: [{
            iteration: data.iteration as number,
            status: 'generating' as const,
          }, ...prev.iterations],
        };
      });
    } else if (data.type === 'iteration_image') {
      setSession(prev => {
        const exists = prev.iterations.find(i => i.iteration === data.iteration);
        if (exists) {
          return {
            ...prev,
            iterations: prev.iterations.map(i =>
              i.iteration === data.iteration
                ? { ...i, imageUrl: data.imageUrl as string, status: 'evaluating' as const, generationTime: data.generationTime as number }
                : i
            ),
          };
        }
        return {
          ...prev,
          iterations: [{
            iteration: data.iteration as number,
            imageUrl: data.imageUrl as string,
            status: 'evaluating' as const,
            generationTime: data.generationTime as number,
          }, ...prev.iterations],
        };
      });
    } else if (data.type === 'iteration_eval') {
      setSession(prev => {
        const existing = prev.iterations.find(i => i.iteration === data.iteration);
        return {
          ...prev,
          iterations: prev.iterations.map(i =>
            i.iteration === data.iteration
              ? {
                  ...i,
                  imageUrl: i.imageUrl || existing?.imageUrl,
                  score: data.score as number,
                  comparison: data.comparison as TypefaceIterationResult['comparison'],
                  generatedDNA: data.generatedDNA as MathematicalDNA,
                  status: 'complete' as const,
                  evaluationTime: data.evaluationTime as number,
                }
              : i
          ),
        };
      });
    } else if (data.type === 'iteration_error') {
      setSession(prev => ({
        ...prev,
        iterations: prev.iterations.map(i =>
          i.iteration === data.iteration
            ? { ...i, status: 'error' as const, errorMessage: data.message as string }
            : i
        ),
      }));
    } else if (data.type === 'complete') {
      setSession(prev => ({
        ...prev,
        status: 'complete',
        currentStep: `Complete. Best score: ${data.bestScore}/100`,
        totalTime: data.totalTime as number,
      }));
    } else if (data.type === 'error') {
      setSession(prev => ({
        ...prev,
        status: 'error',
        error: data.message as string,
      }));
    }
  }, []);

  const handleSubmit = async () => {
    if (!image || !targetText.trim()) return;

    setSession({
      status: 'uploading',
      currentStep: 'Uploading reference image...',
      iterations: [],
    });

    try {
      await start('/api/forge', {
        referenceImage: image,
        targetText: targetText.trim(),
        maxIterations: 5,
      }, handleMessage);
    } catch {
      // Error is handled by onError callback
    }
  };

  const handleCancel = useCallback(() => {
    cancel();
    setSession(prev => ({
      ...prev,
      status: 'idle',
      currentStep: 'Cancelled',
    }));
  }, [cancel]);

  const isProcessing = isStreaming || ['uploading', 'analyzing', 'generating', 'evaluating'].includes(session.status);

  return (
    <>
      {/* Input Section */}
      <div className="mb-12 max-w-md">
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
          />
        </div>

        {/* Target Text */}
        <div className="flex gap-2 items-end">
          <textarea
            value={targetText}
            onChange={(e) => setTargetText(e.target.value)}
            placeholder="Target text (supports line breaks)"
            rows={2}
            className="flex-1 min-h-[40px] max-h-32 py-2 px-3 text-sm bg-transparent border border-white/20 text-white placeholder:text-white/40 rounded-lg focus:outline-none focus:border-white/60 resize-y"
          />
          {isProcessing ? (
            <Button
              onClick={handleCancel}
              variant="outline"
              className="h-10 px-6 border-white/30 text-white/60 rounded-lg hover:bg-white/10 hover:text-white"
            >
              Cancel
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={!image || !targetText.trim()}
              className="h-10 px-6 bg-white text-black rounded-lg hover:bg-white/90 disabled:opacity-30"
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
        <TypefaceDNADisplay dna={session.referenceDNA} analysisTime={session.analysisTime} />
      )}

      {/* Results Section */}
      {session.iterations.length > 0 && (
        <div className="border-t border-white/10 pt-8">
          <div className="text-xs text-white/40 mb-4">
            {session.iterations.length} iteration{session.iterations.length > 1 ? 's' : ''}
          </div>

          <div className="flex gap-6 overflow-x-auto pb-4">
            {session.iterations.map((iter) => (
              <TypefaceIterationCard
                key={iter.iteration}
                iteration={iter}
                referenceDNA={session.referenceDNA}
                sessionId={session.sessionId}
              />
            ))}
          </div>
        </div>
      )}
    </>
  );
}
