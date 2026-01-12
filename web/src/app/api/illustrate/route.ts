import { NextRequest } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import * as crypto from 'node:crypto';

const MODELS = {
  ANALYSIS: 'gemini-2.5-flash',
  IMAGE_GEN: 'gemini-3-pro-image-preview',
};

// Types
interface IllustrationDNA {
  colorPalette: {
    primary: string;
    secondary: string[];
    accent: string;
    temperature: 'warm' | 'cool' | 'neutral';
    saturation: 'vivid' | 'muted' | 'pastel' | 'monochrome';
    contrast: number;
  };
  lineStyle: {
    weight: 'thin' | 'medium' | 'thick' | 'varied';
    outline: 'clean' | 'rough' | 'none';
    consistency: number;
  };
  shapeStyle: {
    type: 'geometric' | 'organic' | 'mixed';
    roundness: number;
    complexity: 'simple' | 'moderate' | 'detailed';
  };
  subjectType: 'character' | 'object' | 'abstract' | 'scene';
  overallVibe: string[];
  detectedSubject?: string;
}

interface ColorVariation {
  id: string;
  name: string;
  description: string;
  palette: IllustrationDNA['colorPalette'];
  status: 'pending' | 'generating' | 'complete' | 'error';
  imageUrl?: string;
}

type ColorVariationType = 'original' | 'warm' | 'cool' | 'monochrome' | 'complementary' | 'pastel';

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();
  let isCancelled = false;

  request.signal.addEventListener('abort', () => {
    isCancelled = true;
  });

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object): boolean => {
        if (isCancelled) return false;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
          return true;
        } catch {
          isCancelled = true;
          return false;
        }
      };

      const startTime = Date.now();

      try {
        const body = await request.json();
        const {
          referenceImage,
          mode,
          targetSubject,
          colorVariationCount = 3,
          maxIterations = 3,
        } = body;

        if (!referenceImage || !targetSubject) {
          send({ type: 'error', message: 'Missing required fields' });
          controller.close();
          return;
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
          send({ type: 'error', message: 'API key not configured' });
          controller.close();
          return;
        }

        const ai = new GoogleGenAI({ apiKey });

        if (!send({ type: 'status', status: 'uploading', message: 'Processing reference image...' })) {
          controller.close();
          return;
        }

        // Extract base64 from data URL
        const refImageBase64 = referenceImage.split(',')[1];
        const sessionId = crypto.randomUUID();

        send({ type: 'session', sessionId });

        if (isCancelled) {
          controller.close();
          return;
        }

        // Extract Illustration DNA
        send({ type: 'status', status: 'analyzing', message: 'Analyzing illustration style...' });
        const dnaStartTime = Date.now();

        let refDNA: IllustrationDNA;
        try {
          refDNA = await extractIllustrationDNA(ai, refImageBase64);
        } catch (error) {
          console.error('DNA extraction error:', error);
          refDNA = getDefaultIllustrationDNA();
        }

        const dnaTime = Date.now() - dnaStartTime;

        if (isCancelled) {
          controller.close();
          return;
        }

        send({
          type: 'dna',
          dna: refDNA,
          time: dnaTime,
        });

        let bestScore = 0;
        let bestIteration = 0;
        let bestImageBase64: string | null = null;

        // Generate iterations
        for (let iteration = 1; iteration <= maxIterations; iteration++) {
          if (isCancelled) break;

          send({
            type: 'iteration_start',
            iteration,
            message: `Starting iteration ${iteration}...`,
          });

          send({
            type: 'status',
            status: 'generating',
            message: `Generating illustration ${iteration}/${maxIterations}...`,
          });

          if (isCancelled) break;

          const genStartTime = Date.now();
          let generatedImageBase64: string;
          try {
            generatedImageBase64 = await generateIllustration(ai, refImageBase64, targetSubject, mode, refDNA);
          } catch (error) {
            if (isCancelled) break;
            send({ type: 'iteration_error', iteration, message: `Generation failed: ${error}` });
            continue;
          }
          const genTime = Date.now() - genStartTime;

          if (isCancelled) break;

          const imageUrl = `data:image/png;base64,${generatedImageBase64}`;

          send({
            type: 'iteration_image',
            iteration,
            imageUrl,
            generationTime: genTime,
          });

          if (isCancelled) break;

          // Evaluate
          send({
            type: 'status',
            status: 'evaluating',
            message: `Evaluating iteration ${iteration}...`,
          });

          const evalStartTime = Date.now();
          const evaluation = await evaluateIllustration(ai, refImageBase64, generatedImageBase64, targetSubject, mode, refDNA);
          const evalTime = Date.now() - evalStartTime;

          if (isCancelled) break;

          send({
            type: 'iteration_eval',
            iteration,
            score: evaluation.score,
            generatedDNA: evaluation.generatedDNA,
            evaluationTime: evalTime,
          });

          if (evaluation.score > bestScore) {
            bestScore = evaluation.score;
            bestIteration = iteration;
            bestImageBase64 = generatedImageBase64;
          }

          // Generate color variations for the best iteration so far
          if (iteration === maxIterations || evaluation.score >= 85) {
            if (isCancelled) break;

            send({
              type: 'status',
              status: 'generating',
              message: 'Generating color variations...',
            });

            const variations = generateColorVariations(refDNA.colorPalette, colorVariationCount);
            const sourceBase64 = bestImageBase64 || generatedImageBase64;

            for (const variation of variations) {
              if (isCancelled) break;

              // Skip original (already have it)
              if (variation.id === 'original') {
                send({
                  type: 'color_variation',
                  iteration,
                  variation: { 
                    ...variation, 
                    status: 'complete', 
                    imageUrl: `data:image/png;base64,${sourceBase64}` 
                  },
                });
                continue;
              }

              // Send pending variation
              send({
                type: 'color_variation',
                iteration,
                variation: { ...variation, status: 'generating' },
              });

              try {
                const varImageBase64 = await generateColorVariationImage(ai, sourceBase64, variation);
                send({
                  type: 'color_variation',
                  iteration,
                  variation: { 
                    ...variation, 
                    status: 'complete', 
                    imageUrl: `data:image/png;base64,${varImageBase64}` 
                  },
                });
              } catch (error) {
                console.error(`Color variation ${variation.id} failed:`, error);
                send({
                  type: 'color_variation',
                  iteration,
                  variation: { ...variation, status: 'error' },
                });
              }
            }

            break; // Exit after generating variations
          }
        }

        if (!isCancelled) {
          const totalTime = Date.now() - startTime;
          send({ type: 'complete', bestScore, bestIteration, totalTime });
        }
      } catch (error) {
        if (!isCancelled) {
          send({ type: 'error', message: error instanceof Error ? error.message : 'Unknown error' });
        }
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}

