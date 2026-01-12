import { NextRequest } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as crypto from 'node:crypto';

const MODELS = {
  ANALYSIS: 'gemini-2.5-flash',  // gemini-3-pro-preview is over quota
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
  textAccuracy: number; // 0-100: How accurately the target text was rendered
  detectedText: string; // What text was actually detected in the generated image
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
        
        const base64Data = referenceImage.split(',')[1];
        const sessionId = crypto.randomUUID();
        const outputDir = path.join(process.cwd(), '..', 'output', `web_${sessionId}`);
        fs.mkdirSync(path.join(outputDir, 'iterations'), { recursive: true });
        
        const refPath = path.join(outputDir, 'reference.png');
        fs.writeFileSync(refPath, Buffer.from(base64Data, 'base64'));

        // Send sessionId to client for feedback saving
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
            extractMathematicalDNA(ai, refPath, scriptType),
            extractVisualDescription(ai, refPath)
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
        
        // Check if DNA extraction actually worked
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
        
        const refDnaPath = path.join(outputDir, 'reference_dna.json');
        fs.writeFileSync(refDnaPath, JSON.stringify({
          targetText,
          scriptType,
          extractionTime: dnaTime,
          dna: refDNA,
          visualDescription: visualDesc
        }, null, 2));
        
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

          const iterPath = path.join(outputDir, 'iterations', `iteration_${String(iteration).padStart(2, '0')}.png`);
          
          if (isCancelled) break;

          const genStartTime = Date.now();
          try {
            await generateImage(ai, refPath, targetText, iterPath, scriptType, refDNA, visualDesc, previousFeedback);
          } catch (error) {
            if (isCancelled) break;
            send({ type: 'iteration_error', iteration, message: `Generation failed: ${error}` });
            continue;
          }
          const genTime = Date.now() - genStartTime;

          if (isCancelled) break;

          const imageBuffer = fs.readFileSync(iterPath);
          const imageBase64 = `data:image/png;base64,${imageBuffer.toString('base64')}`;
          
          send({ 
            type: 'iteration_image', 
            iteration,
            imageUrl: imageBase64,
            generationTime: genTime
          });

          if (isCancelled) break;

          send({ 
            type: 'status', 
            status: 'evaluating', 
            message: `Evaluating iteration ${iteration}...` 
          });

          const evalStartTime = Date.now();
          
          const genDNA = await extractMathematicalDNA(ai, iterPath, scriptType);
          const dnaComparison = compareDNA(refDNA, genDNA, scriptType);
          const visualEval = await evaluateVisualSimilarity(ai, refPath, iterPath, targetText, scriptType);
          
          let finalScore: number;
          const wasReplacedWithStandardFont = 
            !refDNA.standardFontDetection.looksLikeStandardFont && 
            (visualEval.isGeneratedStandardFont || genDNA.standardFontDetection.looksLikeStandardFont);
          
          // New scoring formula with text accuracy
          // - Visual style similarity: 40%
          // - Text accuracy (correct characters): 30%
          // - DNA comparison: 30%
          if (wasReplacedWithStandardFont) {
            // Heavy penalty for replacing custom logotype with standard font
            finalScore = Math.min(35, Math.round(
              visualEval.similarityScore * 0.2 + 
              visualEval.textAccuracy * 0.4 +
              dnaComparison.overallScore * 0.1
            ));
          } else {
            finalScore = Math.round(
              visualEval.similarityScore * 0.4 +   // Style match
              visualEval.textAccuracy * 0.3 +       // Correct text
              dnaComparison.overallScore * 0.3      // Technical DNA match
            );
          }
          
          // Additional penalty for wrong text
          if (visualEval.textAccuracy < 50) {
            finalScore = Math.min(finalScore, 40); // Cap score if text is wrong
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

          const evalJsonPath = iterPath.replace('.png', '_eval.json');
          fs.writeFileSync(evalJsonPath, JSON.stringify(evalResult, null, 2));

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
async function extractVisualDescription(ai: GoogleGenAI, imagePath: string): Promise<VisualDescription> {
  const imageData = fs.readFileSync(imagePath).toString('base64');
  
  // Simplified prompt - shorter and more focused for better success rate
  const prompt = `Analyze the typography in this image. Return JSON only:
{"overallStyle":"<1 sentence describing the overall style>","letterShapes":"<describe each visible letter briefly>","keyCharacteristics":["<feature 1>","<feature 2>","<feature 3>","<feature 4>","<feature 5>"],"howToRecreate":"<brief instructions>"}`;

  try {
    console.log('[VisualDesc] Starting extraction...');
    const response = await ai.models.generateContent({
      model: MODELS.ANALYSIS,
      contents: [{
        role: 'user',
        parts: [
          { inlineData: { mimeType: 'image/png', data: imageData } },
          { text: prompt }
        ]
      }]
    });

    const part = response.candidates?.[0]?.content?.parts?.[0];
    if (part && 'text' in part && part.text) {
      console.log('[VisualDesc] Got response:', part.text.substring(0, 300));
      // Try to extract JSON - handle both with and without code blocks
      let jsonStr = part.text;
      // Remove markdown code blocks if present
      const codeBlockMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (codeBlockMatch) {
        jsonStr = codeBlockMatch[1];
      }
      // Try to find JSON object
      const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        console.log('[VisualDesc] Parsed OK, keyCharacteristics:', parsed.keyCharacteristics?.length);
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

  console.log('[VisualDesc] Returning default');
  return {
    overallStyle: 'Unable to extract',
    letterShapes: '',
    keyCharacteristics: [],
    howToRecreate: ''
  };
}

// === DNA EXTRACTION ===
async function extractMathematicalDNA(ai: GoogleGenAI, imagePath: string, scriptType: ScriptType = 'latin'): Promise<MathematicalDNA> {
  const imageData = fs.readFileSync(imagePath).toString('base64');
  
  const prompt = `Analyze this typography image and extract its visual DNA. Focus on the unique characteristics.

IMPORTANT: Identify the TOP 5 most distinctive visual features that make this typeface unique.

Respond with ONLY a JSON object (no markdown code blocks):
{"scriptType":"${scriptType}","visualStyle":{"backgroundColor":"white","textColor":"black","fillStyle":"solid","outlineThicknessPx":0,"italicAngleDeg":0,"hasDropShadow":false,"has3DEffect":false,"textureStyle":"clean"},"metrics":{"imageWidth":1024,"imageHeight":1024,"capHeight":200,"xHeight":140,"baseline":700,"meanline":500},"stroke":{"thickestPx":40,"thinnestPx":40,"contrastRatio":1.0,"averageWeightPx":40,"weightToCapRatio":0.2},"geometry":{"curveRadiusPx":10,"curveEccentricity":0,"outerCornerRadiusPx":5,"innerCornerRadiusPx":5,"cornerRadiusRatio":0.5,"inkTrapDepthPx":0,"inkTrapAngleDeg":0},"terminals":{"cutAngleDeg":0,"roundnessFactor":0.5,"serifLengthPx":0,"serifThicknessPx":0},"spacing":{"letterSpacingPx":20,"letterSpacingRatio":0.1,"wordSpacingPx":80,"sideBearingPx":10},"proportions":{"widthToHeightRatio":0.8,"xHeightToCapRatio":0.7,"counterAreaRatio":0.3,"negativeSpaceRatio":0.5},"features":{"hasStencilGaps":false,"stencilGapWidthPx":0,"hasLigatures":false,"hasTouchingLetters":false},"standardFontDetection":{"looksLikeStandardFont":false,"confidence":0.8,"detectedCategory":"custom_logotype","uniqueFeatures":["feature1","feature2"],"standardFontSimilarity":"none"},"criticalFeatures":{"top5":["distinctive feature 1","distinctive feature 2","distinctive feature 3","distinctive feature 4","distinctive feature 5"],"mustPreserve":["most important feature"],"characterWidthVariance":"natural","widthDescription":"description of width variation"}}

Replace all placeholder values with actual analysis of the image. Be specific about what makes this typeface unique.`;

  try {
    console.log('[DNA] Starting extraction with model:', MODELS.ANALYSIS);
    const response = await ai.models.generateContent({
      model: MODELS.ANALYSIS,
      contents: [{
        role: 'user',
        parts: [
          { inlineData: { mimeType: 'image/png', data: imageData } },
          { text: prompt }
        ]
      }]
    });

    console.log('[DNA] Got response, candidates:', response.candidates?.length);
    const part = response.candidates?.[0]?.content?.parts?.[0];
    if (part && 'text' in part && part.text) {
      console.log('[DNA] Raw response (first 500 chars):', part.text.substring(0, 500));
      const json = part.text.match(/\{[\s\S]*\}/)?.[0];
      if (json) {
        try {
          const parsed = JSON.parse(json);
          console.log('[DNA] Parsed OK. Top5 features:', parsed.criticalFeatures?.top5);
          return validateAndFillDNA(parsed, scriptType);
        } catch (parseErr) {
          console.error('[DNA] JSON parse error:', parseErr, 'Raw:', json.substring(0, 200));
        }
      } else {
        console.error('[DNA] No JSON found in response. Full text:', part.text);
      }
    } else {
      console.error('[DNA] No text part. Response structure:', JSON.stringify(response.candidates?.[0]?.content, null, 2));
    }
  } catch (e) {
    const errorMsg = e instanceof Error ? e.message : String(e);
    console.error('[DNA] Extraction error:', errorMsg);
    // Return default but mark the error in the DNA
    const defaultDNA = getDefaultDNA(scriptType);
    defaultDNA.criticalFeatures.widthDescription = 'ERROR: ' + errorMsg;
    return defaultDNA;
  }

  console.log('[DNA] Returning default DNA (no valid response)');
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
  refPath: string,
  genPath: string,
  targetText: string,
  scriptType: ScriptType
): Promise<VisualSimilarityResult> {
  const refData = fs.readFileSync(refPath).toString('base64');
  const genData = fs.readFileSync(genPath).toString('base64');
  
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
          { inlineData: { mimeType: 'image/png', data: refData } },
          { inlineData: { mimeType: 'image/png', data: genData } },
          { text: prompt }
        ]
      }]
    });

    const part = response.candidates?.[0]?.content?.parts?.[0];
    if (part && 'text' in part && part.text) {
      console.log('Visual eval raw response:', part.text.substring(0, 500));
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
      } else {
        console.error('No JSON found in response:', part.text.substring(0, 200));
      }
    } else {
      console.error('No text part in response');
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
  // Check if either DNA is default values (extraction failed)
  const refIsDefault = !ref.criticalFeatures?.top5 || ref.criticalFeatures.top5.length === 0;
  const genIsDefault = !gen.criticalFeatures?.top5 || gen.criticalFeatures.top5.length === 0;
  
  // If both are default values, we can't meaningfully compare - return low score
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
      overallScore: 50, // Uncertain - can't evaluate properly
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
  
  // Penalty if one side is default values
  if (refIsDefault || genIsDefault) {
    score = Math.min(score, 60); // Cap at 60 if we couldn't properly analyze one side
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
  refPath: string, 
  targetText: string, 
  outputPath: string,
  scriptType: ScriptType,
  referenceDNA: MathematicalDNA,
  visualDesc: VisualDescription,
  feedback?: IterationFeedback
): Promise<void> {
  const refData = fs.readFileSync(refPath).toString('base64');
  
  const vs = referenceDNA.visualStyle || {};
  const cf = referenceDNA.criticalFeatures || {};
  const sfd = referenceDNA.standardFontDetection || {};
  
  // Safe array access helpers
  const cfTop5 = Array.isArray(cf.top5) ? cf.top5 : [];
  const cfMustPreserve = Array.isArray(cf.mustPreserve) ? cf.mustPreserve : [];
  const sfdUniqueFeatures = Array.isArray(sfd.uniqueFeatures) ? sfd.uniqueFeatures : [];
  
  // Build feedback section for iterations 2+
  const feedbackSection = feedback ? `
=== PREVIOUS ATTEMPT FAILED (Score: ${feedback.previousScore}/100) ===
CRITIQUE: ${feedback.critique}
LOST FEATURES YOU MUST FIX:
${Array.isArray(feedback.lostFeatures) ? feedback.lostFeatures.map(f => `- ${f}`).join('\n') : '- Unknown'}
PRESERVED (keep these): ${Array.isArray(feedback.preservedFeatures) ? feedback.preservedFeatures.join(', ') : 'Unknown'}
` : '';

  // Build critical features section from DNA analysis
  const criticalFeaturesSection = cfTop5.length > 0 ? `
=== CRITICAL STYLE FEATURES TO REPLICATE ===
${cfTop5.map((f, i) => `${i + 1}. ${f}`).join('\n')}

MUST PRESERVE AT ALL COSTS:
${cfMustPreserve.length > 0 ? cfMustPreserve.join('\n') : 'All features above'}
` : '';

  // Build standard font warning
  const standardFontWarning = !sfd.looksLikeStandardFont ? `
=== WARNING: CUSTOM LOGOTYPE ===
This is NOT a standard font. It has these unique features:
${sfdUniqueFeatures.length > 0 ? sfdUniqueFeatures.map(f => `- ${f}`).join('\n') : '- Custom letterforms'}
DO NOT substitute with any system/standard font like Arial, Helvetica, Gothic, etc.
You MUST recreate the custom letterforms exactly.
` : '';

  // Build character width guidance
  const widthGuidance = cf.widthDescription ? `
=== CHARACTER WIDTH VARIATION ===
${cf.widthDescription}
Width variance: ${cf.characterWidthVariance || 'natural'}
` : '';

  // Visual style section
  const visualStyleSection = `
=== VISUAL STYLE ===
- Background: ${vs.backgroundColor || 'white'}
- Text color: ${vs.textColor || 'black'}
- Fill style: ${vs.fillStyle || 'solid'}
${vs.italicAngleDeg > 0 ? `- Italic angle: ${vs.italicAngleDeg}°` : ''}
${vs.hasDropShadow ? '- Has drop shadow' : ''}
${vs.has3DEffect ? '- Has 3D effect' : ''}
`;

  // Fallback to visualDesc if criticalFeatures is empty
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
        { inlineData: { mimeType: 'image/png', data: refData } },
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
        fs.writeFileSync(outputPath, Buffer.from(part.inlineData.data, 'base64'));
        return;
      }
    }
  }

  throw new Error('No image generated');
}
