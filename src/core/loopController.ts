/**
 * Loop Controller - Simplified
 * 
 * シンプルなループ：生成 → 評価 → スコアが低ければリトライ
 * DNAフィードバックは廃止
 */

import { analyzeDNA, formatDNASummary } from '../agents/dnaAnalyzer.js';
import { generateDirectPrompt } from '../agents/promptEngineer.js';
import { generateIterationImage, buildReferencePrompt } from './imageGenerator.js';
import { 
  evaluateConsistency, 
  formatEvaluationReport,
  quickQualityCheck
} from '../agents/qualityCritic.js';
import {
  createSessionDirectory,
  getFinalImagePath,
  copyFile,
  saveSessionResult,
  saveDNAResult,
  saveIterationDetails,
  createSessionLogger
} from '../utils/fileManager.js';
import {
  type UniversalGeometricDNA,
  type StrategyType,
  type ForgeSessionResult,
  type IterationResult,
  type FeedbackLoopResult,
  createDefaultDNA,
  createDefaultEvaluationBreakdown
} from '../types/geometricDNA.js';

export interface ForgeConfig {
  maxIterations: number;
  convergenceThreshold: number;
  skipQualityCheck: boolean;
  imageOptions?: {
    aspectRatio?: '1:1' | '16:9' | '9:16';
    imageSize?: '1K' | '2K' | '4K';
  };
}

const DEFAULT_CONFIG: ForgeConfig = {
  maxIterations: 5,
  convergenceThreshold: 85,
  skipQualityCheck: true,
  imageOptions: { aspectRatio: '1:1', imageSize: '4K' }
};

/**
 * メインの生成プロセス
 */
export async function runForgingProcess(
  referenceImagePath: string,
  targetString: string,
  strategy: StrategyType,
  config: Partial<ForgeConfig> = {}
): Promise<ForgeSessionResult> {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const startTime = Date.now();
  const sessionPaths = createSessionDirectory(targetString, strategy);
  const logger = createSessionLogger(sessionPaths);

  logger.info(`🔨 Typo-Forge: "${targetString}"`);
  logger.info(`   Reference: ${referenceImagePath}`);

  // DNA分析（情報用のみ）
  let dna: UniversalGeometricDNA;
  try {
    dna = await analyzeDNA(referenceImagePath);
    logger.info(formatDNASummary(dna));
    saveDNAResult(sessionPaths, dna);
  } catch {
    dna = createDefaultDNA();
    logger.warn('DNA analysis skipped');
  }

  const iterations: IterationResult[] = [];
  let bestScore = 0;
  let bestIteration = 0;

  // シンプルなループ
  for (let iteration = 1; iteration <= cfg.maxIterations; iteration++) {
    logger.info(`\n🔄 Iteration ${iteration}/${cfg.maxIterations}`);
    const iterStart = Date.now();

    // プロンプト生成（最小限）
    const prompt = buildReferencePrompt(targetString, '');

    // 画像生成
    let generationResult;
    try {
      generationResult = await generateIterationImage(
        prompt,
        sessionPaths,
        iteration,
        referenceImagePath,
        cfg.imageOptions
      );
      logger.info(`✅ Generated: ${generationResult.imagePath}`);
    } catch (error) {
      logger.error(`Generation failed: ${error}`);
      continue;
    }

    // 評価（スコアのみ）
    let evaluation: FeedbackLoopResult;
    try {
      evaluation = await evaluateConsistency(
        referenceImagePath,
        generationResult.imagePath,
        iteration,
        dna
      );
    } catch (error) {
      logger.error(`Evaluation failed: ${error}`);
      evaluation = {
        score: 0,
        breakdown: createDefaultEvaluationBreakdown(),
        issues: [],
        critique: `Error: ${error}`,
        adjustmentDirectives: [],
        isConverged: false,
        iteration,
        timestamp: new Date()
      };
    }

    logger.info(`📊 Score: ${evaluation.score}/100`);
    console.log(formatEvaluationReport(evaluation));

    // ベスト更新
    if (evaluation.score > bestScore) {
      bestScore = evaluation.score;
      bestIteration = iteration;
    }

    // 記録
    const iterResult: IterationResult = {
      iteration,
      prompt,
      outputPath: generationResult.imagePath,
      evaluation,
      dnaAdjustments: {},
      durationMs: Date.now() - iterStart
    };
    iterations.push(iterResult);
    saveIterationDetails(sessionPaths, iteration, iterResult);

    // 収束チェック
    if (evaluation.score >= cfg.convergenceThreshold) {
      logger.info(`✅ Converged at iteration ${iteration}`);
      break;
    }
  }

  // 最終出力
  const finalOutputPath = getFinalImagePath(sessionPaths, targetString);
  if (iterations.length > 0 && bestIteration > 0) {
    copyFile(iterations[bestIteration - 1].outputPath, finalOutputPath);
  }

  const result: ForgeSessionResult = {
    referenceImagePath,
    targetString,
    strategy,
    extractedDNA: dna,
    iterations,
    finalOutputPath,
    finalScore: bestScore,
    totalIterations: iterations.length,
    converged: bestScore >= cfg.convergenceThreshold,
    durationMs: Date.now() - startTime
  };

  saveSessionResult(sessionPaths, result);
  
  logger.info(`\n🏁 Done. Best: ${bestScore}/100 (iteration ${bestIteration})`);
  logger.info(`   Output: ${finalOutputPath}`);

  return result;
}

/**
 * クイック生成（1回のみ）
 */
export async function quickForge(
  referenceImagePath: string,
  targetString: string,
  strategy: StrategyType = 'structural'
): Promise<{ outputPath: string; dna: UniversalGeometricDNA; prompt: string }> {
  const sessionPaths = createSessionDirectory(targetString, `quick_${strategy}`);
  
  const dna = await analyzeDNA(referenceImagePath);
  const prompt = buildReferencePrompt(targetString, '');
  
  const result = await generateIterationImage(prompt, sessionPaths, 1, referenceImagePath);
  const finalPath = getFinalImagePath(sessionPaths, targetString);
  copyFile(result.imagePath, finalPath);

  return { outputPath: finalPath, dna, prompt };
}

export async function analyzeOnly(referenceImagePath: string): Promise<UniversalGeometricDNA> {
  const dna = await analyzeDNA(referenceImagePath);
  console.log(formatDNASummary(dna));
  return dna;
}

export async function runParallelStrategies(
  referenceImagePath: string,
  targetString: string,
  strategies: StrategyType[] = ['structural'],
  config: Partial<ForgeConfig> = {}
): Promise<{ bestResult: ForgeSessionResult; allResults: Record<StrategyType, ForgeSessionResult> }> {
  const results = await Promise.all(
    strategies.map(s => runForgingProcess(referenceImagePath, targetString, s, config).catch(() => null))
  );

  const allResults: Partial<Record<StrategyType, ForgeSessionResult>> = {};
  let bestResult: ForgeSessionResult | null = null;

  strategies.forEach((s, i) => {
    const r = results[i];
    if (r) {
      allResults[s] = r;
      if (!bestResult || r.finalScore > bestResult.finalScore) bestResult = r;
    }
  });

  if (!bestResult) throw new Error('All strategies failed');

  return { bestResult, allResults: allResults as Record<StrategyType, ForgeSessionResult> };
}
