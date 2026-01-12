// 共通セッション状態
export type SessionStatus = 'idle' | 'uploading' | 'analyzing' | 'generating' | 'evaluating' | 'complete' | 'error';

// 共通イテレーション状態
export type IterationStatus = 'starting' | 'generating' | 'evaluating' | 'complete' | 'error';

// 共通セッション状態のベース
export interface BaseSessionState {
  status: SessionStatus;
  currentStep: string;
  analysisTime?: number;
  totalTime?: number;
  error?: string;
  sessionId?: string;
}

// 共通イテレーション結果のベース
export interface BaseIterationResult {
  iteration: number;
  imageUrl?: string;
  score?: number;
  status: IterationStatus;
  generationTime?: number;
  evaluationTime?: number;
  errorMessage?: string;
  userFeedback?: {
    comment: string;
    rating: number | null;
  };
}

// タブ識別子 - 将来の拡張に対応
export type TabId = 'typeface' | 'illustration';

// タブ定義
export interface TabDefinition {
  id: TabId;
  label: string;
  description: string;
}

// 共通タブ定義
export const TABS: TabDefinition[] = [
  { id: 'typeface', label: 'Typeface', description: 'Mathematical typeface analysis & transfer' },
  { id: 'illustration', label: 'Illustration', description: 'Style-consistent illustration generation' },
];
