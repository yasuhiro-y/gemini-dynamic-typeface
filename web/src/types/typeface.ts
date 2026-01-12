import { BaseSessionState, BaseIterationResult } from './common';

// スクリプトタイプ
export type ScriptType = 'latin' | 'japanese' | 'mixed';

// 数学的DNA - タイプフェイスの特徴を数値化
export interface MathematicalDNA {
  scriptType: ScriptType;
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
  japanese?: JapaneseDNA;
}

// 日本語特有のDNA
export interface JapaneseDNA {
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
  // Geometric logotype features
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
  // Calligraphic features
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
}

// DNA比較結果
export interface DNAComparison {
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
  japaneseDiffs?: {
    strokeComplexityDiff: number;
    haraiFactor: number;
    tomeFactor: number;
    haneFactor: number;
    squarenessDiff: number;
    styleMatch: boolean;
  };
  geometricDiffs?: {
    cornerRadiusDiff: number;
    gridMatch: boolean;
    monolineMatch: boolean;
    stencilMatch: boolean;
    strokeEndMatch: boolean;
    counterMatch: boolean;
    compressionDiff: number;
  };
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

// Typeface イテレーション結果
export interface TypefaceIterationResult extends BaseIterationResult {
  comparison?: DNAComparison;
  generatedDNA?: MathematicalDNA;
}

// Typeface セッション状態
export interface TypefaceSessionState extends BaseSessionState {
  iterations: TypefaceIterationResult[];
  referenceDNA?: MathematicalDNA;
  scriptType?: ScriptType;
}
