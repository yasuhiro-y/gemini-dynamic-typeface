import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import * as potrace from 'potrace';
import { optimize, type Config } from 'svgo';

// Potrace parameters optimized for logo/typeface vectorization
const POTRACE_OPTIONS = {
  turnPolicy: 'minority' as const, // Best for logo shapes
  turdSize: 2,        // Remove noise (small isolated areas)
  alphaMax: 1.0,      // Corner detection threshold (balance curves/corners)
  optCurve: true,     // Enable curve optimization
  optTolerance: 0.2,  // Optimization tolerance (default is good)
  threshold: 128,     // Binarization threshold
  blackOnWhite: true, // Black foreground on white background
  color: '#000000',   // Fill color
  background: 'transparent', // Transparent background for versatility
};

// SVGO configuration optimized for Adobe Illustrator compatibility
const SVGO_CONFIG: Config = {
  plugins: [
    {
      name: 'preset-default',
      params: {
        overrides: {
          // DISABLE destructive plugins for Illustrator compatibility
          removeViewBox: false,           // Keep viewBox for proper scaling
          cleanupIds: false,              // Keep IDs for layer names
          mergePaths: false,              // Keep paths separate for editability
          convertShapeToPath: false,      // Keep shape elements
          removeUnknownsAndDefaults: false,
          collapseGroups: false,          // Keep group structure
        },
      },
    },
    // Configure precision (3-4 digits for Illustrator)
    {
      name: 'cleanupNumericValues',
      params: {
        floatPrecision: 3,
      },
    },
  ],
};

/**
 * Adjusts SVG dimensions for Adobe Illustrator compatibility
 * Converts pixel-based dimensions to points (pt) for consistent sizing
 * 
 * Illustrator interprets unitless values as points (72 DPI)
 * Web uses 96 DPI, so we need to convert: pt = px * (72/96)
 */
function adjustSvgForIllustrator(svgString: string, originalWidth: number, originalHeight: number): string {
  // Calculate point-based dimensions (72 DPI for Illustrator)
  const widthPt = Math.round(originalWidth * (72 / 96));
  const heightPt = Math.round(originalHeight * (72 / 96));
  
  // Replace width and height attributes with pt units
  // The viewBox remains in the upscaled coordinate system for path precision
  let adjustedSvg = svgString;
  
  // Match the SVG opening tag and update dimensions
  adjustedSvg = adjustedSvg.replace(
    /<svg([^>]*)width="[^"]*"([^>]*)height="[^"]*"([^>]*)>/,
    `<svg$1width="${widthPt}pt"$2height="${heightPt}pt"$3>`
  );
  
  // Alternative pattern if attributes are in different order
  adjustedSvg = adjustedSvg.replace(
    /<svg([^>]*)height="[^"]*"([^>]*)width="[^"]*"([^>]*)>/,
    `<svg$1height="${heightPt}pt"$2width="${widthPt}pt"$3>`
  );
  
  return adjustedSvg;
}

export async function POST(request: NextRequest) {
  try {
    console.log('[SVG API] Starting conversion...');
    
    const body = await request.json();
    const { imageData, originalWidth, originalHeight } = body;

    if (!imageData) {
      return NextResponse.json(
        { error: 'Missing image data' },
        { status: 400 }
      );
    }

    console.log('[SVG API] Extracting base64 data...');
    // Extract base64 data (handle data URL format)
    const base64Data = imageData.includes(',') 
      ? imageData.split(',')[1] 
      : imageData;
    
    const inputBuffer = Buffer.from(base64Data, 'base64');
    console.log('[SVG API] Input buffer size:', inputBuffer.length);

    // Get original image dimensions
    console.log('[SVG API] Getting image metadata...');
    const metadata = await sharp(inputBuffer).metadata();
    const imgWidth = originalWidth || metadata.width || 1024;
    const imgHeight = originalHeight || metadata.height || 1024;
    console.log('[SVG API] Dimensions:', imgWidth, 'x', imgHeight);

    // === PREPROCESSING WITH SHARP ===
    console.log('[SVG API] Preprocessing with Sharp...');
    const preprocessedBuffer = await sharp(inputBuffer)
      .flatten({ background: { r: 255, g: 255, b: 255 } })
      .grayscale()
      .threshold(128)
      .resize({
        width: imgWidth * 2,
        height: imgHeight * 2,
        kernel: sharp.kernel.lanczos3,
      })
      .png()
      .toBuffer();
    console.log('[SVG API] Preprocessed buffer size:', preprocessedBuffer.length);

    // === VECTORIZATION WITH POTRACE ===
    console.log('[SVG API] Vectorizing with Potrace...');
    const svgString = await new Promise<string>((resolve, reject) => {
      potrace.trace(preprocessedBuffer, POTRACE_OPTIONS, (err: Error | null, svg: string) => {
        if (err) {
          console.error('[SVG API] Potrace error:', err);
          reject(err);
        } else {
          console.log('[SVG API] Potrace success, SVG length:', svg?.length);
          resolve(svg);
        }
      });
    });

    // === OPTIMIZATION WITH SVGO ===
    console.log('[SVG API] Optimizing with SVGO...');
    const optimizedResult = optimize(svgString, SVGO_CONFIG);
    let finalSvg = optimizedResult.data;
    console.log('[SVG API] Optimized SVG length:', finalSvg.length);

    // === ILLUSTRATOR COMPATIBILITY ADJUSTMENTS ===
    console.log('[SVG API] Adjusting for Illustrator...');
    finalSvg = adjustSvgForIllustrator(finalSvg, imgWidth, imgHeight);

    console.log('[SVG API] Conversion complete!');
    return NextResponse.json({
      svg: finalSvg,
      originalWidth: imgWidth,
      originalHeight: imgHeight,
    });

  } catch (error: unknown) {
    console.error('[SVG API] Error caught:', error);
    console.error('[SVG API] Error type:', typeof error);
    console.error('[SVG API] Error constructor:', error?.constructor?.name);
    const errorMessage = error && typeof error === 'object' && 'message' in error 
      ? String((error as { message: unknown }).message) 
      : 'Conversion failed';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
