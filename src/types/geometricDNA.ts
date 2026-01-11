/**
 * Universal Geometric DNA v4 - Comprehensive Typeface Specification
 * 
 * 設計思想：
 * - 抽象的な分類ではなく、具体的な数値・位置・角度で定義
 * - 視覚的に測定可能な特徴のみを含む
 * - 評価時に「一致/不一致」を明確に判定できる項目
 */

// ============================================================================
// 1. PROPORTION（比率・寸法系）
// ============================================================================

export interface ProportionMetrics {
  /** x-height / cap-height 比率 (0.5-0.8, 通常0.7前後) */
  xHeightRatio: number;
  
  /** 文字の横幅 / 高さ 比率 (0.5=condensed, 1.0=square, 1.5=extended) */
  widthToHeightRatio: number;
  
  /** アセンダー突出量 / cap-height比 (0.1-0.3) */
  ascenderExtension: number;
  
  /** ディセンダー突出量 / cap-height比 (0.1-0.3) */
  descenderExtension: number;
  
  /** カウンター（内部空間）の開き具合 (0=closed, 1=open) - e, a, c等 */
  counterOpenness: number;
  
  /** オーバーシュート量 - 丸文字が基準線をはみ出す量 (0-0.05) */
  overshoot: number;
}

// ============================================================================
// 2. STROKE（ストローク特性）
// ============================================================================

export interface StrokeCharacteristics {
  /** 
   * ストローク太さ (全体的な太さ)
   * 0.0 = ヘアライン, 0.5 = レギュラー, 1.0 = ウルトラブラック
   */
  weight: number;
  
  /**
   * コントラスト比 = (太い部分 - 細い部分) / 太い部分
   * 0.0 = モノライン（均一）, 0.9 = 超ハイコントラスト
   */
  contrast: number;
  
  /**
   * コントラストの軸角度（度）
   * 0 = 垂直軸（縦が太い）, 90 = 水平軸（横が太い）, 30 = 斜め軸
   */
  contrastAxisAngle: number;
  
  /**
   * ストロークの変調パターン
   * - 'constant': 一定の太さ
   * - 'gradual': 緩やかに変化
   * - 'abrupt': 急激に変化（ハイコントラストセリフ）
   */
  modulationType: 'constant' | 'gradual' | 'abrupt';
  
  /**
   * ストロークエッジの処理
   * - 'sharp': シャープなエッジ
   * - 'soft': 若干丸みを帯びた処理
   */
  edgeQuality: 'sharp' | 'soft';
}

// ============================================================================
// 3. TERMINALS（端点処理）
// ============================================================================

export interface TerminalDetails {
  /**
   * 水平ストロークの端点形状
   * - 'flat_90': 垂直にカット（90度）
   * - 'flat_angled': 斜めにカット（角度指定）
   * - 'rounded': 丸い
   * - 'pointed': 尖っている
   * - 'ball': ボール端点
   * - 'tapered': 先細り
   */
  horizontalTerminal: 'flat_90' | 'flat_angled' | 'rounded' | 'pointed' | 'ball' | 'tapered';
  
  /** flat_angledの場合の角度（度）- 0=垂直, 45=対角 */
  horizontalTerminalAngle: number;
  
  /**
   * 垂直ストロークの端点形状
   */
  verticalTerminal: 'flat_90' | 'flat_angled' | 'rounded' | 'pointed' | 'ball' | 'tapered';
  
  /** flat_angledの場合の角度 */
  verticalTerminalAngle: number;
  
  /**
   * 斜めストローク（v, w, x等）の端点形状
   */
  diagonalTerminal: 'flat_90' | 'flat_perpendicular' | 'rounded' | 'pointed' | 'tapered';
  
  /**
   * セリフ・装飾
   * - 'none': サンセリフ
   * - 'slab': スラブセリフ
   * - 'wedge': くさび形
   * - 'bracketed': ブラケット付き
   * - 'hairline': ヘアラインセリフ
   */
  serifStyle: 'none' | 'slab' | 'wedge' | 'bracketed' | 'hairline';
  
