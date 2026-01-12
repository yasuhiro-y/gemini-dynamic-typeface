import { NextRequest } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import * as crypto from 'node:crypto';

const MODELS = {
  ANALYSIS: 'gemini-2.5-flash',
  IMAGE_GEN: 'gemini-3-pro-image-preview'
};

// Script detection
type ScriptType = 'latin' | 'japanese' | 'mixed';

function detectScript(text: string): ScriptType {
  const japaneseRegex = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/;
  const latinRegex = /[a-zA-Z]/;
  
  const hasJapanese = japaneseRegex.test(text);
  const hasLatin = latinRegex.test(text);
  
  if (hasJapanese && hasLatin) return 'mixed';
  if (hasJapanese) return 'japanese';
  return 'latin';
}

// === MATHEMATICAL DNA INTERFACE ===
interface MathematicalDNA {
  scriptType: ScriptType;
  
  visualStyle: {
    backgroundColor: 'white' | 'black' | 'colored' | 'transparent';
    textColor: 'black' | 'white' | 'colored';
    fillStyle: 'solid' | 'outline' | 'double-outline' | 'gradient';
    outlineThicknessPx: number;
    italicAngleDeg: number;
    hasDropShadow: boolean;
    has3DEffect: boolean;
    textureStyle: 'clean' | 'distressed' | 'textured' | 'hand-drawn';
  };

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

  standardFontDetection: {
    looksLikeStandardFont: boolean;
    confidence: number;
    detectedCategory: 'custom_logotype' | 'standard_gothic' | 'standard_mincho' | 'standard_sans' | 'standard_serif' | 'unknown';
    uniqueFeatures: string[];
    standardFontSimilarity: string;
  };

  criticalFeatures: {
    top5: string[];
    mustPreserve: string[];
    characterWidthVariance: 'uniform' | 'natural' | 'dramatic';
    widthDescription: string;
  };

  japanese?: {
    styleCategory: 'custom_logotype' | 'geometric_logotype' | 'calligraphic_logotype' | 'geometric' | 'calligraphic' | 'gothic' | 'mincho' | 'handwritten' | 'decorative';
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
}

interface VisualDescription {
  overallStyle: string;
  letterShapes: string;
  keyCharacteristics: string[];
  howToRecreate: string;
}

interface IterationFeedback {
  lostFeatures: string[];
  preservedFeatures: string[];
  previousScore: number;
  critique: string;
}

interface VisualSimilarityResult {
  similarityScore: number;
  isGeneratedStandardFont: boolean;
  isReferenceCustomLogotype: boolean;
  preservedFeatures: string[];
  lostFeatures: string[];
  critique: string;
  textAccuracy: number;
  detectedText: string;
}

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
        const { referenceImage, targetText, maxIterations = 5 } = body;

