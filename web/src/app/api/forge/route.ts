import { NextRequest } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as crypto from 'node:crypto';

const MODELS = {
  ANALYSIS: 'gemini-3-pro-preview',
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
  // Script type
  scriptType: ScriptType;

  // METRICS (絶対値 px)
  metrics: {
    imageWidth: number;
    imageHeight: number;
    capHeight: number;
    xHeight: number;
    baseline: number;
    meanline: number;
  };

  // STROKE (線の物理)
  stroke: {
    thickestPx: number;
    thinnestPx: number;
    contrastRatio: number;
    averageWeightPx: number;
    weightToCapRatio: number;
  };

  // GEOMETRY (幾何学)
  geometry: {
    curveRadiusPx: number;
    curveEccentricity: number;
    outerCornerRadiusPx: number;
    innerCornerRadiusPx: number;
    cornerRadiusRatio: number;
    inkTrapDepthPx: number;
    inkTrapAngleDeg: number;
  };

  // TERMINALS (末端処理)
  terminals: {
    cutAngleDeg: number;
    roundnessFactor: number;
    serifLengthPx: number;
    serifThicknessPx: number;
  };

  // SPACING (配置)
  spacing: {
    letterSpacingPx: number;
    letterSpacingRatio: number;
    wordSpacingPx: number;
    sideBearingPx: number;
  };

  // PROPORTIONS (比率)
  proportions: {
    widthToHeightRatio: number;
    xHeightToCapRatio: number;
    counterAreaRatio: number;
    negativeSpaceRatio: number;
  };

  // SPECIAL FEATURES
  features: {
    hasStencilGaps: boolean;
    stencilGapWidthPx: number;
    hasLigatures: boolean;
    hasTouchingLetters: boolean;
  };

  // JAPANESE-SPECIFIC (日本語特有) - only populated for japanese/mixed scripts
  japanese?: {
    // === 書体分類 ===
    styleCategory: 'geometric' | 'calligraphic' | 'gothic' | 'mincho' | 'handwritten' | 'decorative';
    
    // 画数・構造
    strokeComplexity: number;      // 平均画数 (1-30)
    radicalBalance: number;        // 部首バランス (0-1, 0.5=均等)
    
    // 線の特性
    haraiFactor: number;           // 払い (0=なし, 1=強い)
    tomeFactor: number;            // 止め (0=なし, 1=強い)
    haneFactor: number;            // 跳ね (0=なし, 1=強い)
    
    // 構造
    squareness: number;            // 正方形度 (0=縦長, 0.5=正方, 1=横長)
    densityCenter: number;         // 密度中心 (0=上, 0.5=中央, 1=下)
    
    // スタイル（レガシー）
    isMincho: boolean;             // 明朝体風
    isGothic: boolean;             // ゴシック体風
    isHandwritten: boolean;        // 手書き風
    
    // カナ特有
    kanaRoundness: number;         // 仮名の丸み (0-1)
    kanaConnectionFluidity: number; // 連綿の流れ (0-1)
    
    // === 幾何学的ロゴタイプ特有 ===
    isGeometricLogotype: boolean;  // 幾何学的ロゴタイプか
    isModularGrid: boolean;        // モジュラーグリッド構造か
    gridUnitPx: number;            // グリッド単位 px
    cornerRadiusPx: number;        // 角丸半径 px (0=シャープ)
    isMonoline: boolean;           // 均一線幅か
    hasStencilBreaks: boolean;     // ステンシル的な切れ目があるか
    strokeEndStyle: 'flat' | 'round' | 'angled' | 'brush' | 'tapered';  // 線端処理
    counterStyle: 'geometric' | 'organic' | 'traditional' | 'flowing';  // カウンター形状
    verticalAlignment: 'baseline' | 'center' | 'top' | 'dynamic';  // 縦揃え
    horizontalCompression: number; // 横圧縮率 (0.5=半分, 1=標準, 1.5=広い)
    
    // === カリグラフィック・筆文字特有 ===
    isCalligraphic: boolean;       // カリグラフィック書体か
    brushAngleDeg: number;         // 筆角度 (0=垂直, 45=斜め, 90=水平)
    baselineAngleDeg: number;      // ベースライン角度 (-30〜+30, 0=水平)
    italicAngleDeg: number;        // イタリック角度 (0=正体, 15=斜体)
    strokeRhythm: 'uniform' | 'flowing' | 'dramatic' | 'staccato';  // 線のリズム
    entryStrokeStyle: 'sharp' | 'soft' | 'hairline' | 'bold';  // 入り筆のスタイル
    exitStrokeStyle: 'sharp' | 'tapered' | 'flourish' | 'abrupt';  // 抜き筆のスタイル
    thickThinTransition: 'gradual' | 'sudden' | 'smooth';  // 太細の遷移
    overallElegance: number;       // 優雅さ (0=無骨, 1=優雅)
    connectedness: number;         // 連綿度 (0=分離, 1=連続)
    dynamicRange: number;          // ダイナミックレンジ (0=静的, 1=動的)
  };
}

