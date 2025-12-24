// BGM Studio 관련 타입 정의

export interface MusicGenerationRequest {
  prompt: string;
  musicLengthMs?: number; // 생략 시 auto
  autoDuration?: boolean;
  numVariants?: number; // 1~2
  compositionPlan?: CompositionPlan;
}

export interface MusicGenerationResponse {
  id: string;
  prompt: string;
  audioUrl: string;
  duration: number;
  createdAt: string;
  status: 'generating' | 'completed' | 'failed';
  error?: string;
  variantIndex?: number;
  coverUrl?: string;
  isLiked?: boolean;
}

export interface CompositionPlan {
  positiveGlobalStyles: string[];
  negativeGlobalStyles: string[];
  sections: MusicSection[];
}

export interface MusicSection {
  sectionName: string;
  positiveLocalStyles: string[];
  negativeLocalStyles: string[];
  durationMs: number;
  lines: string[];
}

export interface YouTubeAnalysisRequest {
  url: string;
}

export interface YouTubeAnalysisResponse {
  prompt: string;
  analysis: {
    mood: string;
    tempo: string;
    instruments: string[];
    key: string;
    features: string[];
  };
}

export interface FileAnalysisRequest {
  file: File;
  fileType: 'audio' | 'image' | 'video' | 'text';
}

export interface FileAnalysisResponse {
  prompt: string;
  analysis: {
    mood: string;
    tempo?: string;
    instruments?: string[];
    key?: string;
    features: string[];
  };
}

export interface MusicHistory {
  id: string;
  userId: string;
  prompt: string;
  audioUrl: string;
  duration: number;
  createdAt: string;
  sourceType: 'youtube' | 'file' | 'manual';
  sourceData?: string; // YouTube URL 또는 파일명
}

export interface MusicGenerationOptions {
  musicLengthMs: number;
  modelId?: string;
  outputFormat?: string;
}
