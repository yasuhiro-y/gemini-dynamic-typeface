/**
 * Prompt Engineer - Minimal
 * 
 * DNA情報は使わない。画像が主役。
 */

import { 
  type UniversalGeometricDNA,
  type StrategyType
} from '../types/geometricDNA.js';

export async function generatePrompt(
  targetString: string,
  _dna: UniversalGeometricDNA,
  _strategy: StrategyType,
  _previousFeedback?: string[]
): Promise<string> {
  return generateDirectPrompt(targetString, _dna, _strategy);
}

export function generateDirectPrompt(
  targetString: string,
  _dna: UniversalGeometricDNA,
  _strategy: StrategyType,
  _previousFeedback?: string[]
): string {
  return `Create "${targetString}" in the exact same typeface as the reference image. White background, black text.`;
}

export async function generatePromptVariations(
  targetString: string,
  dna: UniversalGeometricDNA,
  strategies: StrategyType[] = ['structural']
): Promise<Record<StrategyType, string>> {
  const results: Record<StrategyType, string> = {} as Record<StrategyType, string>;
  for (const s of strategies) {
    results[s] = generateDirectPrompt(targetString, dna, s);
  }
  return results;
}

export function generateGlyphDerivationRules(): string[] {
  return [];
}
