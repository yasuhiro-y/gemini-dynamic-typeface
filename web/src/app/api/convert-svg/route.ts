import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
// Use require for potrace to avoid ESM issues
// eslint-disable-next-line @typescript-eslint/no-require-imports
const potrace = require('potrace');
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
    const body = await request.json();
    const { imageData, originalWidth, originalHeight } = body;

    if (!imageData) {
      return NextResponse.json(
        { error: 'Missing image data' },
        { status: 400 }
      );
    }

    // Extract base64 data (handle data URL format)
    const base64Data = imageData.includes(',') 
      ? imageData.split(',')[1] 
      : imageData;
    
    const inputBuffer = Buffer.from(base64Data, 'base64');

    // Get original image dimensions
    const metadata = await sharp(inputBuffer).metadata();
    const imgWidth = originalWidth || metadata.width || 1024;
    const imgHeight = originalHeight || metadata.height || 1024;

    // === PREPROCESSING WITH SHARP ===
    // 1. Flatten to white background (remove alpha)
    // 2. Convert to grayscale
    // 3. Apply threshold for clean binary image
    // 4. Upscale 2x for better trace quality (more anchor points)
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

    // === VECTORIZATION WITH POTRACE ===
    const svgString = await new Promise<string>((resolve, reject) => {
      potrace.trace(preprocessedBuffer, POTRACE_OPTIONS, (err: Error | null, svg: string) => {
        if (err) {
          reject(err);
        } else {
          resolve(svg);
        }
      });
    });

    // === OPTIMIZATION WITH SVGO ===
    let finalSvg: string;
    try {
      const optimizedResult = optimize(svgString, SVGO_CONFIG);
      finalSvg = optimizedResult.data;
    } catch {
      // If optimization fails, use the unoptimized SVG
      finalSvg = svgString;
    }

    // === ILLUSTRATOR COMPATIBILITY ADJUSTMENTS ===
    finalSvg = adjustSvgForIllustrator(finalSvg, imgWidth, imgHeight);

    return NextResponse.json({
      svg: finalSvg,
      originalWidth: imgWidth,
      originalHeight: imgHeight,
    });

  } catch (error: unknown) {
    console.error('SVG conversion error:', error);
    const errorMessage = error && typeof error === 'object' && 'message' in error 
      ? String((error as { message: unknown }).message) 
      : 'Conversion failed';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
