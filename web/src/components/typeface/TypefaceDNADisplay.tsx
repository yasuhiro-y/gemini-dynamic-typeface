'use client';

import { MathematicalDNA } from '@/types/typeface';

interface TypefaceDNADisplayProps {
  dna: MathematicalDNA;
  analysisTime?: number;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-white/50">{label}</span>
      <span className="text-white font-mono">{value}</span>
    </div>
  );
}

export function TypefaceDNADisplay({ dna, analysisTime }: TypefaceDNADisplayProps) {
  const isJapanese = dna.scriptType === 'japanese' || dna.scriptType === 'mixed';
  const styleCategory = dna.japanese?.styleCategory || 'custom_logotype';
  const isGeometric = styleCategory === 'geometric_logotype' || styleCategory === 'geometric' || dna.japanese?.isGeometricLogotype || dna.japanese?.isModularGrid || dna.japanese?.isMonoline;
  const isCalligraphic = styleCategory === 'calligraphic_logotype' || styleCategory === 'calligraphic' || dna.japanese?.isCalligraphic;
  const scriptLabel = dna.scriptType === 'japanese' ? '日本語' : dna.scriptType === 'mixed' ? '日本語+Latin' : 'Latin';

  // Map styleCategory to display labels
  const styleLabelMap: Record<string, string> = {
    'custom_logotype': 'Custom Logotype (作字)',
    'geometric_logotype': 'Geometric Logotype',
    'calligraphic_logotype': 'Calligraphic Logotype',
    'geometric': 'Geometric',
    'calligraphic': 'Calligraphic',
    'gothic': 'Gothic (ゴシック)',
    'mincho': 'Mincho (明朝)',
    'handwritten': 'Handwritten',
    'decorative': 'Decorative',
  };
  const styleLabel = styleLabelMap[styleCategory] || styleCategory;

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
