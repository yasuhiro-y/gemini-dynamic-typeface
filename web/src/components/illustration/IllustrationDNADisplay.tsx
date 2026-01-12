'use client';

import { IllustrationDNA } from '@/types/illustration';

interface IllustrationDNADisplayProps {
  dna: IllustrationDNA;
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

function ColorSwatch({ color, label }: { color: string; label?: string }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className="w-4 h-4 rounded border border-white/20"
        style={{ backgroundColor: color }}
      />
      <span className="text-white/50 text-xs">{label || color}</span>
    </div>
  );
}

export function IllustrationDNADisplay({ dna, analysisTime }: IllustrationDNADisplayProps) {
  const temperatureLabel = {
    warm: '暖色系',
    cool: '寒色系',
    neutral: 'ニュートラル',
  }[dna.colorPalette.temperature];

  const saturationLabel = {
    vivid: 'ビビッド',
    muted: 'ミュート',
    pastel: 'パステル',
    monochrome: 'モノクロ',
  }[dna.colorPalette.saturation];

  const subjectLabel = {
    character: 'キャラクター',
    object: 'オブジェクト',
    abstract: '抽象',
    scene: 'シーン',
  }[dna.subjectType];

  return (
    <div className="mb-8 p-4 border border-white/10 rounded-lg">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-xs text-white/40 uppercase tracking-wider">Reference DNA</span>
          <span className="text-[10px] text-white/30 px-2 py-0.5 bg-white/5 rounded">{subjectLabel}</span>
          {dna.detectedSubject && (
            <span className="text-[10px] text-purple-400/60 px-2 py-0.5 bg-purple-400/10 rounded">
              {dna.detectedSubject}
            </span>
          )}
        </div>
        {analysisTime && (
          <span className="text-xs text-white/30">{(analysisTime / 1000).toFixed(1)}s</span>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 text-xs">
        {/* Color Palette */}
        <div className="space-y-2 col-span-2">
          <div className="text-white/30 uppercase text-[10px] tracking-wider mb-2">Color Palette</div>
          <div className="flex flex-wrap gap-2">
            <ColorSwatch color={dna.colorPalette.primary} label="Primary" />
            {dna.colorPalette.secondary.map((color, i) => (
              <ColorSwatch key={i} color={color} label={`Sub ${i + 1}`} />
            ))}
            <ColorSwatch color={dna.colorPalette.accent} label="Accent" />
          </div>
          <div className="flex gap-4 mt-2">
            <span className="text-white/40">{temperatureLabel}</span>
            <span className="text-white/40">{saturationLabel}</span>
            <span className="text-white/40">コントラスト: {(dna.colorPalette.contrast * 100).toFixed(0)}%</span>
          </div>
        </div>

        {/* Line Style */}
        <div className="space-y-1">
          <div className="text-white/30 uppercase text-[10px] tracking-wider mb-2">Line Style</div>
          <Row label="Weight" value={dna.lineStyle.weight} />
          <Row label="Outline" value={dna.lineStyle.outline} />
          <Row label="Consistency" value={`${(dna.lineStyle.consistency * 100).toFixed(0)}%`} />
        </div>

        {/* Shape Style */}
        <div className="space-y-1">
          <div className="text-white/30 uppercase text-[10px] tracking-wider mb-2">Shape Style</div>
          <Row label="Type" value={dna.shapeStyle.type} />
          <Row label="Roundness" value={`${(dna.shapeStyle.roundness * 100).toFixed(0)}%`} />
          <Row label="Complexity" value={dna.shapeStyle.complexity} />
        </div>

        {/* Overall Vibe */}
        <div className="space-y-1">
          <div className="text-white/30 uppercase text-[10px] tracking-wider mb-2">Overall Vibe</div>
          <div className="flex flex-wrap gap-1">
            {dna.overallVibe.map((vibe, i) => (
              <span
                key={i}
                className="text-[10px] text-white/60 px-2 py-0.5 bg-white/5 rounded"
              >
                {vibe}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
