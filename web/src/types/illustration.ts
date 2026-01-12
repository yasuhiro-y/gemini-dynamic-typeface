import { BaseSessionState, BaseIterationResult } from './common';

// イラストレーションモード
export type IllustrationMode = 'transform' | 'extend';

// 色温度
export type ColorTemperature = 'warm' | 'cool' | 'neutral';

// 彩度スタイル
export type SaturationStyle = 'vivid' | 'muted' | 'pastel' | 'monochrome';

// 線の太さ
export type LineWeight = 'thin' | 'medium' | 'thick' | 'varied';

// 輪郭スタイル
export type OutlineStyle = 'clean' | 'rough' | 'none';

// 形状タイプ
export type ShapeType = 'geometric' | 'organic' | 'mixed';

// 複雑度
export type ComplexityLevel = 'simple' | 'moderate' | 'detailed';

// 対象タイプ
export type SubjectType = 'character' | 'object' | 'abstract' | 'scene';

// カラーパレット
export interface ColorPalette {
  primary: string;           // 主要色 (hex)
  secondary: string[];       // サブカラー (hex)
  accent: string;           // アクセント色 (hex)
  temperature: ColorTemperature;
  saturation: SaturationStyle;
  contrast: number;         // 0-1 明暗差
}

// 線のスタイル
export interface LineStyle {
  weight: LineWeight;
  outline: OutlineStyle;
  consistency: number;      // 0-1 線の均一性
}

// 形状スタイル
export interface ShapeStyle {
  type: ShapeType;
  roundness: number;        // 0-1 角の丸さ
  complexity: ComplexityLevel;
}

// イラストレーションDNA
export interface IllustrationDNA {
  colorPalette: ColorPalette;
  lineStyle: LineStyle;
  shapeStyle: ShapeStyle;
  subjectType: SubjectType;
  overallVibe: string[];    // ['playful', 'minimal', 'retro'] など
  detectedSubject?: string; // 検出されたモチーフ
}

// カラーバリエーション
export interface ColorVariation {
  id: string;
  name: string;
  description: string;
  palette: ColorPalette;
  imageUrl?: string;
  status: 'pending' | 'generating' | 'complete' | 'error';
}

// カラーバリエーションタイプ
export type ColorVariationType = 
  | 'original'      // オリジナル
  | 'warm'          // 暖色系
  | 'cool'          // 寒色系
  | 'monochrome'    // モノクロ
  | 'complementary' // 補色
  | 'high_contrast' // ハイコントラスト
  | 'pastel';       // パステル

// イラストレーション イテレーション結果
export interface IllustrationIterationResult extends BaseIterationResult {
  generatedDNA?: IllustrationDNA;
  colorVariations?: ColorVariation[];
}

// イラストレーション セッション状態
export interface IllustrationSessionState extends BaseSessionState {
  mode: IllustrationMode;
  targetSubject?: string;          // Transform: 生成したいモチーフ / Extend: バリエーション指示
  colorVariationCount: number;     // 1-5
  iterations: IllustrationIterationResult[];
  referenceDNA?: IllustrationDNA;
}

// イラストレーション生成リクエスト
export interface IllustrationGenerateRequest {
  referenceImage: string;          // base64
  mode: IllustrationMode;
  targetSubject: string;
  colorVariationCount: number;
  maxIterations?: number;
}
