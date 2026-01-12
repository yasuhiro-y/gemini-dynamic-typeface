'use client';

import { DNAComparison } from '@/types/typeface';

interface ComparisonTableProps {
  comparison: DNAComparison;
}

export function ComparisonTable({ comparison }: ComparisonTableProps) {
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
