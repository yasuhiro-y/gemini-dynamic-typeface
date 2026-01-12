'use client';

import { ColorVariation } from '@/types/illustration';
import { DownloadButtons } from '@/components/shared/DownloadButtons';

interface ColorVariationGridProps {
  variations: ColorVariation[];
  sessionId?: string;
}

function ColorPalettePreview({ palette }: { palette: ColorVariation['palette'] }) {
  return (
    <div className="flex gap-1 mt-2">
      <div
        className="flex-1 h-3 rounded-l"
        style={{ backgroundColor: palette.primary }}
      />
      {palette.secondary.slice(0, 2).map((color, i) => (
        <div
          key={i}
          className="flex-1 h-3"
          style={{ backgroundColor: color }}
        />
      ))}
      <div
        className="flex-1 h-3 rounded-r"
        style={{ backgroundColor: palette.accent }}
      />
    </div>
  );
}

export function ColorVariationGrid({ variations }: ColorVariationGridProps) {
  if (variations.length === 0) return null;

  return (
    <div className="border-t border-white/10 pt-6 mt-6">
      <div className="text-xs text-white/40 uppercase tracking-wider mb-4">
        Color Variations
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {variations.map((variation) => (
          <div key={variation.id} className="bg-white/5 rounded-lg overflow-hidden">
            {/* Image */}
            <div className="aspect-square bg-white/10">
              {variation.imageUrl ? (
                <img
                  src={variation.imageUrl}
                  alt={variation.name}
                  className="w-full h-full object-contain bg-white"
                />
              ) : variation.status === 'generating' ? (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    <span className="text-xs text-white/40">Generating...</span>
                  </div>
                </div>
              ) : variation.status === 'error' ? (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-xs text-red-400">Error</span>
                </div>
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-xs text-white/30">Pending</span>
                </div>
              )}
            </div>

            {/* Info */}
            <div className="p-3">
              <div className="text-xs text-white/80 font-medium mb-1">{variation.name}</div>
              <div className="text-[10px] text-white/40 mb-2">{variation.description}</div>
              
              {/* Color Preview */}
              <ColorPalettePreview palette={variation.palette} />

              {/* Download */}
              {variation.imageUrl && (
                <div className="mt-3">
                  <DownloadButtons
                    imageUrl={variation.imageUrl}
                    filenamePrefix={`illust_${variation.id}`}
                    showSvg={false}
                  />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