// === ILLUSTRATION DNA EXTRACTION ===
async function extractIllustrationDNA(ai: GoogleGenAI, imageBase64: string): Promise<IllustrationDNA> {
  const prompt = `Analyze this illustration and extract its visual DNA. Focus on:
1. Color palette - identify the main colors (hex format), temperature, saturation level
2. Line style - weight, outline style, consistency
3. Shape style - geometric vs organic, roundness, complexity
4. Subject type - is it a character, object, abstract, or scene?
5. Overall vibe - list 3-5 adjectives

Respond with ONLY a JSON object (no markdown):
{
  "colorPalette": {
    "primary": "#hex",
    "secondary": ["#hex1", "#hex2"],
    "accent": "#hex",
    "temperature": "warm|cool|neutral",
    "saturation": "vivid|muted|pastel|monochrome",
    "contrast": 0.5
  },
  "lineStyle": {
    "weight": "thin|medium|thick|varied",
    "outline": "clean|rough|none",
    "consistency": 0.8
  },
  "shapeStyle": {
    "type": "geometric|organic|mixed",
    "roundness": 0.7,
    "complexity": "simple|moderate|detailed"
  },
  "subjectType": "character|object|abstract|scene",
  "overallVibe": ["playful", "minimal", "colorful"],
  "detectedSubject": "what the illustration depicts"
}`;

  try {
    const response = await ai.models.generateContent({
      model: MODELS.ANALYSIS,
      contents: [
        {
          role: 'user',
          parts: [
            { inlineData: { mimeType: 'image/png', data: imageBase64 } },
            { text: prompt },
          ],
        },
      ],
    });

    const part = response.candidates?.[0]?.content?.parts?.[0];
    if (part && 'text' in part && part.text) {
      const json = part.text.match(/\{[\s\S]*\}/)?.[0];
      if (json) {
        const parsed = JSON.parse(json);
        return validateIllustrationDNA(parsed);
      }
    }
  } catch (e) {
    console.error('Illustration DNA extraction error:', e);
  }

  return getDefaultIllustrationDNA();
}

