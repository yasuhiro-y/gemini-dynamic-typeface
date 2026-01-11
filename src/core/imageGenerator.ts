/**
 * Image Generator - Minimal
 * 
 * 画像が主役。テキストは最小限。
 */

import { getGeminiClient, type ImageGenerationConfig } from '../utils/geminiClient.js';
import { type SessionPaths, getIterationImagePath } from '../utils/fileManager.js';

export interface GenerationOptions {
  aspectRatio?: ImageGenerationConfig['aspectRatio'];
  imageSize?: ImageGenerationConfig['imageSize'];
}

export interface GenerationResult {
  imagePath: string;
  modelResponse?: string;
  durationMs: number;
}

export async function generateLogo(
  prompt: string,
  outputPath: string,
  referenceImagePath?: string,
  options: GenerationOptions = {}
): Promise<GenerationResult> {
  const client = getGeminiClient();
  const startTime = Date.now();

  const config: ImageGenerationConfig = {
    aspectRatio: options.aspectRatio ?? '1:1',
    imageSize: options.imageSize ?? '4K'
  };

  const result = referenceImagePath
    ? await client.generateImageWithReference(prompt, referenceImagePath, outputPath, config)
    : await client.generateImage(prompt, outputPath, config);

  return {
    imagePath: result.imagePath,
    modelResponse: result.text,
    durationMs: Date.now() - startTime
  };
}

export async function generateIterationImage(
  prompt: string,
  sessionPaths: SessionPaths,
  iteration: number,
  referenceImagePath: string,
  options: GenerationOptions = {}
): Promise<GenerationResult> {
  const outputPath = getIterationImagePath(sessionPaths, iteration);
  return generateLogo(prompt, outputPath, referenceImagePath, options);
}

/**
 * 最小限のプロンプト
 */
export function buildReferencePrompt(targetString: string, _unused: string): string {
  return `Create "${targetString}" in the exact same typeface/style as the reference image. White background, black text.`;
}

export function buildRefinementPrompt(targetString: string, _unused: string, _feedback: string[]): string {
  // フィードバックは使わない。単純にリトライ。
  return `Create "${targetString}" matching the reference image style exactly. White background, black text.`;
}