  /** セリフの長さ（ストローク幅との比率）*/
  serifLength: number;
  
  /** セリフの太さ（ストローク幅との比率）*/
  serifWeight: number;
}

// ============================================================================
// 4. JOINTS（接合部処理）
// ============================================================================

export interface JointDetails {
  /**
   * 曲線とステムの接合（n, m, h, u等のショルダー部分）
   * - 'continuous': 滑らかに接続
   * - 'angular': 角張った接続
   * - 'gapped': 隙間あり（ステンシル）
   * - 'overlapped': 重なり接続
   */
  curveToStemJoin: 'continuous' | 'angular' | 'gapped' | 'overlapped';
  
  /** gappedの場合の隙間サイズ（ストローク幅との比率）*/
  gapSize: number;
  
  /**
   * ストローク交差部（x, k等）
   * - 'crossing': 交差
   * - 'gapped': 隙間あり
   * - 'ink_trap': インクトラップあり
   */
  strokeCrossing: 'crossing' | 'gapped' | 'ink_trap';
  
  /** インクトラップの深さ（ストローク幅との比率）*/
  inkTrapDepth: number;
  
  /**
   * 頂点・底点処理（v, w, m, n等）
   * - 'sharp': 鋭角
   * - 'flat': 平らに切り落とし
   * - 'rounded': 丸み
   */
  apexStyle: 'sharp' | 'flat' | 'rounded';
  
  /**
   * crotch（v字の内側角）の深さ
   * 0 = 浅い（文字が広い）, 1 = 深い（文字が狭い）
   */
  crotchDepth: number;
}

// ============================================================================
// 5. CURVES（曲線特性）
// ============================================================================

export interface CurveCharacteristics {
  /**
   * 基本曲線の形状
   * - 'circular': 正円に近い
   * - 'elliptical': 楕円
   * - 'superellipse': 角丸四角形（スーパー楕円）
   * - 'rectangular': 四角形に近い
   */
  bowlShape: 'circular' | 'elliptical' | 'superellipse' | 'rectangular';
  
  /** スーパー楕円のn値（2=円、4=角丸、∞=四角）*/
  superellipseN: number;
  
  /**
   * 曲線のテンション（張り具合）
   * 0 = 緩い曲線, 1 = 張った曲線
   */
  curveTension: number;
  
  /**
   * S字曲線（s, &等）の滑らかさ
   * 0 = 角張った, 1 = 滑らか
   */
  sSmoothness: number;
}

// ============================================================================
// 6. SPECIFIC GLYPHS（特定文字の形状）
// ============================================================================

export interface SpecificGlyphStyles {
  /** 'a' のスタイル */
  letterA: 'single_story' | 'double_story';
  
  /** 'g' のスタイル */
  letterG: 'single_story' | 'double_story';
  
  /** 'e' のクロスバー角度（度）- 0=水平, -15=下がり */
  letterE_crossbarAngle: number;
  
  /** 'e' の目（アイ）の開き具合 (0=閉じ, 1=開き) */
  letterE_eyeOpenness: number;
  
  /** 't' のクロスバー位置（x-height比）*/
  letterT_crossbarPosition: number;
  
  /** 'i/j' のドット形状 */
  tittle: 'circle' | 'square' | 'rectangle' | 'diamond' | 'none';
  
  /** 'Q' のテール形状 */
  letterQ_tail: 'crossing' | 'detached' | 'curved' | 'straight';
  
  /** 'R' の脚形状 */
  letterR_leg: 'curved' | 'straight' | 'diagonal';
  
  /** 数字のスタイル */
  figures: 'lining' | 'oldstyle' | 'tabular';
}

// ============================================================================
// 7. RHYTHM & SPACING（リズム・スペーシング）
// ============================================================================

export interface RhythmSpacing {
  /** 文字間の基本間隔（em単位、負=タイト、正=ルーズ）*/
  tracking: number;
  
  /** 内部空間の一貫性（0=ばらつき、1=統一）*/
  counterConsistency: number;
  
  /** 文字幅の一貫性（0=可変幅、1=モノスペース）*/
  widthConsistency: number;
  
