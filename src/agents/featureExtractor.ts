/**
 * Feature Extractor - 数値ベースの特徴抽出
 * 
 * 画像から測定可能な数値を抽出し、比較可能にする
 */

import { getGeminiClient } from '../utils/geminiClient.js';

/**
 * 測定可能な数値特徴
 */
export interface MeasurableFeatures {
  // ストローク
  strokeThickPx: number;      // 太い部分のピクセル幅
  strokeThinPx: number;       // 細い部分のピクセル幅
  contrastRatio: number;      // thick/thin 比率
  
  // 寸法
  xHeightPx: number;          // x-height（小文字の高さ）
  capHeightPx: number;        // 大文字の高さ（あれば）
  letterWidthAvgPx: number;   // 文字幅の平均
  
  // スペーシング
  kerningAvgPx: number;       // 文字間隔の平均
  kerningMinPx: number;       // 最小文字間隔
  kerningMaxPx: number;       // 最大文字間隔
  
  // 形状
  terminalAngleDeg: number;   // 端点のカット角度（0=垂直、45=斜め）
  curveSquareness: number;    // 曲線の角張り度（0=円、1=四角）
  
  // 接合
  hasStencilGaps: boolean;    // ステンシル（隙間）があるか
  gapSizePx: number;          // 隙間のサイズ
  
  // 全体
  totalWidthPx: number;       // ロゴ全体の幅
  totalHeightPx: number;      // ロゴ全体の高さ
}

/**
 * 2つの特徴セットの差分スコア
 */
export interface FeatureDiff {
  contrastDiff: number;       // コントラスト比の差（0が完璧）
  kerningDiff: number;        // カーニング差（%）
  strokeWeightDiff: number;   // ストローク太さの差（%）
  shapeDiff: number;          // 形状の差
  stencilMatch: boolean;      // ステンシル一致
  overallScore: number;       // 総合スコア（0-100）
}

/**
 * 画像から数値特徴を抽出
 */
export async function extractFeatures(imagePath: string): Promise<MeasurableFeatures> {
  const client = getGeminiClient();
  
  const prompt = `この画像のタイポグラフィを数値で測定してください。

以下のJSON形式で、ピクセル単位または比率で回答してください：

{
  "strokeThickPx": <縦線など太い部分の幅（ピクセル推定）>,
  "strokeThinPx": <横線など細い部分の幅（ピクセル推定）>,
  "contrastRatio": <太い部分÷細い部分の比率、例: 5.0>,
  "xHeightPx": <小文字の高さ（ピクセル推定）>,
  "capHeightPx": <大文字の高さ（あれば）>,
  "letterWidthAvgPx": <1文字の平均幅>,
  "kerningAvgPx": <文字間の平均距離（ピクセル）>,
  "kerningMinPx": <最も狭い文字間隔>,
  "kerningMaxPx": <最も広い文字間隔>,
  "terminalAngleDeg": <端点の角度、0=垂直カット、45=斜めカット>,
  "curveSquareness": <曲線の角張り度、0.0=完全な円、1.0=四角>,
  "hasStencilGaps": <曲線とステムの接合部に隙間があるか true/false>,
  "gapSizePx": <隙間があればそのサイズ、なければ0>,
  "totalWidthPx": <ロゴ全体の幅>,
  "totalHeightPx": <ロゴ全体の高さ>
}

数値は推定で構いません。重要なのは相対的な比率です。`;

  const result = await client.analyzeImage(imagePath, prompt);
  
  try {
    const json = result.text.match(/\{[\s\S]*\}/)?.[0];
    if (json) {
      const parsed = JSON.parse(json);
      return normalizeFeatures(parsed);
    }
  } catch (e) {
    console.warn('Feature extraction parse error:', e);
  }
  
  return getDefaultFeatures();
}

/**
 * 2つの特徴セットを比較してスコア算出
 */
export function compareFeatures(
  reference: MeasurableFeatures,
  generated: MeasurableFeatures
): FeatureDiff {
  // コントラスト比の差（重要度: 高）
  const contrastDiff = Math.abs(reference.contrastRatio - generated.contrastRatio) / reference.contrastRatio;
  
  // カーニングの差（重要度: 高）
  const kerningDiff = Math.abs(reference.kerningAvgPx - generated.kerningAvgPx) / Math.max(reference.kerningAvgPx, 1);
  
  // ストローク太さの差
  const strokeWeightDiff = Math.abs(reference.strokeThickPx - generated.strokeThickPx) / Math.max(reference.strokeThickPx, 1);
  
  // 形状の差（端点角度 + 曲線の角張り）
  const terminalDiff = Math.abs(reference.terminalAngleDeg - generated.terminalAngleDeg) / 90;
  const curveDiff = Math.abs(reference.curveSquareness - generated.curveSquareness);
  const shapeDiff = (terminalDiff + curveDiff) / 2;
  
  // ステンシル一致（重要度: 致命的）
  const stencilMatch = reference.hasStencilGaps === generated.hasStencilGaps;
  
  // 総合スコア計算
  let score = 100;
  
  // ステンシル不一致は致命的（-40点）
  if (!stencilMatch) score -= 40;
  
  // コントラスト差（最大-20点）
  score -= Math.min(contrastDiff * 100, 20);
  
  // カーニング差（最大-15点）
  score -= Math.min(kerningDiff * 100, 15);
  
  // ストローク差（最大-15点）
  score -= Math.min(strokeWeightDiff * 100, 15);
  
  // 形状差（最大-10点）
  score -= Math.min(shapeDiff * 50, 10);
  
  return {
    contrastDiff,
    kerningDiff,
    strokeWeightDiff,
    shapeDiff,
    stencilMatch,
    overallScore: Math.max(0, Math.round(score))
  };
}