// === DNA COMPARISON INTERFACE ===
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

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();
  
  // Track if client disconnected
  let isCancelled = false;
  
  // Listen for client disconnect via AbortSignal
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

        // Detect script type
        const scriptType = detectScript(targetText);
        
        const ai = new GoogleGenAI({ apiKey });

        // Save reference image
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

        // Check cancellation
        if (isCancelled) {
          controller.close();
          return;
        }

        // Extract reference DNA
        const scriptLabel = scriptType === 'japanese' ? '日本語' : scriptType === 'mixed' ? '日本語+Latin' : 'Latin';
        send({ type: 'status', status: 'analyzing', message: `Extracting DNA (${scriptLabel})...` });
        const dnaStartTime = Date.now();
        const refDNA = await extractMathematicalDNA(ai, refPath, scriptType);
        const dnaTime = Date.now() - dnaStartTime;
        
        if (isCancelled) {
          controller.close();
          return;
        }
        
        send({ 
          type: 'dna', 
          dna: refDNA,
          scriptType,
          time: dnaTime
        });
        
        let bestScore = 0;
        let bestIteration = 0;

        // Iteration loop
        for (let iteration = 1; iteration <= maxIterations; iteration++) {
          // Check cancellation at start of each iteration
          if (isCancelled) {
            break;
          }

          // Send iteration_start event first
          send({ 
            type: 'iteration_start', 
            iteration,
            message: `Starting iteration ${iteration}...`
          });

          send({ 
            type: 'status', 
            status: 'generating', 
            message: `Generating iteration ${iteration}/${maxIterations}...` 
          });

          const iterPath = path.join(outputDir, 'iterations', `iteration_${String(iteration).padStart(2, '0')}.png`);
          
          // Check cancellation before generation
          if (isCancelled) break;

          // Generate image
          const genStartTime = Date.now();
          try {
            await generateImage(ai, refPath, targetText, iterPath, scriptType, refDNA);
          } catch (error) {
            if (isCancelled) break;
            send({ type: 'iteration_error', iteration, message: `Generation failed, retrying...` });
            continue;
          }
          const genTime = Date.now() - genStartTime;

          // Check cancellation after generation
          if (isCancelled) break;

          // Send image immediately after generation
          const imageBuffer = fs.readFileSync(iterPath);
          const imageBase64 = `data:image/png;base64,${imageBuffer.toString('base64')}`;
          
          send({ 
            type: 'iteration_image', 
            iteration,
            imageUrl: imageBase64,
            generationTime: genTime
          });

          // Check cancellation before evaluation
          if (isCancelled) break;

          // Now evaluate
          send({ 
            type: 'status', 
            status: 'evaluating', 
            message: `Evaluating iteration ${iteration}...` 
          });

          const evalStartTime = Date.now();
          const genDNA = await extractMathematicalDNA(ai, iterPath, scriptType);
          const comparison = compareDNA(refDNA, genDNA, scriptType);
          const evalTime = Date.now() - evalStartTime;

          // Check cancellation after evaluation
          if (isCancelled) break;

          // Send evaluation results
          send({ 
            type: 'iteration_eval', 
            iteration,
            score: comparison.overallScore,
            comparison,
            generatedDNA: genDNA,
            evaluationTime: evalTime
          });

          if (comparison.overallScore > bestScore) {
            bestScore = comparison.overallScore;
            bestIteration = iteration;
          }

          if (comparison.overallScore >= 85) {
            break;
          }
        }

        if (!isCancelled) {
          const totalTime = Date.now() - startTime;
          send({ 
            type: 'complete', 
            bestScore, 
            bestIteration,
            totalTime
          });
        }

      } catch (error) {
        if (!isCancelled) {
          send({ 
            type: 'error', 
            message: error instanceof Error ? error.message : 'Unknown error' 
          });
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

// === DNA EXTRACTION ===
async function extractMathematicalDNA(ai: GoogleGenAI, imagePath: string, scriptType: ScriptType = 'latin'): Promise<MathematicalDNA> {
  const imageData = fs.readFileSync(imagePath).toString('base64');
  
  const basePrompt = `You are a forensic typography analyst. Analyze this image and extract PRECISE NUMERICAL measurements.`;
  
  const latinFields = `
  "metrics": {
    "imageWidth": <image width px>,
    "imageHeight": <image height px>,
    "capHeight": <capital letter height px>,
    "xHeight": <lowercase x height px>,
    "baseline": <baseline y-position px>,
    "meanline": <meanline y-position px>
  },
  "stroke": {
    "thickestPx": <thickest stroke width px>,
    "thinnestPx": <thinnest stroke width px>,
    "contrastRatio": <thick/thin ratio, 1.0=monoline>,
    "averageWeightPx": <average stroke width px>,
    "weightToCapRatio": <stroke/capHeight ratio>
  },
  "geometry": {
    "curveRadiusPx": <radius of curves like O, C px>,
    "curveEccentricity": <0=perfect circle, 1=flat>,
    "outerCornerRadiusPx": <outer corner radius px>,
    "innerCornerRadiusPx": <inner corner radius px>,
    "cornerRadiusRatio": <cornerR/strokeWeight>,
    "inkTrapDepthPx": <ink trap depth px, 0 if none>,
    "inkTrapAngleDeg": <ink trap angle degrees>
  },
  "terminals": {
    "cutAngleDeg": <terminal cut angle, 0=vertical, 90=horizontal>,
    "roundnessFactor": <0=flat cut, 1=fully rounded>,
    "serifLengthPx": <serif length px, 0 for sans>,
    "serifThicknessPx": <serif thickness px>
  },
  "spacing": {
    "letterSpacingPx": <average letter spacing px>,
    "letterSpacingRatio": <spacing/capHeight ratio>,
    "wordSpacingPx": <word spacing px>,
    "sideBearingPx": <average side bearing px>
  },
  "proportions": {
    "widthToHeightRatio": <average letter width/height>,
    "xHeightToCapRatio": <xHeight/capHeight>,
    "counterAreaRatio": <counter area / total area>,
    "negativeSpaceRatio": <negative space / total area>
  },
  "features": {
    "hasStencilGaps": <true if stencil-style breaks>,
    "stencilGapWidthPx": <gap width px if stencil>,
    "hasLigatures": <true if connected letters>,
    "hasTouchingLetters": <true if letters touch>
  }`;

  const japaneseFields = `
  "japanese": {
    "styleCategory": <"geometric" | "calligraphic" | "gothic" | "mincho" | "handwritten" | "decorative">,
    
    "strokeComplexity": <average stroke count per character, 1-30>,
    "radicalBalance": <balance of radicals, 0=left-heavy, 0.5=balanced, 1=right-heavy>,
    "haraiFactor": <払い intensity, 0=none, 1=strong sweeping strokes>,
    "tomeFactor": <止め intensity, 0=none, 1=strong stopping>,
    "haneFactor": <跳ね intensity, 0=none, 1=strong flicks>,
    "squareness": <0=tall, 0.5=square, 1=wide>,
    "densityCenter": <0=top-heavy, 0.5=centered, 1=bottom-heavy>,
    "isMincho": <true if serif/明朝 style>,
    "isGothic": <true if sans-serif/ゴシック style>,
    "isHandwritten": <true if handwritten/手書き style>,
    "kanaRoundness": <roundness of kana characters, 0-1>,
    "kanaConnectionFluidity": <fluidity of connected strokes, 0-1>,
    
    "isGeometricLogotype": <true if this is a geometric/modernist logotype design>,
    "isModularGrid": <true if characters are built on a modular grid system>,
    "gridUnitPx": <estimated grid unit size in px, 0 if not grid-based>,
    "cornerRadiusPx": <corner radius on joints/corners in px, 0=sharp>,
    "isMonoline": <true if stroke weight is uniform throughout>,
    "hasStencilBreaks": <true if there are intentional breaks/gaps in strokes>,
    "strokeEndStyle": <"flat" | "round" | "angled" | "brush" | "tapered">,
    "counterStyle": <"geometric" | "organic" | "traditional" | "flowing">,
    "verticalAlignment": <"baseline" | "center" | "top" | "dynamic">,
    "horizontalCompression": <character width ratio, 0.5=compressed, 1=normal, 1.5=extended>,
    
    "isCalligraphic": <true if elegant calligraphic/brush style with dramatic thick-thin contrast>,
    "brushAngleDeg": <brush angle in degrees, 0=vertical, 45=diagonal, 90=horizontal>,
    "baselineAngleDeg": <baseline angle, -30 to +30, 0=horizontal, negative=descending left to right>,
    "italicAngleDeg": <italic slant angle, 0=upright, 5-15=italic>,
    "strokeRhythm": <"uniform" | "flowing" | "dramatic" | "staccato">,
    "entryStrokeStyle": <"sharp" | "soft" | "hairline" | "bold">,
    "exitStrokeStyle": <"sharp" | "tapered" | "flourish" | "abrupt">,
    "thickThinTransition": <"gradual" | "sudden" | "smooth">,
    "overallElegance": <elegance level, 0=rough/casual, 1=refined/elegant>,
    "connectedness": <how connected/flowing the text is, 0=separated, 1=continuous>,
    "dynamicRange": <visual energy, 0=static/calm, 1=dynamic/energetic>
  }`;

  let prompt: string;
  
  if (scriptType === 'japanese' || scriptType === 'mixed') {
    prompt = `${basePrompt}

This image contains Japanese text (漢字/ひらがな/カタカナ). Analyze both universal and Japanese-specific typography features.

Return a JSON object with these measurements:

{
  "scriptType": "${scriptType}",
  ${latinFields},
  ${japaneseFields}
}

For Japanese typography, pay attention to:
- 払い (harai): sweeping diagonal strokes ending thin
- 止め (tome): strokes that stop firmly
- 跳ね (hane): flicking upward strokes
- The balance between 偏 (left) and 旁 (right) radicals
- Whether it's 明朝体 (Mincho/serif) or ゴシック体 (Gothic/sans-serif)

Be precise. Return ONLY the JSON.`;
  } else {
    prompt = `${basePrompt}

Return a JSON object with these exact measurements (estimate in pixels based on the image):

{
  "scriptType": "latin",
  ${latinFields}
}

Be precise. Measure carefully. Return ONLY the JSON.`;
  }

  try {
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
      const json = part.text.match(/\{[\s\S]*\}/)?.[0];
      if (json) {
        const parsed = JSON.parse(json);
        return validateAndFillDNA(parsed, scriptType);
      }
    }
  } catch (e) {
    console.error('DNA extraction error:', e);
  }

  return getDefaultDNA(scriptType);
}

function validateAndFillDNA(data: Partial<MathematicalDNA>, scriptType: ScriptType = 'latin'): MathematicalDNA {
  const defaults = getDefaultDNA(scriptType);
  
  const result: MathematicalDNA = {
    scriptType: data.scriptType || scriptType,
    metrics: { ...defaults.metrics, ...data.metrics },
    stroke: { ...defaults.stroke, ...data.stroke },
    geometry: { ...defaults.geometry, ...data.geometry },
    terminals: { ...defaults.terminals, ...data.terminals },
    spacing: { ...defaults.spacing, ...data.spacing },
    proportions: { ...defaults.proportions, ...data.proportions },
    features: { ...defaults.features, ...data.features },
  };

  if (scriptType === 'japanese' || scriptType === 'mixed') {
    result.japanese = { ...defaults.japanese, ...data.japanese };
  }

  return result;
}

function getDefaultDNA(scriptType: ScriptType = 'latin'): MathematicalDNA {
  const base: MathematicalDNA = {
    scriptType,
    metrics: {
      imageWidth: 1024,
      imageHeight: 1024,
      capHeight: 200,
      xHeight: 140,
      baseline: 700,
      meanline: 500,
    },
    stroke: {
      thickestPx: 40,
      thinnestPx: 40,
      contrastRatio: 1.0,
      averageWeightPx: 40,
      weightToCapRatio: 0.2,
    },
    geometry: {
      curveRadiusPx: 100,
      curveEccentricity: 0,
      outerCornerRadiusPx: 0,
      innerCornerRadiusPx: 0,
      cornerRadiusRatio: 0,
      inkTrapDepthPx: 0,
      inkTrapAngleDeg: 0,
    },
    terminals: {
      cutAngleDeg: 0,
      roundnessFactor: 0,
      serifLengthPx: 0,
      serifThicknessPx: 0,
    },
    spacing: {
      letterSpacingPx: 20,
      letterSpacingRatio: 0.1,
      wordSpacingPx: 80,
      sideBearingPx: 10,
    },
    proportions: {
      widthToHeightRatio: 0.8,
      xHeightToCapRatio: 0.7,
      counterAreaRatio: 0.3,
      negativeSpaceRatio: 0.5,
    },
    features: {
      hasStencilGaps: false,
      stencilGapWidthPx: 0,
      hasLigatures: false,
      hasTouchingLetters: false,
    },
  };

  if (scriptType === 'japanese' || scriptType === 'mixed') {
    base.japanese = {
      styleCategory: 'gothic' as const,
      strokeComplexity: 10,
      radicalBalance: 0.5,
      haraiFactor: 0.5,
      tomeFactor: 0.5,
      haneFactor: 0.5,
      squareness: 0.5,
      densityCenter: 0.5,
      isMincho: false,
      isGothic: true,
      isHandwritten: false,
      kanaRoundness: 0.5,
      kanaConnectionFluidity: 0.3,
      // Geometric logotype defaults
      isGeometricLogotype: false,
      isModularGrid: false,
      gridUnitPx: 0,
      cornerRadiusPx: 0,
      isMonoline: false,
      hasStencilBreaks: false,
      strokeEndStyle: 'flat' as const,
      counterStyle: 'traditional' as const,
      verticalAlignment: 'baseline' as const,
      horizontalCompression: 1.0,
      // Calligraphic defaults
      isCalligraphic: false,
      brushAngleDeg: 45,
      baselineAngleDeg: 0,
      italicAngleDeg: 0,
      strokeRhythm: 'uniform' as const,
      entryStrokeStyle: 'soft' as const,
      exitStrokeStyle: 'tapered' as const,
      thickThinTransition: 'gradual' as const,
      overallElegance: 0.5,
      connectedness: 0.3,
      dynamicRange: 0.5,
    };
  }

  return base;
}

// === DNA COMPARISON ===
interface DNAComparisonExtended extends DNAComparison {
  // Japanese-specific diffs (only for japanese/mixed)
  japaneseDiffs?: {
    strokeComplexityDiff: number;
    haraiFactor: number;
    tomeFactor: number;
    haneFactor: number;
    squarenessDiff: number;
    styleMatch: boolean;
  };
  // Geometric logotype diffs (only for geometric Japanese logotypes)
  geometricDiffs?: {
    cornerRadiusDiff: number;
    gridMatch: boolean;
    monolineMatch: boolean;
    stencilMatch: boolean;
    strokeEndMatch: boolean;
    counterMatch: boolean;
    compressionDiff: number;
  };
  // Calligraphic diffs (only for calligraphic Japanese logotypes)
  calligraphicDiffs?: {
    brushAngleDiff: number;
    baselineDiff: number;
    italicDiff: number;
    rhythmMatch: boolean;
    entryMatch: boolean;
    exitMatch: boolean;
    eleganceDiff: number;
    connectednessDiff: number;
    dynamicDiff: number;
  };
}

function compareDNA(ref: MathematicalDNA, gen: MathematicalDNA, scriptType: ScriptType = 'latin'): DNAComparisonExtended {
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
  
  const featureMatch = 
    ref.features.hasStencilGaps === gen.features.hasStencilGaps &&
    ref.features.hasLigatures === gen.features.hasLigatures;

  let score = 100;
  
  if (scriptType === 'japanese' || scriptType === 'mixed') {
    // Japanese-weighted scoring
    const refJp = ref.japanese!;
    const genJp = gen.japanese!;
    
    const styleCategory = refJp.styleCategory || 'gothic';
    const isGeometric = styleCategory === 'geometric' || refJp.isGeometricLogotype || refJp.isModularGrid || refJp.isMonoline;
    const isCalligraphic = styleCategory === 'calligraphic' || refJp.isCalligraphic;
    
    if (isGeometric) {
      // Geometric logotype scoring - emphasize structural features
      const cornerRadiusMatch = safeDiff(refJp.cornerRadiusPx, genJp.cornerRadiusPx);
      const gridMatch = refJp.isModularGrid === genJp.isModularGrid;
      const monolineMatch = refJp.isMonoline === genJp.isMonoline;
      const stencilMatch = refJp.hasStencilBreaks === genJp.hasStencilBreaks;
      const strokeEndMatch = refJp.strokeEndStyle === genJp.strokeEndStyle;
      const counterMatch = refJp.counterStyle === genJp.counterStyle;
      const compressionDiff = safeDiff(refJp.horizontalCompression, genJp.horizontalCompression);

      // Geometric weights (total: 100)
      score -= strokeWeightDiff * 20;        // 20% - uniform stroke is critical
      if (!monolineMatch) score -= 15;       // 15% - monoline mismatch
      if (!gridMatch) score -= 12;           // 12% - grid mismatch
      score -= cornerRadiusMatch * 15;       // 15% - corner radius
      if (!counterMatch) score -= 10;        // 10% - counter style
      score -= spacingDiff * 10;             // 10% - spacing
      if (!stencilMatch) score -= 8;         // 8% - stencil breaks
      if (!strokeEndMatch) score -= 5;       // 5% - stroke ends
      score -= compressionDiff * 5;          // 5% - compression

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
        japaneseDiffs: {
          strokeComplexityDiff: 0,
          haraiFactor: 0,
          tomeFactor: 0,
          haneFactor: 0,
          squarenessDiff: safeDiff(refJp.squareness, genJp.squareness),
          styleMatch: gridMatch && monolineMatch,
        },
        geometricDiffs: {
          cornerRadiusDiff: cornerRadiusMatch,
          gridMatch,
          monolineMatch,
          stencilMatch,
          strokeEndMatch,
          counterMatch,
          compressionDiff,
        },
      };
    }
    
    if (isCalligraphic) {
      // Calligraphic scoring - emphasize flow and elegance
      const brushAngleDiff = safeDiff(refJp.brushAngleDeg, genJp.brushAngleDeg);
      const baselineDiff = safeDiff(refJp.baselineAngleDeg, genJp.baselineAngleDeg);
      const italicDiff = safeDiff(refJp.italicAngleDeg, genJp.italicAngleDeg);
      const rhythmMatch = refJp.strokeRhythm === genJp.strokeRhythm;
      const entryMatch = refJp.entryStrokeStyle === genJp.entryStrokeStyle;
      const exitMatch = refJp.exitStrokeStyle === genJp.exitStrokeStyle;
      const eleganceDiff = safeDiff(refJp.overallElegance, genJp.overallElegance);
      const connectednessDiff = safeDiff(refJp.connectedness, genJp.connectedness);
      const dynamicDiff = safeDiff(refJp.dynamicRange, genJp.dynamicRange);

      // Calligraphic weights (total: 100)
      score -= strokeContrastDiff * 18;      // 18% - thick-thin contrast is critical
      score -= brushAngleDiff * 12;          // 12% - brush angle
      score -= baselineDiff * 10;            // 10% - baseline angle
      score -= italicDiff * 8;               // 8% - italic angle
      if (!rhythmMatch) score -= 10;         // 10% - stroke rhythm
      if (!entryMatch) score -= 6;           // 6% - entry stroke
      if (!exitMatch) score -= 8;            // 8% - exit stroke
      score -= eleganceDiff * 10;            // 10% - elegance
      score -= connectednessDiff * 8;        // 8% - connectedness
      score -= dynamicDiff * 5;              // 5% - dynamic range
      score -= spacingDiff * 5;              // 5% - spacing

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
        japaneseDiffs: {
          strokeComplexityDiff: 0,
          haraiFactor: 0,
          tomeFactor: 0,
          haneFactor: 0,
          squarenessDiff: 0,
          styleMatch: rhythmMatch && entryMatch && exitMatch,
        },
        calligraphicDiffs: {
          brushAngleDiff,
          baselineDiff,
          italicDiff,
          rhythmMatch,
          entryMatch,
          exitMatch,
          eleganceDiff,
          connectednessDiff,
          dynamicDiff,
        },
      };
    }
    
    const strokeComplexityDiff = safeDiff(refJp.strokeComplexity, genJp.strokeComplexity);
    const haraiDiff = safeDiff(refJp.haraiFactor, genJp.haraiFactor);
    const tomeDiff = safeDiff(refJp.tomeFactor, genJp.tomeFactor);
    const haneDiff = safeDiff(refJp.haneFactor, genJp.haneFactor);
    const squarenessDiff = safeDiff(refJp.squareness, genJp.squareness);
    const styleMatch = refJp.isMincho === genJp.isMincho && refJp.isGothic === genJp.isGothic;

    // Japanese weights (total: 100)
    score -= strokeWeightDiff * 15;        // 15%
    score -= strokeContrastDiff * 10;      // 10%
    score -= haraiDiff * 12;               // 12% - 払い
    score -= tomeDiff * 12;                // 12% - 止め  
    score -= haneDiff * 10;                // 10% - 跳ね
    score -= squarenessDiff * 10;          // 10%
    score -= spacingDiff * 8;              // 8%
    score -= proportionDiff * 8;           // 8%
    score -= strokeComplexityDiff * 5;     // 5%
    if (!styleMatch) score -= 10;          // 10%

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
      japaneseDiffs: {
        strokeComplexityDiff,
        haraiFactor: haraiDiff,
        tomeFactor: tomeDiff,
        haneFactor: haneDiff,
        squarenessDiff,
        styleMatch,
      },
    };
  }

  // Latin weights
  score -= strokeContrastDiff * 20;  // 20%
  score -= strokeWeightDiff * 15;    // 15%
  score -= curveRadiusDiff * 15;     // 15%
  score -= cornerRadiusDiff * 10;    // 10%
  score -= inkTrapDepthDiff * 10;    // 10%
  score -= spacingDiff * 10;         // 10%
  score -= proportionDiff * 10;      // 10%
  score -= terminalDiff * 5;         // 5%
  if (!featureMatch) score -= 5;     // 5%

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
  scriptType: ScriptType = 'latin',
  referenceDNA?: MathematicalDNA
): Promise<void> {
  const refData = fs.readFileSync(refPath).toString('base64');
  
  let prompt: string;
  
  if (scriptType === 'japanese' || scriptType === 'mixed') {
    const jp = referenceDNA?.japanese;
    const styleCategory = jp?.styleCategory || 'gothic';
    const isGeometric = styleCategory === 'geometric' || jp?.isGeometricLogotype || jp?.isModularGrid || jp?.isMonoline;
    const isCalligraphic = styleCategory === 'calligraphic' || jp?.isCalligraphic;
    
    if (isGeometric) {
      // Special prompt for geometric logotypes
      prompt = `Create "${targetText}" as a GEOMETRIC LOGOTYPE matching the reference image EXACTLY.

CRITICAL STYLE REQUIREMENTS - Copy these precisely from the reference:
${jp?.isModularGrid ? '- MODULAR GRID CONSTRUCTION: Build each character on the same grid system' : ''}
${jp?.isMonoline ? '- UNIFORM STROKE WEIGHT: All strokes must have identical thickness' : ''}
${jp?.cornerRadiusPx && jp.cornerRadiusPx > 0 ? `- ROUNDED CORNERS: All corners must have ${jp.cornerRadiusPx}px radius` : '- SHARP CORNERS: No rounded corners'}
${jp?.hasStencilBreaks ? '- STENCIL BREAKS: Include intentional gaps at stroke intersections' : ''}
- STROKE END STYLE: ${jp?.strokeEndStyle || 'flat'}
- COUNTER SHAPES: ${jp?.counterStyle || 'geometric'} (must match reference exactly)
${jp?.horizontalCompression !== 1 ? `- CHARACTER WIDTH: ${jp?.horizontalCompression && jp.horizontalCompression < 1 ? 'Compressed' : 'Extended'} proportions` : ''}

This is a MODERN GEOMETRIC Japanese logotype. Do NOT use traditional calligraphic strokes.
Do NOT add 払い, 跳ね, or brush-like characteristics unless the reference has them.

White background, black text only, centered.
MATCH THE REFERENCE STYLE WITH 100% PRECISION.`;
    } else if (isCalligraphic) {
      // Special prompt for calligraphic/brush styles
      prompt = `Create "${targetText}" as an ELEGANT CALLIGRAPHIC LOGOTYPE matching the reference image EXACTLY.

This is a refined Japanese calligraphic/brush style (カリグラフィック書体). 

CRITICAL CALLIGRAPHIC REQUIREMENTS - Copy these PRECISELY:
- BRUSH ANGLE: ${jp?.brushAngleDeg || 45}° (the angle of the imaginary brush)
- BASELINE ANGLE: ${jp?.baselineAngleDeg || 0}° (${jp?.baselineAngleDeg && jp.baselineAngleDeg < 0 ? 'descending' : jp?.baselineAngleDeg && jp.baselineAngleDeg > 0 ? 'ascending' : 'horizontal'} baseline)
- ITALIC SLANT: ${jp?.italicAngleDeg || 0}° (${jp?.italicAngleDeg && jp.italicAngleDeg > 5 ? 'italic/slanted' : 'upright'})
- STROKE RHYTHM: ${jp?.strokeRhythm || 'flowing'} (${jp?.strokeRhythm === 'dramatic' ? 'bold dramatic strokes' : jp?.strokeRhythm === 'flowing' ? 'smooth flowing motion' : 'consistent rhythm'})
- ENTRY STROKES: ${jp?.entryStrokeStyle || 'hairline'} (how strokes begin)
- EXIT STROKES: ${jp?.exitStrokeStyle || 'tapered'} (how strokes end - ${jp?.exitStrokeStyle === 'flourish' ? 'with elegant flourishes' : jp?.exitStrokeStyle === 'tapered' ? 'tapering to thin' : 'cleanly'})
- THICK-THIN TRANSITION: ${jp?.thickThinTransition || 'smooth'} contrast changes
- ELEGANCE LEVEL: ${((jp?.overallElegance || 0.8) * 100).toFixed(0)}% refined
- CONNECTEDNESS: ${((jp?.connectedness || 0.5) * 100).toFixed(0)}% flowing between characters
- DYNAMIC RANGE: ${((jp?.dynamicRange || 0.7) * 100).toFixed(0)}% visual energy

CRITICAL: This is NOT a standard font. It's an artistic calligraphic logotype.
- Match the exact THICK-THIN CONTRAST of the reference
- Match the exact STROKE ANGLES and FLOW
- Match the exact BASELINE DYNAMICS
- Preserve the ELEGANT, REFINED aesthetic

White background, black text only, centered.
MATCH THE REFERENCE STYLE WITH 100% PRECISION.`;
    } else {
      // Standard Japanese typography prompt
      prompt = `Create "${targetText}" in the EXACT SAME typeface style as the reference image.

This is Japanese/日本語 text. Match precisely:
- Stroke weight (線の太さ) and contrast ratio: ${referenceDNA?.stroke.contrastRatio?.toFixed(1) || 'match reference'}:1
- 払い (harai/sweeping strokes): ${jp?.haraiFactor?.toFixed(2) || 'match reference'}
- 止め (tome/stopping strokes): ${jp?.tomeFactor?.toFixed(2) || 'match reference'}
- 跳ね (hane/flicking strokes): ${jp?.haneFactor?.toFixed(2) || 'match reference'}
- Character proportions (字形のバランス)
- Spacing between characters
- Overall style: ${jp?.isMincho ? '明朝体' : jp?.isGothic ? 'ゴシック体' : 'match reference'}

White background, black text, centered.
Preserve the exact typographic style of the reference.`;
    }
  } else {
    prompt = `Create "${targetText}" in the EXACT SAME typeface style as the reference image. 
Match precisely:
- Stroke weight and contrast
- Corner radius and geometry
- Letter spacing and proportions
- Terminal style
White background, black text, centered.`;
  }

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
      imageConfig: {
        aspectRatio: '1:1',
        imageSize: '2K'
      }
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