        if (!referenceImage || !targetText) {
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

        const scriptType = detectScript(targetText);
        const ai = new GoogleGenAI({ apiKey });

        if (!send({ type: 'status', status: 'uploading', message: 'Processing reference image...' })) {
          controller.close();
          return;
        }
        
        // Extract base64 data from data URL
        const refImageBase64 = referenceImage.split(',')[1];
        const sessionId = crypto.randomUUID();

        send({ type: 'session', sessionId });

        if (isCancelled) {
          controller.close();
          return;
        }

        const scriptLabel = scriptType === 'japanese' ? '日本語' : scriptType === 'mixed' ? '日本語+Latin' : 'Latin';
        send({ type: 'status', status: 'analyzing', message: `Extracting DNA (${scriptLabel})...` });
        const dnaStartTime = Date.now();
        
        let refDNA: MathematicalDNA;
        let visualDesc: VisualDescription;
        let dnaError: string | null = null;
        
        try {
          [refDNA, visualDesc] = await Promise.all([
            extractMathematicalDNA(ai, refImageBase64, scriptType),
            extractVisualDescription(ai, refImageBase64)
          ]);
        } catch (extractError) {
          dnaError = extractError instanceof Error ? extractError.message : 'Unknown extraction error';
          refDNA = getDefaultDNA(scriptType);
          visualDesc = { overallStyle: 'Error: ' + dnaError, letterShapes: '', keyCharacteristics: [], howToRecreate: '' };
        }
        
        const dnaTime = Date.now() - dnaStartTime;
        
        if (isCancelled) {
          controller.close();
          return;
        }
        
        const dnaIsDefault = !refDNA.criticalFeatures?.top5 || refDNA.criticalFeatures.top5.length === 0;
        
        send({ 
          type: 'dna', 
          dna: refDNA,
          visualDescription: visualDesc,
          scriptType,
          time: dnaTime,
          warning: dnaIsDefault ? 'DNA extraction returned defaults - API may have failed' : null,
          error: dnaError
        });
        
        let bestScore = 0;
        let bestIteration = 0;
        let previousFeedback: IterationFeedback | undefined = undefined;

        for (let iteration = 1; iteration <= maxIterations; iteration++) {
          if (isCancelled) break;

          send({ 
            type: 'iteration_start', 
            iteration,
            message: iteration === 1 
              ? `Starting iteration ${iteration}...`
              : `Starting iteration ${iteration} (with feedback)...`
          });

          send({ 
            type: 'status', 
            status: 'generating', 
            message: `Generating iteration ${iteration}/${maxIterations}...` 
          });
          
          if (isCancelled) break;

          const genStartTime = Date.now();
          let generatedImageBase64: string;
          try {
            generatedImageBase64 = await generateImage(ai, refImageBase64, targetText, scriptType, refDNA, visualDesc, previousFeedback);
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
            generationTime: genTime
          });

          if (isCancelled) break;

          send({ 
            type: 'status', 
            status: 'evaluating', 
            message: `Evaluating iteration ${iteration}...` 
          });

          const evalStartTime = Date.now();
          
          const genDNA = await extractMathematicalDNA(ai, generatedImageBase64, scriptType);
          const dnaComparison = compareDNA(refDNA, genDNA, scriptType);
          const visualEval = await evaluateVisualSimilarity(ai, refImageBase64, generatedImageBase64, targetText, scriptType);
          
          let finalScore: number;
          const wasReplacedWithStandardFont = 
            !refDNA.standardFontDetection.looksLikeStandardFont && 
            (visualEval.isGeneratedStandardFont || genDNA.standardFontDetection.looksLikeStandardFont);
          
          if (wasReplacedWithStandardFont) {
            finalScore = Math.min(35, Math.round(
              visualEval.similarityScore * 0.2 + 
              visualEval.textAccuracy * 0.4 +
              dnaComparison.overallScore * 0.1
            ));
          } else {
            finalScore = Math.round(
              visualEval.similarityScore * 0.4 +
              visualEval.textAccuracy * 0.3 +
              dnaComparison.overallScore * 0.3
            );
          }
          
          if (visualEval.textAccuracy < 50) {
            finalScore = Math.min(finalScore, 40);
          }
          
          const evalTime = Date.now() - evalStartTime;

          if (isCancelled) break;

          const evalResult = {
            iteration,
            score: finalScore,
            visualScore: visualEval.similarityScore,
            dnaScore: dnaComparison.overallScore,
            textAccuracy: visualEval.textAccuracy,
            detectedText: visualEval.detectedText,
            wasReplacedWithStandardFont,
            visualEvaluation: visualEval,
            comparison: dnaComparison,
            generatedDNA: genDNA,
            evaluationTime: evalTime
          };

          send({ type: 'iteration_eval', ...evalResult });

          if (finalScore > bestScore) {
            bestScore = finalScore;
            bestIteration = iteration;
          }

          previousFeedback = {
            lostFeatures: visualEval.lostFeatures,
            preservedFeatures: visualEval.preservedFeatures,
            previousScore: finalScore,
            critique: visualEval.critique
          };

          if (finalScore >= 90 && !wasReplacedWithStandardFont) {
            break;
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
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

// === VISUAL DESCRIPTION EXTRACTION ===
async function extractVisualDescription(ai: GoogleGenAI, imageBase64: string): Promise<VisualDescription> {
  const prompt = `Analyze the typography in this image. Return JSON only:
{"overallStyle":"<1 sentence describing the overall style>","letterShapes":"<describe each visible letter briefly>","keyCharacteristics":["<feature 1>","<feature 2>","<feature 3>","<feature 4>","<feature 5>"],"howToRecreate":"<brief instructions>"}`;

  try {
    const response = await ai.models.generateContent({
      model: MODELS.ANALYSIS,
      contents: [{
        role: 'user',
        parts: [
          { inlineData: { mimeType: 'image/png', data: imageBase64 } },
          { text: prompt }
        ]
      }]
    });

    const part = response.candidates?.[0]?.content?.parts?.[0];
    if (part && 'text' in part && part.text) {
      let jsonStr = part.text;
      const codeBlockMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (codeBlockMatch) {
        jsonStr = codeBlockMatch[1];
      }
      const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          overallStyle: parsed.overallStyle || 'Not specified',
          letterShapes: parsed.letterShapes || '',
          keyCharacteristics: Array.isArray(parsed.keyCharacteristics) ? parsed.keyCharacteristics : [],
          howToRecreate: parsed.howToRecreate || ''
        };
      }
    }
  } catch (e) {
    console.error('[VisualDesc] Error:', e);
  }

  return {
    overallStyle: 'Unable to extract',
    letterShapes: '',
    keyCharacteristics: [],
    howToRecreate: ''
  };
}

// === DNA EXTRACTION ===
async function extractMathematicalDNA(ai: GoogleGenAI, imageBase64: string, scriptType: ScriptType = 'latin'): Promise<MathematicalDNA> {
  const prompt = `Analyze this typography image and extract its visual DNA. Focus on the unique characteristics.

IMPORTANT: Identify the TOP 5 most distinctive visual features that make this typeface unique.

Respond with ONLY a JSON object (no markdown code blocks):
{"scriptType":"${scriptType}","visualStyle":{"backgroundColor":"white","textColor":"black","fillStyle":"solid","outlineThicknessPx":0,"italicAngleDeg":0,"hasDropShadow":false,"has3DEffect":false,"textureStyle":"clean"},"metrics":{"imageWidth":1024,"imageHeight":1024,"capHeight":200,"xHeight":140,"baseline":700,"meanline":500},"stroke":{"thickestPx":40,"thinnestPx":40,"contrastRatio":1.0,"averageWeightPx":40,"weightToCapRatio":0.2},"geometry":{"curveRadiusPx":10,"curveEccentricity":0,"outerCornerRadiusPx":5,"innerCornerRadiusPx":5,"cornerRadiusRatio":0.5,"inkTrapDepthPx":0,"inkTrapAngleDeg":0},"terminals":{"cutAngleDeg":0,"roundnessFactor":0.5,"serifLengthPx":0,"serifThicknessPx":0},"spacing":{"letterSpacingPx":20,"letterSpacingRatio":0.1,"wordSpacingPx":80,"sideBearingPx":10},"proportions":{"widthToHeightRatio":0.8,"xHeightToCapRatio":0.7,"counterAreaRatio":0.3,"negativeSpaceRatio":0.5},"features":{"hasStencilGaps":false,"stencilGapWidthPx":0,"hasLigatures":false,"hasTouchingLetters":false},"standardFontDetection":{"looksLikeStandardFont":false,"confidence":0.8,"detectedCategory":"custom_logotype","uniqueFeatures":["feature1","feature2"],"standardFontSimilarity":"none"},"criticalFeatures":{"top5":["distinctive feature 1","distinctive feature 2","distinctive feature 3","distinctive feature 4","distinctive feature 5"],"mustPreserve":["most important feature"],"characterWidthVariance":"natural","widthDescription":"description of width variation"}}

Replace all placeholder values with actual analysis of the image. Be specific about what makes this typeface unique.`;

  try {
    const response = await ai.models.generateContent({
      model: MODELS.ANALYSIS,
      contents: [{
        role: 'user',
        parts: [
          { inlineData: { mimeType: 'image/png', data: imageBase64 } },
          { text: prompt }
        ]
      }]
    });

    const part = response.candidates?.[0]?.content?.parts?.[0];
    if (part && 'text' in part && part.text) {
      const json = part.text.match(/\{[\s\S]*\}/)?.[0];
      if (json) {
        try {
          const parsed = JSON.parse(json);
          return validateAndFillDNA(parsed, scriptType);
        } catch (parseErr) {
          console.error('[DNA] JSON parse error:', parseErr);
        }
      }
    }
  } catch (e) {
    console.error('[DNA] Extraction error:', e);
    const defaultDNA = getDefaultDNA(scriptType);
    defaultDNA.criticalFeatures.widthDescription = 'ERROR: ' + (e instanceof Error ? e.message : String(e));
    return defaultDNA;
  }

  return getDefaultDNA(scriptType);
}

function validateAndFillDNA(data: Partial<MathematicalDNA>, scriptType: ScriptType): MathematicalDNA {
  const defaults = getDefaultDNA(scriptType);
  return { ...defaults, ...data } as MathematicalDNA;
}

function getDefaultDNA(scriptType: ScriptType): MathematicalDNA {
  return {
    scriptType,
    visualStyle: {
      backgroundColor: 'white',
      textColor: 'black',
      fillStyle: 'solid',
      outlineThicknessPx: 0,
      italicAngleDeg: 0,
      hasDropShadow: false,
      has3DEffect: false,
      textureStyle: 'clean',
    },
    metrics: { imageWidth: 1024, imageHeight: 1024, capHeight: 200, xHeight: 140, baseline: 700, meanline: 500 },
    stroke: { thickestPx: 40, thinnestPx: 40, contrastRatio: 1.0, averageWeightPx: 40, weightToCapRatio: 0.2 },
    geometry: { curveRadiusPx: 100, curveEccentricity: 0, outerCornerRadiusPx: 0, innerCornerRadiusPx: 0, cornerRadiusRatio: 0, inkTrapDepthPx: 0, inkTrapAngleDeg: 0 },
    terminals: { cutAngleDeg: 0, roundnessFactor: 0, serifLengthPx: 0, serifThicknessPx: 0 },
    spacing: { letterSpacingPx: 20, letterSpacingRatio: 0.1, wordSpacingPx: 80, sideBearingPx: 10 },
    proportions: { widthToHeightRatio: 0.8, xHeightToCapRatio: 0.7, counterAreaRatio: 0.3, negativeSpaceRatio: 0.5 },
    features: { hasStencilGaps: false, stencilGapWidthPx: 0, hasLigatures: false, hasTouchingLetters: false },
    standardFontDetection: { looksLikeStandardFont: false, confidence: 0.5, detectedCategory: 'custom_logotype', uniqueFeatures: [], standardFontSimilarity: 'none' },
    criticalFeatures: { top5: [], mustPreserve: [], characterWidthVariance: 'natural', widthDescription: '' },
  };
}

// === VISUAL SIMILARITY EVALUATION ===
async function evaluateVisualSimilarity(
  ai: GoogleGenAI,
  refBase64: string,
  genBase64: string,
  targetText: string,
  scriptType: ScriptType
): Promise<VisualSimilarityResult> {
  const prompt = `You are a typography expert. Compare these two images:
IMAGE 1 (first image): The REFERENCE design - the original typeface style
IMAGE 2 (second image): The GENERATED attempt to recreate that style

The target text that should appear in the generated image is: "${targetText}"

EVALUATION TASKS:
1. Read the text in the GENERATED image (IMAGE 2) carefully
2. Compare if it matches the target text "${targetText}" exactly
3. Rate the visual style similarity between reference and generated

SIMILARITY SCORING (0-100):
- 90-100: Nearly identical letterform style, weight, and character
- 70-89: Good style match with minor differences in details
- 50-69: Moderate match, some stylistic features lost
- 30-49: Poor match, many important features different
- 0-29: Complete mismatch or replaced with standard font

TEXT ACCURACY SCORING (0-100):
- 100: Exact match - all characters are correct
- 75: Minor issue - one character slightly malformed but readable
- 50: One character wrong or missing
- 25: Multiple characters wrong or missing
- 0: Completely wrong or unreadable

IMPORTANT: Be strict. If the generated image uses a standard/generic font instead of matching the reference's custom style, score should be under 40.

You MUST respond with ONLY a JSON object (no markdown, no explanation):
{"similarityScore":75,"textAccuracy":100,"detectedText":"${targetText}","isReferenceCustomLogotype":true,"isGeneratedStandardFont":false,"preservedFeatures":["thick strokes","rounded corners"],"lostFeatures":["unique curves","spacing"],"critique":"The generated text maintains weight but loses the distinctive character shapes"}`;

  try {
    const response = await ai.models.generateContent({
      model: MODELS.ANALYSIS,
      contents: [{
        role: 'user',
        parts: [
          { inlineData: { mimeType: 'image/png', data: refBase64 } },
          { inlineData: { mimeType: 'image/png', data: genBase64 } },
          { text: prompt }
        ]
      }]
    });

    const part = response.candidates?.[0]?.content?.parts?.[0];
    if (part && 'text' in part && part.text) {
      const json = part.text.match(/\{[\s\S]*?\}/)?.[0];
      if (json) {
        const parsed = JSON.parse(json);
        return {
          similarityScore: typeof parsed.similarityScore === 'number' ? parsed.similarityScore : 50,
          isReferenceCustomLogotype: parsed.isReferenceCustomLogotype ?? true,
          isGeneratedStandardFont: parsed.isGeneratedStandardFont ?? false,
          preservedFeatures: Array.isArray(parsed.preservedFeatures) ? parsed.preservedFeatures : [],
          lostFeatures: Array.isArray(parsed.lostFeatures) ? parsed.lostFeatures : [],
          critique: parsed.critique || 'No critique provided',
          textAccuracy: typeof parsed.textAccuracy === 'number' ? parsed.textAccuracy : 50,
          detectedText: typeof parsed.detectedText === 'string' ? parsed.detectedText : ''
        };
      }
    }
  } catch (e) {
    console.error('Visual similarity error:', e);
  }

  return {
    similarityScore: 50,
    isReferenceCustomLogotype: true,
    isGeneratedStandardFont: false,
    preservedFeatures: [],
    lostFeatures: ['Unable to evaluate'],
    critique: 'Evaluation failed',
    textAccuracy: 50,
    detectedText: ''
  };
}

// === DNA COMPARISON ===
function compareDNA(ref: MathematicalDNA, gen: MathematicalDNA, scriptType: ScriptType): DNAComparison {
  const refIsDefault = !ref.criticalFeatures?.top5 || ref.criticalFeatures.top5.length === 0;
  const genIsDefault = !gen.criticalFeatures?.top5 || gen.criticalFeatures.top5.length === 0;
  
  if (refIsDefault && genIsDefault) {
    return {
      strokeContrastDiff: 0,
      strokeWeightDiff: 0,
      curveRadiusDiff: 0,
      cornerRadiusDiff: 0,
      inkTrapDepthDiff: 0,
      spacingDiff: 0,
      proportionDiff: 0,
      terminalDiff: 0,
      featureMatch: true,
      overallScore: 50,
    };
  }

  const safeDiff = (a: number, b: number): number => {
    if (a === 0 && b === 0) return 0;
    return Math.abs(a - b) / Math.max(Math.abs(a), Math.abs(b), 1);
  };

  const strokeContrastDiff = safeDiff(ref.stroke.contrastRatio, gen.stroke.contrastRatio);
  const strokeWeightDiff = safeDiff(ref.stroke.averageWeightPx, gen.stroke.averageWeightPx);
  const curveRadiusDiff = safeDiff(ref.geometry.curveRadiusPx, gen.geometry.curveRadiusPx);
  const cornerRadiusDiff = safeDiff(ref.geometry.outerCornerRadiusPx, gen.geometry.outerCornerRadiusPx);
  const inkTrapDepthDiff = safeDiff(ref.geometry.inkTrapDepthPx, gen.geometry.inkTrapDepthPx);
  const spacingDiff = safeDiff(ref.spacing.letterSpacingPx, gen.spacing.letterSpacingPx);
  const proportionDiff = safeDiff(ref.proportions.widthToHeightRatio, gen.proportions.widthToHeightRatio);
  const terminalDiff = safeDiff(ref.terminals.roundnessFactor, gen.terminals.roundnessFactor);
  
  const featureMatch = ref.features.hasStencilGaps === gen.features.hasStencilGaps;

  let score = 100;
  score -= strokeContrastDiff * 20;
  score -= strokeWeightDiff * 15;
  score -= curveRadiusDiff * 15;
  score -= cornerRadiusDiff * 10;
  score -= inkTrapDepthDiff * 10;
  score -= spacingDiff * 10;
  score -= proportionDiff * 10;
  score -= terminalDiff * 5;
  if (!featureMatch) score -= 5;
  
  if (refIsDefault || genIsDefault) {
    score = Math.min(score, 60);
  }

  return {
    strokeContrastDiff,
    strokeWeightDiff,
    curveRadiusDiff,
    cornerRadiusDiff,
    inkTrapDepthDiff,
    spacingDiff,
    proportionDiff,
    terminalDiff,
    featureMatch,
    overallScore: Math.max(0, Math.round(score)),
  };
}

// === IMAGE GENERATION ===
async function generateImage(
  ai: GoogleGenAI, 
  refBase64: string, 
  targetText: string, 
  scriptType: ScriptType,
  referenceDNA: MathematicalDNA,
  visualDesc: VisualDescription,
  feedback?: IterationFeedback
): Promise<string> {
  const vs = referenceDNA.visualStyle || {};
  const cf = referenceDNA.criticalFeatures || {};
  const sfd = referenceDNA.standardFontDetection || {};
  
  const cfTop5 = Array.isArray(cf.top5) ? cf.top5 : [];
  const cfMustPreserve = Array.isArray(cf.mustPreserve) ? cf.mustPreserve : [];
  const sfdUniqueFeatures = Array.isArray(sfd.uniqueFeatures) ? sfd.uniqueFeatures : [];
  
  const feedbackSection = feedback ? `
=== PREVIOUS ATTEMPT FAILED (Score: ${feedback.previousScore}/100) ===
CRITIQUE: ${feedback.critique}
LOST FEATURES YOU MUST FIX:
${Array.isArray(feedback.lostFeatures) ? feedback.lostFeatures.map(f => `- ${f}`).join('\n') : '- Unknown'}
PRESERVED (keep these): ${Array.isArray(feedback.preservedFeatures) ? feedback.preservedFeatures.join(', ') : 'Unknown'}
` : '';

  const criticalFeaturesSection = cfTop5.length > 0 ? `
=== CRITICAL STYLE FEATURES TO REPLICATE ===
${cfTop5.map((f, i) => `${i + 1}. ${f}`).join('\n')}

MUST PRESERVE AT ALL COSTS:
${cfMustPreserve.length > 0 ? cfMustPreserve.join('\n') : 'All features above'}
` : '';

  const standardFontWarning = !sfd.looksLikeStandardFont ? `
=== WARNING: CUSTOM LOGOTYPE ===
This is NOT a standard font. It has these unique features:
${sfdUniqueFeatures.length > 0 ? sfdUniqueFeatures.map(f => `- ${f}`).join('\n') : '- Custom letterforms'}
DO NOT substitute with any system/standard font like Arial, Helvetica, Gothic, etc.
You MUST recreate the custom letterforms exactly.
` : '';

  const widthGuidance = cf.widthDescription ? `
=== CHARACTER WIDTH VARIATION ===
${cf.widthDescription}
Width variance: ${cf.characterWidthVariance || 'natural'}
` : '';

  const visualStyleSection = `
=== VISUAL STYLE ===
- Background: ${vs.backgroundColor || 'white'}
- Text color: ${vs.textColor || 'black'}
- Fill style: ${vs.fillStyle || 'solid'}
${vs.italicAngleDeg > 0 ? `- Italic angle: ${vs.italicAngleDeg}°` : ''}
${vs.hasDropShadow ? '- Has drop shadow' : ''}
${vs.has3DEffect ? '- Has 3D effect' : ''}
`;

  const visualDescKeyChars = Array.isArray(visualDesc.keyCharacteristics) ? visualDesc.keyCharacteristics : [];
  const fallbackSection = cfTop5.length === 0 && visualDesc.overallStyle !== 'Unable to extract' ? `
=== VISUAL DESCRIPTION ===
Style: ${visualDesc.overallStyle}
Letter shapes: ${visualDesc.letterShapes || 'Not specified'}
Key characteristics: ${visualDescKeyChars.join(', ') || 'Not specified'}
How to recreate: ${visualDesc.howToRecreate || 'Match the reference image'}
` : '';

  const prompt = `
TASK: Recreate the EXACT letterform style from the reference image, spelling "${targetText}".

${feedbackSection}
${criticalFeaturesSection}
${standardFontWarning}
${widthGuidance}
${visualStyleSection}
${fallbackSection}

=== ABSOLUTE REQUIREMENTS ===
1. Spell EXACTLY "${targetText}" - verify each character is correct
2. Copy the EXACT stroke construction, weight, and contrast from reference
3. Match terminals, corners, and curve radii precisely
4. DO NOT use standard/system fonts - recreate the custom letterforms
5. Center the text horizontally
6. No decorations, labels, borders, or watermarks
7. Clean background matching reference style

Look at the reference image carefully. Your output must look like it was created by the same designer.
`.trim();

  const response = await ai.models.generateContent({
    model: MODELS.IMAGE_GEN,
    contents: [{
      role: 'user',
      parts: [
        { inlineData: { mimeType: 'image/png', data: refBase64 } },
        { text: prompt }
      ]
    }],
    config: {
      responseModalities: ['image', 'text'],
    }
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
