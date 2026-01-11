'use client';

import { useState, useRef, useCallback, DragEvent, useEffect } from 'react';
import { Button } from '@/components/ui/button';

// === MATHEMATICAL DNA INTERFACE ===
type ScriptType = 'latin' | 'japanese' | 'mixed';

interface MathematicalDNA {
  scriptType: ScriptType;
  metrics: {
    imageWidth: number;
    imageHeight: number;
    capHeight: number;
    xHeight: number;
    baseline: number;
    meanline: number;
  };
  stroke: {
    thickestPx: number;
    thinnestPx: number;
    contrastRatio: number;
    averageWeightPx: number;
    weightToCapRatio: number;
  };
  geometry: {
    curveRadiusPx: number;
    curveEccentricity: number;
    outerCornerRadiusPx: number;
    innerCornerRadiusPx: number;
    cornerRadiusRatio: number;
    inkTrapDepthPx: number;
    inkTrapAngleDeg: number;
  };
  terminals: {
    cutAngleDeg: number;
    roundnessFactor: number;
    serifLengthPx: number;
    serifThicknessPx: number;
  };
  spacing: {
    letterSpacingPx: number;
    letterSpacingRatio: number;
    wordSpacingPx: number;
    sideBearingPx: number;
  };
  proportions: {
    widthToHeightRatio: number;
    xHeightToCapRatio: number;
    counterAreaRatio: number;
    negativeSpaceRatio: number;
  };
  features: {
    hasStencilGaps: boolean;
    stencilGapWidthPx: number;
    hasLigatures: boolean;
    hasTouchingLetters: boolean;
  };
  japanese?: {
    styleCategory: 'geometric' | 'calligraphic' | 'gothic' | 'mincho' | 'handwritten' | 'decorative';
    strokeComplexity: number;
    radicalBalance: number;
    haraiFactor: number;
    tomeFactor: number;
    haneFactor: number;
    squareness: number;
    densityCenter: number;
    isMincho: boolean;
    isGothic: boolean;
    isHandwritten: boolean;
    kanaRoundness: number;
    kanaConnectionFluidity: number;
    // Geometric logotype features
    isGeometricLogotype: boolean;
    isModularGrid: boolean;
    gridUnitPx: number;
    cornerRadiusPx: number;
    isMonoline: boolean;
    hasStencilBreaks: boolean;
    strokeEndStyle: 'flat' | 'round' | 'angled' | 'brush' | 'tapered';
    counterStyle: 'geometric' | 'organic' | 'traditional' | 'flowing';
    verticalAlignment: 'baseline' | 'center' | 'top' | 'dynamic';
    horizontalCompression: number;
    // Calligraphic features
    isCalligraphic: boolean;
    brushAngleDeg: number;
    baselineAngleDeg: number;
    italicAngleDeg: number;
    strokeRhythm: 'uniform' | 'flowing' | 'dramatic' | 'staccato';
    entryStrokeStyle: 'sharp' | 'soft' | 'hairline' | 'bold';
    exitStrokeStyle: 'sharp' | 'tapered' | 'flourish' | 'abrupt';
    thickThinTransition: 'gradual' | 'sudden' | 'smooth';
    overallElegance: number;
    connectedness: number;
    dynamicRange: number;
  };
}

interface DNAComparison {
  strokeContrastDiff: number;
  strokeWeightDiff: number;
  curveRadiusDiff: number;
  cornerRadiusDiff: number;
  inkTrapDepthDiff: number;
  spacingDiff: number;
  proportionDiff: number;
  terminalDiff: number;
  featureMatch: boolean;
  overallScore: number;
  japaneseDiffs?: {
    strokeComplexityDiff: number;
    haraiFactor: number;
    tomeFactor: number;
    haneFactor: number;
    squarenessDiff: number;
    styleMatch: boolean;
  };
  geometricDiffs?: {
    cornerRadiusDiff: number;
    gridMatch: boolean;
    monolineMatch: boolean;
    stencilMatch: boolean;
    strokeEndMatch: boolean;
    counterMatch: boolean;
    compressionDiff: number;
  };
  calligraphicDiffs?: {
    brushAngleDiff: number;
    baselineDiff: number;
    italicDiff: number;
    rhythmMatch: boolean;
    entryMatch: boolean;
    exitMatch: boolean;
    eleganceDiff: number;
    connectednessDiff: number;
    dynamicDiff: number;
  };
}

