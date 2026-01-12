'use client';

import { useState } from 'react';

interface DownloadButtonsProps {
  imageUrl: string;
  filenamePrefix?: string;
  iteration?: number;
  showSvg?: boolean;
}

export function DownloadButtons({
  imageUrl,
  filenamePrefix = 'generated',
  iteration,
  showSvg = true,
}: DownloadButtonsProps) {
  const [isConvertingSvg, setIsConvertingSvg] = useState(false);
  const [svgError, setSvgError] = useState<string | null>(null);

  const getFilename = (extension: string) => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const iterStr = iteration !== undefined ? `_iter${String(iteration).padStart(2, '0')}` : '';
    return `${filenamePrefix}_${timestamp}${iterStr}.${extension}`;
  };

  const handlePngDownload = () => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = getFilename('png');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSvgDownload = async () => {
    setIsConvertingSvg(true);
    setSvgError(null);

    try {
      const response = await fetch('/api/convert-svg', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageData: imageUrl }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Conversion failed');
      }

      const { svg } = await response.json();

      // Create blob and download
      const blob = new Blob([svg], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = getFilename('svg');
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
    <>
      <div className="flex gap-2 mb-3">
        <button
          onClick={handlePngDownload}
          className="flex-1 py-1.5 text-xs text-white/60 border border-white/10 rounded-lg hover:bg-white/5 hover:text-white/80 transition-colors"
        >
          ↓ PNG
        </button>
        {showSvg && (
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
        )}
      </div>

      {/* SVG Error Message */}
      {svgError && (
        <div className="mb-2 text-xs text-red-400/80 text-center">
          SVG: {svgError}
        </div>
      )}
    </>
  );
}