function validateIllustrationDNA(data: Partial<IllustrationDNA>): IllustrationDNA {
  const defaults = getDefaultIllustrationDNA();
  return {
    colorPalette: {
      primary: data.colorPalette?.primary || defaults.colorPalette.primary,
      secondary: data.colorPalette?.secondary || defaults.colorPalette.secondary,
      accent: data.colorPalette?.accent || defaults.colorPalette.accent,
      temperature: data.colorPalette?.temperature || defaults.colorPalette.temperature,
      saturation: data.colorPalette?.saturation || defaults.colorPalette.saturation,
      contrast: data.colorPalette?.contrast ?? defaults.colorPalette.contrast,
    },
    lineStyle: {
      weight: data.lineStyle?.weight || defaults.lineStyle.weight,
      outline: data.lineStyle?.outline || defaults.lineStyle.outline,
      consistency: data.lineStyle?.consistency ?? defaults.lineStyle.consistency,
    },
    shapeStyle: {
      type: data.shapeStyle?.type || defaults.shapeStyle.type,
      roundness: data.shapeStyle?.roundness ?? defaults.shapeStyle.roundness,
      complexity: data.shapeStyle?.complexity || defaults.shapeStyle.complexity,
    },
    subjectType: data.subjectType || defaults.subjectType,
    overallVibe: data.overallVibe || defaults.overallVibe,
    detectedSubject: data.detectedSubject,
  };
}

function getDefaultIllustrationDNA(): IllustrationDNA {
  return {
    colorPalette: {
      primary: '#4A90D9',
      secondary: ['#F5A623', '#7ED321'],
      accent: '#D0021B',
      temperature: 'neutral',
      saturation: 'vivid',
      contrast: 0.6,
    },
    lineStyle: {
      weight: 'medium',
      outline: 'clean',
      consistency: 0.8,
    },
    shapeStyle: {
      type: 'mixed',
      roundness: 0.5,
      complexity: 'moderate',
    },
    subjectType: 'object',
    overallVibe: ['colorful', 'modern'],
  };
}

// === ILLUSTRATION GENERATION ===
async function generateIllustration(
  ai: GoogleGenAI,
  refBase64: string,
  targetSubject: string,
  mode: string,
  dna: IllustrationDNA
): Promise<string> {
  const modeInstruction =
    mode === 'transform'
      ? `Transform this illustration to depict "${targetSubject}" instead, while preserving the exact same visual style.`
      : `Create a variation of this illustration: "${targetSubject}", keeping the same subject but with the requested changes.`;

  const prompt = `${modeInstruction}

STYLE DNA TO PRESERVE:
- Color palette: Primary ${dna.colorPalette.primary}, accents ${dna.colorPalette.accent}
- Temperature: ${dna.colorPalette.temperature}
- Saturation: ${dna.colorPalette.saturation}
- Line style: ${dna.lineStyle.weight} weight, ${dna.lineStyle.outline} outline
- Shape style: ${dna.shapeStyle.type}, ${dna.shapeStyle.complexity} complexity
- Overall vibe: ${dna.overallVibe.join(', ')}

REQUIREMENTS:
1. Match the exact color palette and color relationships
2. Preserve the line weight and style
3. Keep the same level of detail and complexity
4. Maintain the overall mood and feeling
5. Clean background (white or matching the reference style)
6. No text, labels, or watermarks`;

  const response = await ai.models.generateContent({
    model: MODELS.IMAGE_GEN,
    contents: [
      {
        role: 'user',
        parts: [
          { inlineData: { mimeType: 'image/png', data: refBase64 } },
          { text: prompt },
        ],
      },
    ],
    config: {
      responseModalities: ['image', 'text'],
    },
  });

  if (response.candidates?.[0]?.content?.parts) {
    for (const part of response.candidates[0].content.parts) {
      if ('inlineData' in part && part.inlineData?.data) {
        return part.inlineData.data;
      }
    }
  }

  throw new Error('No image generated');
}