  /** 
   * リズムパターン
   * - 'even': 均等なリズム
   * - 'alternating': 太/細の交互リズム
   * - 'organic': 自然な揺らぎ
   */
  rhythmPattern: 'even' | 'alternating' | 'organic';
}

// ============================================================================
// 8. CONCEPTUAL（コンセプト・性格）
// ============================================================================

export interface ConceptualAttributes {
  /**
   * 構築方法
   * - 'geometric': 幾何学的構築
   * - 'humanist': ヒューマニスト（手書き由来）
   * - 'industrial': 産業的・機械的
   * - 'calligraphic': カリグラフィック
   */
  constructionPhilosophy: 'geometric' | 'humanist' | 'industrial' | 'calligraphic';
  
  /**
   * 時代感
   * - 'classical': 古典的
   * - 'modern': モダン
   * - 'contemporary': 現代的
   * - 'futuristic': 未来的
   * - 'retro': レトロ
   */
  era: 'classical' | 'modern' | 'contemporary' | 'futuristic' | 'retro';
  
  /**
   * 印象・トーン
   */
  tone: {
    warmth: number;      // -1=冷たい, 1=温かい
    formality: number;   // -1=カジュアル, 1=フォーマル
    strength: number;    // -1=繊細, 1=力強い
  };
  
  /** その他の視覚的特徴（自由記述）*/
  distinctiveFeatures: string[];
}

// ============================================================================
// MAIN DNA INTERFACE
// ============================================================================

export interface UniversalGeometricDNA {
  version: '4.0';
  proportion: ProportionMetrics;
  stroke: StrokeCharacteristics;
  terminals: TerminalDetails;
  joints: JointDetails;
  curves: CurveCharacteristics;
  glyphs: SpecificGlyphStyles;
  rhythm: RhythmSpacing;
  concept: ConceptualAttributes;
}

// ============================================================================
// EVALUATION INTERFACE（評価軸）
// ============================================================================

export interface EvaluationBreakdown {
  /** 比率・寸法の一致度 (0-15) */
  proportionMatch: number;
  
  /** ストローク特性の一致度 (0-15) */
  strokeMatch: number;
  
  /** 端点処理の一致度 (0-15) */
  terminalMatch: number;
  
  /** 接合部の一致度 (0-10) */
  jointMatch: number;
  
  /** 曲線特性の一致度 (0-10) */
  curveMatch: number;
  
  /** 特定文字形状の一致度 (0-10) */
  glyphMatch: number;
  
  /** リズム・スペーシングの一致度 (0-10) */
  rhythmMatch: number;
  
  /** 全体的印象・コンセプトの一致度 (0-15) */
  conceptMatch: number;
}

export interface FeedbackLoopResult {
  /** 総合スコア (0-100) */
  score: number;
  
  /** 各評価軸のスコア */
  breakdown: EvaluationBreakdown;
  
  /** 具体的な問題点のリスト */
  issues: Array<{
    category: keyof EvaluationBreakdown;
    description: string;
    severity: 'critical' | 'major' | 'minor';
  }>;
  
  /** 全体的な評価コメント */
  critique: string;
  
  /** 改善のための具体的な指示 */
  adjustmentDirectives: string[];
  
  /** 収束判定 */
  isConverged: boolean;
  
  /** イテレーション番号 */
  iteration: number;
  
  /** タイムスタンプ */
  timestamp: Date;
}

// ============================================================================
// Strategy Types
// ============================================================================

export type StrategyType = 
  | 'structural'      // 幾何学的構築
  | 'tool_based'      // ツール物理シミュレーション
  | 'negative_space'; // カウンター優先

export interface StrategyConfig {
  type: StrategyType;
  description: string;
  focusAreas: string[];
}

export const STRATEGIES: Record<StrategyType, StrategyConfig> = {
  structural: {
    type: 'structural',
    description: '幾何学的構築アプローチ',
    focusAreas: ['比率', '曲線形状', '対称性']
  },
  tool_based: {
    type: 'tool_based',
    description: 'ツールシミュレーションアプローチ',
    focusAreas: ['ストローク変調', 'コントラスト', '端点処理']
  },
  negative_space: {
    type: 'negative_space',
    description: 'カウンター優先アプローチ',
    focusAreas: ['内部空間', 'リズム', '開口部']
  }
};