/**
 * 差分を人間が読める形式でフォーマット
 */
export function formatFeatureDiff(
  ref: MeasurableFeatures,
  gen: MeasurableFeatures,
  diff: FeatureDiff
): string {
  const lines: string[] = [
    '┌─────────────────────────────────────────────────┐',
    '│           FEATURE COMPARISON                    │',
    '├─────────────────────────────────────────────────┤',
    `│  Score: ${String(diff.overallScore).padStart(3)}/100                              │`,
    '├─────────────────────────────────────────────────┤',
    `│  Contrast Ratio                                 │`,
    `│    Ref: ${ref.contrastRatio.toFixed(1)}:1  Gen: ${gen.contrastRatio.toFixed(1)}:1  Diff: ${(diff.contrastDiff * 100).toFixed(0)}%     │`,
    `│  Kerning (avg px)                               │`,
    `│    Ref: ${ref.kerningAvgPx.toFixed(0)}px  Gen: ${gen.kerningAvgPx.toFixed(0)}px  Diff: ${(diff.kerningDiff * 100).toFixed(0)}%      │`,
    `│  Stroke Weight                                  │`,
    `│    Ref: ${ref.strokeThickPx.toFixed(0)}px  Gen: ${gen.strokeThickPx.toFixed(0)}px  Diff: ${(diff.strokeWeightDiff * 100).toFixed(0)}%      │`,
    `│  Stencil Gaps                                   │`,
    `│    Ref: ${ref.hasStencilGaps ? 'Yes' : 'No'}  Gen: ${gen.hasStencilGaps ? 'Yes' : 'No'}  ${diff.stencilMatch ? '✓ Match' : '✗ MISMATCH'}  │`,
    '└─────────────────────────────────────────────────┘'
  ];
  
  return lines.join('\n');
}

function normalizeFeatures(raw: Partial<MeasurableFeatures>): MeasurableFeatures {
  const defaults = getDefaultFeatures();
  return {
    strokeThickPx: raw.strokeThickPx ?? defaults.strokeThickPx,
    strokeThinPx: raw.strokeThinPx ?? defaults.strokeThinPx,
    contrastRatio: raw.contrastRatio ?? defaults.contrastRatio,
    xHeightPx: raw.xHeightPx ?? defaults.xHeightPx,
    capHeightPx: raw.capHeightPx ?? defaults.capHeightPx,
    letterWidthAvgPx: raw.letterWidthAvgPx ?? defaults.letterWidthAvgPx,
    kerningAvgPx: raw.kerningAvgPx ?? defaults.kerningAvgPx,
    kerningMinPx: raw.kerningMinPx ?? defaults.kerningMinPx,
    kerningMaxPx: raw.kerningMaxPx ?? defaults.kerningMaxPx,
    terminalAngleDeg: raw.terminalAngleDeg ?? defaults.terminalAngleDeg,
    curveSquareness: raw.curveSquareness ?? defaults.curveSquareness,
    hasStencilGaps: raw.hasStencilGaps ?? defaults.hasStencilGaps,
    gapSizePx: raw.gapSizePx ?? defaults.gapSizePx,
    totalWidthPx: raw.totalWidthPx ?? defaults.totalWidthPx,
    totalHeightPx: raw.totalHeightPx ?? defaults.totalHeightPx
  };
}

function getDefaultFeatures(): MeasurableFeatures {
  return {
    strokeThickPx: 50,
    strokeThinPx: 10,
    contrastRatio: 5.0,
    xHeightPx: 200,
    capHeightPx: 280,
    letterWidthAvgPx: 150,
    kerningAvgPx: 20,
    kerningMinPx: 10,
    kerningMaxPx: 30,
    terminalAngleDeg: 0,
    curveSquareness: 0.5,
    hasStencilGaps: false,
    gapSizePx: 0,
    totalWidthPx: 800,
    totalHeightPx: 300
  };
}