interface IterationResult {
  iteration: number;
  imageUrl?: string;
  score?: number;
  comparison?: DNAComparison;
  generatedDNA?: MathematicalDNA;
  status: 'starting' | 'generating' | 'evaluating' | 'complete' | 'error';
  generationTime?: number;
  evaluationTime?: number;
  errorMessage?: string;
}

interface SessionState {
  status: 'idle' | 'uploading' | 'analyzing' | 'generating' | 'evaluating' | 'complete' | 'error';
  currentStep: string;
  iterations: IterationResult[];
  referenceDNA?: MathematicalDNA;
  scriptType?: ScriptType;
  analysisTime?: number;
  totalTime?: number;
  error?: string;
}

export default function Home() {
  const [targetText, setTargetText] = useState('');
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [session, setSession] = useState<SessionState>({
    status: 'idle',
    currentStep: '',
    iterations: []
  });
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Cleanup on unmount - abort any ongoing request
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const handleFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      setReferenceImage(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  }, []);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) handleFile(file);
        break;
      }
    }
  }, [handleFile]);

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file?.type.startsWith('image/')) {
      handleFile(file);
    }
  }, [handleFile]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleCancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setSession(prev => ({
        ...prev,
        status: 'idle',
        currentStep: 'Cancelled'
      }));
    }
  }, []);

  const handleSubmit = async () => {
    if (!referenceImage || !targetText.trim()) return;

    // Abort any previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();

    setSession({
      status: 'uploading',
      currentStep: 'Uploading reference image...',
      iterations: []
    });

    try {
      const response = await fetch('/api/forge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          referenceImage,
          targetText: targetText.trim(),
          maxIterations: 5
        }),
        signal: abortControllerRef.current.signal
      });

      if (!response.ok) throw new Error('Failed to start forge');

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let buffer = '';
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        
        // Process complete SSE messages (each ends with \n\n)
        let boundary = buffer.indexOf('\n\n');
        while (boundary !== -1) {
          const message = buffer.slice(0, boundary);
          buffer = buffer.slice(boundary + 2);
          
          // Extract data from the message
          if (message.startsWith('data: ')) {
            try {
              const data = JSON.parse(message.slice(6));
            
            if (data.type === 'status') {
              setSession(prev => ({
                ...prev,
                status: data.status,
                currentStep: data.message
              }));
            } else if (data.type === 'dna') {
              setSession(prev => ({
                ...prev,
                referenceDNA: data.dna,
                scriptType: data.scriptType,
                analysisTime: data.time
              }));
            } else if (data.type === 'iteration_start') {
              // Add new iteration with 'starting' status
              setSession(prev => {
                const exists = prev.iterations.find(i => i.iteration === data.iteration);
                if (exists) return prev;
                return {
                  ...prev,
                  iterations: [{
                    iteration: data.iteration,
                    status: 'generating' as const
                  }, ...prev.iterations]
                };
              });
            } else if (data.type === 'iteration_image') {
              // Update iteration with image - or create if not exists
              setSession(prev => {
                const exists = prev.iterations.find(i => i.iteration === data.iteration);
                if (exists) {
                  return {
                    ...prev,
                    iterations: prev.iterations.map(i => 
                      i.iteration === data.iteration 
                        ? { ...i, imageUrl: data.imageUrl, status: 'evaluating' as const, generationTime: data.generationTime }
                        : i
                    )
                  };
                }
                // Create new if doesn't exist
                return {
                  ...prev,
                  iterations: [{
                    iteration: data.iteration,
                    imageUrl: data.imageUrl,
                    status: 'evaluating' as const,
                    generationTime: data.generationTime
                  }, ...prev.iterations]
                };
              });
            } else if (data.type === 'iteration_eval') {
              // Update iteration with evaluation results - preserve imageUrl
              setSession(prev => {
                const existing = prev.iterations.find(i => i.iteration === data.iteration);
                return {
                  ...prev,
                  iterations: prev.iterations.map(i => 
                    i.iteration === data.iteration 
                      ? { 
                          ...i,
                          imageUrl: i.imageUrl || existing?.imageUrl,
                          score: data.score, 
                          comparison: data.comparison,
                          generatedDNA: data.generatedDNA,
                          status: 'complete' as const,
                          evaluationTime: data.evaluationTime 
                        }
                      : i
                  )
                };
              });
            } else if (data.type === 'iteration_error') {
              setSession(prev => ({
                ...prev,
                iterations: prev.iterations.map(i => 
                  i.iteration === data.iteration 
                    ? { ...i, status: 'error' as const, errorMessage: data.message }
                    : i
                )
              }));
            } else if (data.type === 'complete') {
              setSession(prev => ({
                ...prev,
                status: 'complete',
                currentStep: `Complete. Best score: ${data.bestScore}/100`,
                totalTime: data.totalTime
              }));
            } else if (data.type === 'error') {
              setSession(prev => ({
                ...prev,
                status: 'error',
                error: data.message
              }));
            }
            } catch {
              // Skip invalid JSON
            }
          }
          
          boundary = buffer.indexOf('\n\n');
        }
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        // Request was aborted, don't show error
        return;
      }
      setSession(prev => ({
        ...prev,
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      }));
    }
  };

  const isProcessing = ['uploading', 'analyzing', 'generating', 'evaluating'].includes(session.status);

  return (
    <main className="min-h-screen p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-12">
        <h1 className="text-sm font-medium tracking-wide mb-1 text-white">Typo-Forge</h1>
        <p className="text-xs text-white/40">Mathematical typeface analysis & transfer</p>
      </div>

      {/* Input Section */}
      <div className="mb-12 max-w-md">
        {/* Reference Image */}
        <div 
          className={`mb-4 border h-32 flex items-center justify-center cursor-pointer transition-colors rounded-lg overflow-hidden ${
            isDragging ? 'border-white bg-white/10' : 'border-white/20 hover:border-white/40'
          }`}
          onClick={() => fileInputRef.current?.click()}
          onPaste={handlePaste}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          tabIndex={0}
        >
          {referenceImage ? (
            <img 
              src={referenceImage} 
              alt="Reference" 
              className="h-full w-full object-contain"
            />
          ) : (
            <span className="text-xs text-white/40">
              {isDragging ? 'Drop here' : 'Drop, paste or click to upload'}
            </span>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />

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
              disabled={!referenceImage || !targetText.trim()}
              className="h-10 px-6 bg-white text-black rounded-lg hover:bg-white/90 disabled:opacity-30"
            >
              Generate
            </Button>
          )}
        </div>

        {/* Status */}
        {session.currentStep && (
          <div className="mt-4 flex items-center gap-2">
            {isProcessing && (
              <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
            )}
            <span className="text-xs text-white/60">{session.currentStep}</span>
            {session.totalTime && (
              <span className="text-xs text-white/40">({(session.totalTime / 1000).toFixed(1)}s)</span>
            )}
          </div>
        )}

        {session.error && (
          <div className="mt-4 text-xs text-red-400">{session.error}</div>
        )}
      </div>

      {/* DNA Section */}
      {session.referenceDNA && (
        <DNADisplay dna={session.referenceDNA} analysisTime={session.analysisTime} />
      )}

      {/* Results Section */}
      {session.iterations.length > 0 && (
        <div className="border-t border-white/10 pt-8">
          <div className="text-xs text-white/40 mb-4">
            {session.iterations.length} iteration{session.iterations.length > 1 ? 's' : ''}
          </div>
          
          <div className="flex gap-6 overflow-x-auto pb-4">
            {session.iterations.map((iter) => (
              <IterationCard 
                key={iter.iteration} 
                iteration={iter} 
                referenceDNA={session.referenceDNA}
              />
            ))}
          </div>
        </div>
      )}
    </main>
  );
}