// ============================================================================
// Session Types
// ============================================================================

export interface ForgeSessionResult {
  referenceImagePath: string;
  targetString: string;
  strategy: StrategyType;
  extractedDNA: UniversalGeometricDNA;
  iterations: IterationResult[];
  finalOutputPath: string;
  finalScore: number;
  totalIterations: number;
  converged: boolean;
  durationMs: number;
}

export interface IterationResult {
  iteration: number;
  prompt: string;
  outputPath: string;
  evaluation: FeedbackLoopResult;
  dnaAdjustments: Partial<UniversalGeometricDNA>;
  durationMs: number;
}

// ============================================================================
// Utility Functions
// ============================================================================

export function createDefaultDNA(): UniversalGeometricDNA {
  return {
    version: '4.0',
    proportion: {
      xHeightRatio: 0.7,
      widthToHeightRatio: 0.8,
      ascenderExtension: 0.2,
      descenderExtension: 0.2,
      counterOpenness: 0.5,
      overshoot: 0.02
    },
    stroke: {
      weight: 0.5,
      contrast: 0,
      contrastAxisAngle: 0,
      modulationType: 'constant',
      edgeQuality: 'sharp'
    },
    terminals: {
      horizontalTerminal: 'flat_90',
      horizontalTerminalAngle: 0,
      verticalTerminal: 'flat_90',
      verticalTerminalAngle: 0,
      diagonalTerminal: 'flat_90',
      serifStyle: 'none',
      serifLength: 0,
      serifWeight: 0
    },
    joints: {
      curveToStemJoin: 'continuous',
      gapSize: 0,
      strokeCrossing: 'crossing',
      inkTrapDepth: 0,
      apexStyle: 'sharp',
      crotchDepth: 0.5
    },
    curves: {
      bowlShape: 'circular',
      superellipseN: 2,
      curveTension: 0.5,
      sSmoothness: 0.5
    },
    glyphs: {
      letterA: 'single_story',
      letterG: 'single_story',
      letterE_crossbarAngle: 0,
      letterE_eyeOpenness: 0.5,
      letterT_crossbarPosition: 0.7,
      tittle: 'circle',
      letterQ_tail: 'crossing',
      letterR_leg: 'curved',
      figures: 'lining'
    },
    rhythm: {
      tracking: 0,
      counterConsistency: 0.8,
      widthConsistency: 0.5,
      rhythmPattern: 'even'
    },
    concept: {
      constructionPhilosophy: 'geometric',
      era: 'modern',
      tone: {
        warmth: 0,
        formality: 0,
        strength: 0
      },
      distinctiveFeatures: []
    }
  };
}

export function mergeDNA(
  base: UniversalGeometricDNA,
  updates: Partial<UniversalGeometricDNA>
): UniversalGeometricDNA {
  return {
    version: '4.0',
    proportion: { ...base.proportion, ...updates.proportion },
    stroke: { ...base.stroke, ...updates.stroke },
    terminals: { ...base.terminals, ...updates.terminals },
    joints: { ...base.joints, ...updates.joints },
    curves: { ...base.curves, ...updates.curves },
    glyphs: { ...base.glyphs, ...updates.glyphs },
    rhythm: { ...base.rhythm, ...updates.rhythm },
    concept: {
      ...base.concept,
      ...updates.concept,
      tone: { ...base.concept.tone, ...updates.concept?.tone },
      distinctiveFeatures: updates.concept?.distinctiveFeatures ?? base.concept.distinctiveFeatures
    }
  };
}

export function createDefaultEvaluationBreakdown(): EvaluationBreakdown {
  return {
    proportionMatch: 7,
    strokeMatch: 7,
    terminalMatch: 7,
    jointMatch: 5,
    curveMatch: 5,
    glyphMatch: 5,
    rhythmMatch: 5,
    conceptMatch: 7
  };
}