// === EVALUATION ===
async function evaluateIllustration(
  ai: GoogleGenAI,
  refBase64: string,
  genBase64: string,
  targetSubject: string,
  mode: string,
  refDNA: IllustrationDNA
): Promise<{ score: number; generatedDNA: IllustrationDNA }> {
  const prompt = `Compare these two illustrations:
IMAGE 1 (first): Reference illustration
IMAGE 2 (second): Generated illustration (should be "${targetSubject}" in ${mode} mode)

Evaluate how well the generated image:
1. Preserves the color palette (0-100)
2. Maintains line style consistency (0-100)
3. Keeps shape characteristics (0-100)
4. Matches overall vibe/mood (0-100)
5. Successfully depicts the target subject (0-100)

Also extract the DNA of the generated image.

Respond with ONLY JSON:
{
  "colorScore": 80,
  "lineScore": 75,
  "shapeScore": 70,
  "vibeScore": 85,
  "subjectScore": 90,
  "overallScore": 80,
  "generatedDNA": {
    "colorPalette": {...},
    "lineStyle": {...},
    "shapeStyle": {...},
    "subjectType": "...",
    "overallVibe": [...]
  }
}`;

  try {
    const response = await ai.models.generateContent({
      model: MODELS.ANALYSIS,
      contents: [
        {
          role: 'user',
          parts: [
            { inlineData: { mimeType: 'image/png', data: refBase64 } },
            { inlineData: { mimeType: 'image/png', data: genBase64 } },
            { text: prompt },
          ],
        },
      ],
    });

    const part = response.candidates?.[0]?.content?.parts?.[0];
    if (part && 'text' in part && part.text) {
      const json = part.text.match(/\{[\s\S]*\}/)?.[0];
      if (json) {
        const parsed = JSON.parse(json);
        return {
          score: parsed.overallScore || 50,
          generatedDNA: validateIllustrationDNA(parsed.generatedDNA || {}),
        };
      }
    }
  } catch (e) {
    console.error('Evaluation error:', e);
  }

  return {
    score: 50,
    generatedDNA: refDNA,
  };
}

// === COLOR VARIATIONS ===
function generateColorVariations(
  originalPalette: IllustrationDNA['colorPalette'],
  count: number
): ColorVariation[] {
  const variationTypes: ColorVariationType[] = ['warm', 'cool', 'monochrome', 'complementary', 'pastel'];
  const variations: ColorVariation[] = [];

  // Always include original
  variations.push({
    id: 'original',
    name: 'Original',
    description: 'Original color palette',
    palette: originalPalette,
    status: 'complete',
  });

  // Add requested variations
  for (let i = 0; i < Math.min(count - 1, variationTypes.length); i++) {
    const type = variationTypes[i];
    const newPalette = transformPalette(originalPalette, type);
    variations.push({
      id: type,
      name: getVariationName(type),
      description: getVariationDescription(type),
      palette: newPalette,
      status: 'pending',
    });
  }

  return variations;
}