// === DNA DISPLAY COMPONENT ===
function DNADisplay({ dna, analysisTime }: { dna: MathematicalDNA; analysisTime?: number }) {
  const isJapanese = dna.scriptType === 'japanese' || dna.scriptType === 'mixed';
  const styleCategory = dna.japanese?.styleCategory || 'gothic';
  const isGeometric = styleCategory === 'geometric' || dna.japanese?.isGeometricLogotype || dna.japanese?.isModularGrid || dna.japanese?.isMonoline;
  const isCalligraphic = styleCategory === 'calligraphic' || dna.japanese?.isCalligraphic;
  const scriptLabel = dna.scriptType === 'japanese' ? '日本語' : dna.scriptType === 'mixed' ? '日本語+Latin' : 'Latin';
  const styleLabel = isGeometric ? 'Geometric' : isCalligraphic ? 'Calligraphic' : styleCategory !== 'gothic' ? styleCategory : '';

  return (
    <div className="mb-8 p-4 border border-white/10 rounded-lg">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-xs text-white/40 uppercase tracking-wider">Reference DNA</span>
          <span className="text-[10px] text-white/30 px-2 py-0.5 bg-white/5 rounded">{scriptLabel}</span>
          {styleLabel && <span className="text-[10px] text-blue-400/60 px-2 py-0.5 bg-blue-400/10 rounded">{styleLabel}</span>}
        </div>
        {analysisTime && (
          <span className="text-xs text-white/30">{(analysisTime / 1000).toFixed(1)}s</span>
        )}
      </div>
      
      <div className={`grid grid-cols-2 md:grid-cols-3 ${isJapanese ? 'lg:grid-cols-4' : 'lg:grid-cols-6'} gap-4 text-xs`}>
        {/* Stroke */}
        <div className="space-y-1">
          <div className="text-white/30 uppercase text-[10px] tracking-wider mb-2">Stroke</div>
          <Row label="Thick" value={`${dna.stroke.thickestPx}px`} />
          <Row label="Thin" value={`${dna.stroke.thinnestPx}px`} />
          <Row label="Contrast" value={`${dna.stroke.contrastRatio.toFixed(1)}:1`} />
          <Row label="Avg" value={`${dna.stroke.averageWeightPx}px`} />
        </div>

        {/* Geometry (Latin only) */}
        {!isJapanese && (
          <div className="space-y-1">
            <div className="text-white/30 uppercase text-[10px] tracking-wider mb-2">Geometry</div>
            <Row label="Curve R" value={`${dna.geometry.curveRadiusPx}px`} />
            <Row label="Corner R" value={`${dna.geometry.outerCornerRadiusPx}px`} />
            <Row label="Ink Trap" value={`${dna.geometry.inkTrapDepthPx}px`} />
            <Row label="Eccentric" value={dna.geometry.curveEccentricity.toFixed(2)} />
          </div>
        )}

        {/* Terminals (Latin only) */}
        {!isJapanese && (
          <div className="space-y-1">
            <div className="text-white/30 uppercase text-[10px] tracking-wider mb-2">Terminals</div>
            <Row label="Cut°" value={`${dna.terminals.cutAngleDeg}°`} />
            <Row label="Round" value={dna.terminals.roundnessFactor.toFixed(2)} />
            <Row label="Serif L" value={`${dna.terminals.serifLengthPx}px`} />
            <Row label="Serif T" value={`${dna.terminals.serifThicknessPx}px`} />
          </div>
        )}

        {/* Japanese Geometric Logotype - special display */}
        {isJapanese && isGeometric && dna.japanese && (
          <>
            <div className="space-y-1">
              <div className="text-white/30 uppercase text-[10px] tracking-wider mb-2">構造</div>
              <Row label="Grid" value={dna.japanese.isModularGrid ? 'Yes' : 'No'} />
              <Row label="Monoline" value={dna.japanese.isMonoline ? 'Yes' : 'No'} />
              <Row label="Grid Unit" value={`${dna.japanese.gridUnitPx}px`} />
              <Row label="Compress" value={dna.japanese.horizontalCompression.toFixed(2)} />
            </div>
            <div className="space-y-1">
              <div className="text-white/30 uppercase text-[10px] tracking-wider mb-2">角・端</div>
              <Row label="Corner R" value={`${dna.japanese.cornerRadiusPx}px`} />
              <Row label="End Style" value={dna.japanese.strokeEndStyle} />
              <Row label="Stencil" value={dna.japanese.hasStencilBreaks ? 'Yes' : 'No'} />
              <Row label="Counter" value={dna.japanese.counterStyle} />
            </div>
          </>
        )}

        {/* Japanese Calligraphic Logotype - special display */}
        {isJapanese && isCalligraphic && dna.japanese && (
          <>
            <div className="space-y-1">
              <div className="text-white/30 uppercase text-[10px] tracking-wider mb-2">角度</div>
              <Row label="Brush°" value={`${dna.japanese.brushAngleDeg}°`} />
              <Row label="Baseline°" value={`${dna.japanese.baselineAngleDeg}°`} />
              <Row label="Italic°" value={`${dna.japanese.italicAngleDeg}°`} />
            </div>
            <div className="space-y-1">
              <div className="text-white/30 uppercase text-[10px] tracking-wider mb-2">筆致</div>
              <Row label="Rhythm" value={dna.japanese.strokeRhythm} />
              <Row label="Entry" value={dna.japanese.entryStrokeStyle} />
              <Row label="Exit" value={dna.japanese.exitStrokeStyle} />
              <Row label="Trans" value={dna.japanese.thickThinTransition} />
            </div>
            <div className="space-y-1">
              <div className="text-white/30 uppercase text-[10px] tracking-wider mb-2">印象</div>
              <Row label="Elegant" value={dna.japanese.overallElegance.toFixed(2)} />
              <Row label="Connect" value={dna.japanese.connectedness.toFixed(2)} />
              <Row label="Dynamic" value={dna.japanese.dynamicRange.toFixed(2)} />
            </div>
          </>
        )}

        {/* Japanese-specific: Brush Strokes (standard - not geometric or calligraphic) */}
        {isJapanese && !isGeometric && !isCalligraphic && dna.japanese && (
          <div className="space-y-1">
            <div className="text-white/30 uppercase text-[10px] tracking-wider mb-2">筆画</div>
            <Row label="払い" value={dna.japanese.haraiFactor.toFixed(2)} />
            <Row label="止め" value={dna.japanese.tomeFactor.toFixed(2)} />
            <Row label="跳ね" value={dna.japanese.haneFactor.toFixed(2)} />
            <Row label="画数" value={dna.japanese.strokeComplexity.toFixed(0)} />
          </div>
        )}

        {/* Japanese-specific: Structure (non-geometric) */}
        {isJapanese && !isGeometric && dna.japanese && (
          <div className="space-y-1">
            <div className="text-white/30 uppercase text-[10px] tracking-wider mb-2">構造</div>
            <Row label="正方度" value={dna.japanese.squareness.toFixed(2)} />
            <Row label="重心" value={dna.japanese.densityCenter.toFixed(2)} />
            <Row label="部首" value={dna.japanese.radicalBalance.toFixed(2)} />
          </div>
        )}

        {/* Spacing */}
        <div className="space-y-1">
          <div className="text-white/30 uppercase text-[10px] tracking-wider mb-2">Spacing</div>
          <Row label="Letter" value={`${dna.spacing.letterSpacingPx}px`} />
          <Row label="Ratio" value={dna.spacing.letterSpacingRatio.toFixed(2)} />
          <Row label="Side" value={`${dna.spacing.sideBearingPx}px`} />
        </div>

        {/* Proportions */}
        <div className="space-y-1">
          <div className="text-white/30 uppercase text-[10px] tracking-wider mb-2">Proportions</div>
          <Row label="W/H" value={dna.proportions.widthToHeightRatio.toFixed(2)} />
          <Row label="x/Cap" value={dna.proportions.xHeightToCapRatio.toFixed(2)} />
          <Row label="Counter" value={dna.proportions.counterAreaRatio.toFixed(2)} />
        </div>

        {/* Japanese-specific: Style (non-geometric) */}
        {isJapanese && !isGeometric && dna.japanese && (
          <div className="space-y-1">
            <div className="text-white/30 uppercase text-[10px] tracking-wider mb-2">書体</div>
            <Row label="明朝" value={dna.japanese.isMincho ? 'Yes' : 'No'} />
            <Row label="ゴシック" value={dna.japanese.isGothic ? 'Yes' : 'No'} />
            <Row label="手書き" value={dna.japanese.isHandwritten ? 'Yes' : 'No'} />
            <Row label="仮名丸み" value={dna.japanese.kanaRoundness.toFixed(2)} />
          </div>
        )}

        {/* Features (Latin only) */}
        {!isJapanese && (
          <div className="space-y-1">
            <div className="text-white/30 uppercase text-[10px] tracking-wider mb-2">Features</div>
            <Row label="Stencil" value={dna.features.hasStencilGaps ? 'Yes' : 'No'} />
            <Row label="Gap" value={`${dna.features.stencilGapWidthPx}px`} />
            <Row label="Ligature" value={dna.features.hasLigatures ? 'Yes' : 'No'} />
            <Row label="Touch" value={dna.features.hasTouchingLetters ? 'Yes' : 'No'} />
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-white/50">{label}</span>
      <span className="text-white font-mono">{value}</span>
    </div>
  );
}

// === ITERATION CARD COMPONENT ===
function IterationCard({ 
  iteration, 
  referenceDNA 
}: { 
  iteration: IterationResult;
  referenceDNA?: MathematicalDNA;
}) {
  const [isConvertingSvg, setIsConvertingSvg] = useState(false);
  const [svgError, setSvgError] = useState<string | null>(null);

  const handlePngDownload = () => {
    if (!iteration.imageUrl) return;
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const link = document.createElement('a');
    link.href = iteration.imageUrl;
    link.download = `typoforge_${timestamp}_iter${String(iteration.iteration).padStart(2, '0')}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSvgDownload = async () => {
    if (!iteration.imageUrl) return;
    
    setIsConvertingSvg(true);
    setSvgError(null);
    
    try {
      const response = await fetch('/api/convert-svg', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageData: iteration.imageUrl,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Conversion failed');
      }
      
      const { svg } = await response.json();
      
      // Create blob and download
      const blob = new Blob([svg], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const link = document.createElement('a');
      link.href = url;
      link.download = `typoforge_${timestamp}_iter${String(iteration.iteration).padStart(2, '0')}.svg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('SVG conversion error:', error);
      setSvgError(error instanceof Error ? error.message : 'Conversion failed');
    } finally {
      setIsConvertingSvg(false);
    }
  };

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
        <div className="flex gap-2 mb-3">
          <button
            onClick={handlePngDownload}
            className="flex-1 py-1.5 text-xs text-white/60 border border-white/10 rounded-lg hover:bg-white/5 hover:text-white/80 transition-colors"
          >
            ↓ PNG
          </button>
          <button
            onClick={handleSvgDownload}
            disabled={isConvertingSvg}
            className="flex-1 py-1.5 text-xs text-white/60 border border-white/10 rounded-lg hover:bg-white/5 hover:text-white/80 transition-colors disabled:opacity-50 disabled:cursor-wait"
          >
            {isConvertingSvg ? (
              <span className="flex items-center justify-center gap-1">
                <span className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" />
                Converting...
              </span>
            ) : (
              '↓ SVG'
            )}
          </button>
        </div>
      )}
      
      {/* SVG Error Message */}
      {svgError && (
        <div className="mb-2 text-xs text-red-400/80 text-center">
          SVG: {svgError}
        </div>
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
      {iteration.status === 'evaluating' ? (
        <div className="mb-3">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 border border-white/20 border-t-white rounded-full animate-spin" />
            <span className="text-xs text-white/40">Evaluating...</span>
          </div>
          <div className="h-1 bg-white/10 mt-2 rounded">
            <div className="h-full bg-white/30 rounded animate-pulse" style={{ width: '60%' }} />
          </div>
        </div>
      ) : iteration.score !== undefined ? (
        <div className="mb-3">
          <div className="flex justify-between items-baseline mb-1">
            <span className="text-xs text-white/40">Score</span>
            <span className="text-lg font-medium text-white">{iteration.score}</span>
          </div>
          <div className="h-1 bg-white/10 rounded">
            <div 
              className="h-full bg-white transition-all duration-500 rounded"
              style={{ width: `${iteration.score}%` }}
            />
          </div>
        </div>
      ) : null}

      {/* Comparison Table */}
      {iteration.comparison && (
        <ComparisonTable comparison={iteration.comparison} />
      )}
    </div>
  );
}

