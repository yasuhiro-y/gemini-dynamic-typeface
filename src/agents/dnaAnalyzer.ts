/**
 * DNA Analyzer - Optional/Informational
 * 
 * 生成には使わない。ログ・分析用。
 */

import { getGeminiClient } from '../utils/geminiClient.js';
import { 
  type UniversalGeometricDNA,
  createDefaultDNA
} from '../types/geometricDNA.js';

/**
 * リファレンス画像の特徴を分析（情報用）
 */
export async function analyzeDNA(imagePath: string): Promise<UniversalGeometricDNA> {
  const client = getGeminiClient();
  
  const prompt = `Analyze this typeface/logo. Return JSON with:
{
  "stroke": { "weight": 0-1, "contrast": 0-1 },
  "terminals": { "style": "flat/rounded/pointed" },
  "curves": { "shape": "circular/elliptical/rectangular" },
  "concept": { "style": "geometric/humanist/industrial", "features": ["feature1", "feature2"] }
}`;

  try {
    const result = await client.analyzeImage(imagePath, prompt);
    const json = result.text.match(/\{[\s\S]*\}/)?.[0];
    if (json) {
      const parsed = JSON.parse(json);
      return mergeWithDefaults(parsed);
    }
  } catch {
    // Analysis failed, return defaults
  }
  
  return createDefaultDNA();
}

function mergeWithDefaults(partial: Partial<UniversalGeometricDNA>): UniversalGeometricDNA {
  const defaults = createDefaultDNA();
  return {
    ...defaults,
    stroke: { ...defaults.stroke, ...partial.stroke },
    terminals: { ...defaults.terminals, ...partial.terminals },
    curves: { ...defaults.curves, ...partial.curves },
    concept: { 
      ...defaults.concept, 
      ...partial.concept,
      distinctiveFeatures: partial.concept?.distinctiveFeatures ?? []
    }
  };
}

export function formatDNASummary(dna: UniversalGeometricDNA): string {
  return `DNA: weight=${(dna.stroke.weight * 100).toFixed(0)}% contrast=${(dna.stroke.contrast * 100).toFixed(0)}% style=${dna.concept.constructionPhilosophy}`;
}