function transformPalette(
  palette: IllustrationDNA['colorPalette'],
  type: ColorVariationType
): IllustrationDNA['colorPalette'] {
  switch (type) {
    case 'warm':
      return {
        ...palette,
        temperature: 'warm',
        primary: shiftHue(palette.primary, 15),
        secondary: palette.secondary.map((c) => shiftHue(c, 15)),
        accent: shiftHue(palette.accent, 15),
      };
    case 'cool':
      return {
        ...palette,
        temperature: 'cool',
        primary: shiftHue(palette.primary, -30),
        secondary: palette.secondary.map((c) => shiftHue(c, -30)),
        accent: shiftHue(palette.accent, -30),
      };
    case 'monochrome':
      return {
        ...palette,
        saturation: 'monochrome',
        primary: toGrayscale(palette.primary),
        secondary: palette.secondary.map(toGrayscale),
        accent: toGrayscale(palette.accent),
      };
    case 'complementary':
      return {
        ...palette,
        primary: shiftHue(palette.primary, 180),
        secondary: palette.secondary.map((c) => shiftHue(c, 180)),
        accent: shiftHue(palette.accent, 180),
      };
    case 'pastel':
      return {
        ...palette,
        saturation: 'pastel',
        primary: toPastel(palette.primary),
        secondary: palette.secondary.map(toPastel),
        accent: toPastel(palette.accent),
      };
    default:
      return palette;
  }
}

function getVariationName(type: ColorVariationType): string {
  const names: Record<ColorVariationType, string> = {
    original: 'Original',
    warm: 'Warm Tone',
    cool: 'Cool Tone',
    monochrome: 'Monochrome',
    complementary: 'Complementary',
    pastel: 'Pastel',
  };
  return names[type];
}

function getVariationDescription(type: ColorVariationType): string {
  const descriptions: Record<ColorVariationType, string> = {
    original: 'Original color palette',
    warm: 'Shifted to warmer tones',
    cool: 'Shifted to cooler tones',
    monochrome: 'Grayscale version',
    complementary: 'Complementary color scheme',
    pastel: 'Softer pastel colors',
  };
  return descriptions[type];
}

// Color manipulation helpers
function hexToHSL(hex: string): { h: number; s: number; l: number } {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return { h: h * 360, s: s * 100, l: l * 100 };
}

function hslToHex(h: number, s: number, l: number): string {
  h = h / 360;
  s = s / 100;
  l = l / 100;

  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };

  let r, g, b;
  if (s === 0) {
    r = g = b = l;
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  const toHex = (x: number) =>
    Math.round(x * 255)
      .toString(16)
      .padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function shiftHue(hex: string, degrees: number): string {
  try {
    const hsl = hexToHSL(hex);
    hsl.h = (hsl.h + degrees + 360) % 360;
    return hslToHex(hsl.h, hsl.s, hsl.l);
  } catch {
    return hex;
  }
}

function toGrayscale(hex: string): string {
  try {
    const hsl = hexToHSL(hex);
    return hslToHex(hsl.h, 0, hsl.l);
  } catch {
    return hex;
  }
}

function toPastel(hex: string): string {
  try {
    const hsl = hexToHSL(hex);
    return hslToHex(hsl.h, Math.min(hsl.s, 40), Math.max(hsl.l, 75));
  } catch {
    return hex;
  }
}

// === COLOR VARIATION IMAGE GENERATION ===
async function generateColorVariationImage(
  ai: GoogleGenAI,
  sourceBase64: string,
  variation: ColorVariation
): Promise<string> {
  const prompt = `Recolor this illustration with the following color scheme:
- Primary color: ${variation.palette.primary}
- Secondary colors: ${variation.palette.secondary.join(', ')}
- Accent color: ${variation.palette.accent}
- Style: ${variation.name} - ${variation.description}

REQUIREMENTS:
1. Keep the exact same composition and shapes
2. Only change the colors to match the new palette
3. Maintain all details and line work
4. Preserve the overall style and mood
5. No text, labels, or watermarks`;

  const response = await ai.models.generateContent({
    model: MODELS.IMAGE_GEN,
    contents: [
      {
        role: 'user',
        parts: [
          { inlineData: { mimeType: 'image/png', data: sourceBase64 } },
          { text: prompt },
        ],
      },
    ],
    config: {
      responseModalities: ['image', 'text'],
    },
  });

  if (response.candidates?.[0]?.content?.parts) {
    for (const part of response.candidates[0].content.parts) {
      if ('inlineData' in part && part.inlineData?.data) {
        return part.inlineData.data;
      }
    }
  }

  throw new Error('No image generated for color variation');
}