// === COMPARISON TABLE COMPONENT ===
function ComparisonTable({ comparison }: { comparison: DNAComparison }) {
  const isJapanese = !!comparison.japaneseDiffs;
  const isGeometric = !!comparison.geometricDiffs;
  const isCalligraphic = !!comparison.calligraphicDiffs;

  const latinRows = [
    { label: 'Stroke Contrast', diff: comparison.strokeContrastDiff },
    { label: 'Stroke Weight', diff: comparison.strokeWeightDiff },
    { label: 'Curve Radius', diff: comparison.curveRadiusDiff },
    { label: 'Corner Radius', diff: comparison.cornerRadiusDiff },
    { label: 'Ink Trap', diff: comparison.inkTrapDepthDiff },
    { label: 'Spacing', diff: comparison.spacingDiff },
    { label: 'Proportions', diff: comparison.proportionDiff },
    { label: 'Terminals', diff: comparison.terminalDiff },
  ];

  const japaneseRows = comparison.japaneseDiffs ? [
    { label: 'Stroke Weight', diff: comparison.strokeWeightDiff },
    { label: 'Contrast', diff: comparison.strokeContrastDiff },
    { label: '払い (Harai)', diff: comparison.japaneseDiffs.haraiFactor },
    { label: '止め (Tome)', diff: comparison.japaneseDiffs.tomeFactor },
    { label: '跳ね (Hane)', diff: comparison.japaneseDiffs.haneFactor },
    { label: '正方度', diff: comparison.japaneseDiffs.squarenessDiff },
    { label: 'Spacing', diff: comparison.spacingDiff },
    { label: 'Proportions', diff: comparison.proportionDiff },
  ] : [];

  const geometricRows = comparison.geometricDiffs ? [
    { label: 'Stroke Weight', diff: comparison.strokeWeightDiff },
    { label: 'Corner Radius', diff: comparison.geometricDiffs.cornerRadiusDiff },
    { label: 'Compression', diff: comparison.geometricDiffs.compressionDiff },
    { label: 'Spacing', diff: comparison.spacingDiff },
  ] : [];

  const calligraphicRows = comparison.calligraphicDiffs ? [
    { label: 'Contrast', diff: comparison.strokeContrastDiff },
    { label: 'Brush Angle', diff: comparison.calligraphicDiffs.brushAngleDiff },
    { label: 'Baseline', diff: comparison.calligraphicDiffs.baselineDiff },
    { label: 'Italic', diff: comparison.calligraphicDiffs.italicDiff },
    { label: 'Elegance', diff: comparison.calligraphicDiffs.eleganceDiff },
    { label: 'Connect', diff: comparison.calligraphicDiffs.connectednessDiff },
    { label: 'Dynamic', diff: comparison.calligraphicDiffs.dynamicDiff },
  ] : [];

  const rows = isCalligraphic ? calligraphicRows : (isGeometric ? geometricRows : (isJapanese ? japaneseRows : latinRows));

  // Feature matches for geometric
  const geometricFeatures = comparison.geometricDiffs ? [
    { label: 'Grid', match: comparison.geometricDiffs.gridMatch },
    { label: 'Monoline', match: comparison.geometricDiffs.monolineMatch },
    { label: 'Stencil', match: comparison.geometricDiffs.stencilMatch },
    { label: 'Stroke End', match: comparison.geometricDiffs.strokeEndMatch },
    { label: 'Counter', match: comparison.geometricDiffs.counterMatch },
  ] : [];

  // Feature matches for calligraphic
  const calligraphicFeatures = comparison.calligraphicDiffs ? [
    { label: 'Rhythm', match: comparison.calligraphicDiffs.rhythmMatch },
    { label: 'Entry', match: comparison.calligraphicDiffs.entryMatch },
    { label: 'Exit', match: comparison.calligraphicDiffs.exitMatch },
  ] : [];

  return (
    <div className="space-y-1">
      <div className="text-[10px] text-white/30 uppercase tracking-wider mb-2">Diff Analysis</div>
      {rows.map(row => (
        <div key={row.label} className="flex items-center gap-2 text-xs">
          <span className="text-white/40 w-24 truncate">{row.label}</span>
          <div className="flex-1 h-1 bg-white/10 rounded overflow-hidden">
            <div 
              className="h-full rounded transition-all bg-white/60"
              style={{ width: `${Math.min(row.diff * 100, 100)}%` }}
            />
          </div>
          <span className="text-white/50 w-10 text-right font-mono">
            {(row.diff * 100).toFixed(0)}%
          </span>
        </div>
      ))}
      
      {/* Geometric feature matches */}
      {isGeometric && geometricFeatures.length > 0 && (
        <div className="pt-1 border-t border-white/10 mt-2">
          <div className="flex flex-wrap gap-2 text-xs">
            {geometricFeatures.map(f => (
              <span key={f.label} className={`px-2 py-0.5 rounded ${f.match ? 'bg-white/10 text-white/60' : 'bg-red-500/20 text-red-400/80'}`}>
                {f.match ? '✓' : '✗'} {f.label}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Calligraphic feature matches */}
      {isCalligraphic && calligraphicFeatures.length > 0 && (
        <div className="pt-1 border-t border-white/10 mt-2">
          <div className="flex flex-wrap gap-2 text-xs">
            {calligraphicFeatures.map(f => (
              <span key={f.label} className={`px-2 py-0.5 rounded ${f.match ? 'bg-white/10 text-white/60' : 'bg-red-500/20 text-red-400/80'}`}>
                {f.match ? '✓' : '✗'} {f.label}
              </span>
            ))}
          </div>
        </div>
      )}
      
      {/* Standard feature match (non-geometric, non-calligraphic) */}
      {!isGeometric && !isCalligraphic && (
        <div className="flex items-center gap-2 text-xs pt-1 border-t border-white/10 mt-2">
          <span className="text-white/40 w-24">{isJapanese ? '書体' : 'Features'}</span>
          <span className="text-white/60">
            {isJapanese 
              ? (comparison.japaneseDiffs?.styleMatch ? '✓ Match' : '✗ Mismatch')
              : (comparison.featureMatch ? '✓ Match' : '✗ Mismatch')
            }
          </span>
        </div>
      )}
    </div>
  );
}
