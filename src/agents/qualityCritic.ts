/**
 * Quality Critic - 数値ベース評価
 * 
 * 特徴を数値で抽出し、数学的に比較する
 */

import { 
  extractFeatures, 
  compareFeatures, 
  formatFeatureDiff,
  type MeasurableFeatures,
  type FeatureDiff
} from './featureExtractor.js';
import { 
  type FeedbackLoopResult,
  type UniversalGeometricDNA,
  type EvaluationBreakdown,
  createDefaultEvaluationBreakdown
} from '../types/geometricDNA.js';

const CONVERGENCE_THRESHOLD = 85;

// キャッシュ（同じリファレンスを何度も解析しない）
let cachedReferenceFeatures: MeasurableFeatures | null = null;
let cachedReferencePath: string = '';

/**
 * 数値ベースの一貫性評価
 */
export async function evaluateConsistency(
  referenceImagePath: string,
  generatedImagePath: string,
  iteration: number,
  _dna?: UniversalGeometricDNA
): Promise<FeedbackLoopResult> {
  
  // リファレンスの特徴を取得（キャッシュ利用）
  let refFeatures: MeasurableFeatures;
  if (cachedReferencePath === referenceImagePath && cachedReferenceFeatures) {
    refFeatures = cachedReferenceFeatures;
  } else {
    console.log('📏 Extracting reference features...');
    refFeatures = await extractFeatures(referenceImagePath);
    cachedReferenceFeatures = refFeatures;
    cachedReferencePath = referenceImagePath;
  }
  
  // 生成画像の特徴を取得
  console.log('📏 Extracting generated features...');
  const genFeatures = await extractFeatures(generatedImagePath);
  
  // 数値比較
  const diff = compareFeatures(refFeatures, genFeatures);
  
  // 結果表示
  console.log(formatFeatureDiff(refFeatures, genFeatures, diff));
  
  // FeedbackLoopResult形式で返す
  return {
    score: diff.overallScore,
    breakdown: featureDiffToBreakdown(diff),
    issues: generateIssuesFromDiff(diff, refFeatures, genFeatures),
    critique: generateCritique(diff),
    adjustmentDirectives: [], // 数値フィードバックは使わない
    isConverged: diff.overallScore >= CONVERGENCE_THRESHOLD,
    iteration,
    timestamp: new Date()
  };
}

/**
 * 差分をbreakdown形式に変換
 */
function featureDiffToBreakdown(diff: FeatureDiff) {
  // 各カテゴリのスコアを逆算
  const base = createDefaultEvaluationBreakdown();
  
  // ステンシル不一致なら致命的
  const stencilPenalty = diff.stencilMatch ? 0 : 20;
  
  return {
    proportionMatch: Math.round(15 * (1 - diff.strokeWeightDiff)),
    strokeMatch: Math.round(15 * (1 - diff.contrastDiff)),
    terminalMatch: Math.round(15 * (1 - diff.shapeDiff)),
    jointMatch: diff.stencilMatch ? 10 : 0,
    curveMatch: Math.round(10 * (1 - diff.shapeDiff)),
    glyphMatch: base.glyphMatch,
    rhythmMatch: Math.round(10 * (1 - diff.kerningDiff)),
    conceptMatch: Math.max(0, 15 - stencilPenalty)
  };
}

/**
 * 数値差分から問題点リストを生成
 */
function generateIssuesFromDiff(
  diff: FeatureDiff,
  ref: MeasurableFeatures,
  gen: MeasurableFeatures
): Array<{ category: keyof EvaluationBreakdown; description: string; severity: 'critical' | 'major' | 'minor' }> {
  const issues: Array<{ category: keyof EvaluationBreakdown; description: string; severity: 'critical' | 'major' | 'minor' }> = [];
  
  if (!diff.stencilMatch) {
    issues.push({
      category: 'jointMatch' as keyof EvaluationBreakdown,
      description: `Stencil: Ref=${ref.hasStencilGaps ? 'Yes' : 'No'}, Gen=${gen.hasStencilGaps ? 'Yes' : 'No'}`,
      severity: 'critical'
    });
  }
  
  if (diff.contrastDiff > 0.3) {
    issues.push({
      category: 'strokeMatch' as keyof EvaluationBreakdown,
      description: `Contrast: Ref=${ref.contrastRatio.toFixed(1)}:1, Gen=${gen.contrastRatio.toFixed(1)}:1 (${(diff.contrastDiff * 100).toFixed(0)}% off)`,
      severity: diff.contrastDiff > 0.5 ? 'major' : 'minor'
    });
  }
  
  if (diff.kerningDiff > 0.3) {
    issues.push({
      category: 'rhythmMatch' as keyof EvaluationBreakdown,
      description: `Kerning: Ref=${ref.kerningAvgPx.toFixed(0)}px, Gen=${gen.kerningAvgPx.toFixed(0)}px (${(diff.kerningDiff * 100).toFixed(0)}% off)`,
      severity: diff.kerningDiff > 0.5 ? 'major' : 'minor'
    });
  }
  
  if (diff.strokeWeightDiff > 0.3) {
    issues.push({
      category: 'proportionMatch' as keyof EvaluationBreakdown,
      description: `Stroke: Ref=${ref.strokeThickPx.toFixed(0)}px, Gen=${gen.strokeThickPx.toFixed(0)}px (${(diff.strokeWeightDiff * 100).toFixed(0)}% off)`,
      severity: diff.strokeWeightDiff > 0.5 ? 'major' : 'minor'
    });
  }
  
  return issues;
}

/**
 * 数値差分からシンプルな批評を生成
 */
function generateCritique(diff: FeatureDiff): string {
  if (diff.overallScore >= 85) {
    return 'Good match. Minor adjustments may improve consistency.';
  } else if (diff.overallScore >= 60) {
    return 'Moderate match. Key features differ.';
  } else if (diff.overallScore >= 40) {
    return 'Poor match. Significant differences in style.';
  } else {
    return 'Very poor match. Style is fundamentally different.';
  }
}

export async function quickQualityCheck(
  generatedImagePath: string
): Promise<{ passed: boolean; issues: string[] }> {
  // シンプルなパスチェック（常にパス）
  return { passed: true, issues: [] };
}

export function formatEvaluationReport(evaluation: FeedbackLoopResult): string {
  const bar = (score: number) => {
    const filled = Math.round((score / 100) * 20);
    return '█'.repeat(Math.max(0, Math.min(20, filled))) + '░'.repeat(Math.max(0, 20 - filled));
  };

  const lines = [
    `Score: ${evaluation.score}/100 ${evaluation.isConverged ? '✓ CONVERGED' : ''}`,
    bar(evaluation.score),
    evaluation.critique
  ];
  
  if (evaluation.issues.length > 0) {
    lines.push('Issues:');
    for (const issue of evaluation.issues) {
      const icon = issue.severity === 'critical' ? '🔴' : issue.severity === 'major' ? '🟡' : '🟢';
      lines.push(`  ${icon} ${issue.description}`);
    }
  }
  
  return lines.join('\n');
}

export async function interpretFeedbackAsDNAChanges(
  _currentDNA: UniversalGeometricDNA,
  _adjustmentDirectives: string[]
): Promise<Partial<UniversalGeometricDNA>> {
  return {};
}
