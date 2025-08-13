export interface VoiceSettings {
  stability: number;
  similarity: number;
  style_exaggeration: number;
  use_speaker_boost: boolean;
  speed: number;
}

export interface Voice {
  voice_id: string;
  name: string;
  category: string;
  description?: string;
  preview_url?: string;
  available_for_tiers?: string[];
  labels?: {
    accent?: string;
    gender?: string;
    age?: string;
    use_case?: string;
  };
  settings?: {
    stability: number;
    similarity_boost: number;
    style?: number;
    use_speaker_boost?: boolean;
  };
}

export interface Sentence {
  id: string;
  text: string;
  isGenerating: boolean;
  isGenerated: boolean;
  audioUrl?: string;
  error?: string;
}

export interface TTSProject {
  id: string;
  name: string;
  description?: string;
  sentences: Sentence[];
  voiceId: string;
  voiceSettings: VoiceSettings;
  createdAt: Date;
  updatedAt: Date;
}

export interface TTSConfig {
  voiceId: string;
  voiceSettings: VoiceSettings;
  modelId: string;
}

export interface GenerateAudioRequest {
  text: string;
  voiceId: string;
  voiceSettings: VoiceSettings;
  modelId?: string;
}

export interface GenerateAudioResponse {
  success: boolean;
  audioUrl?: string;
  error?: string;
}

// 단어 사전 관련 타입
export interface PronunciationDictionary {
  [original: string]: string;
}

export interface DictionaryEntry {
  id: string;
  original: string;
  pronunciation: string;
  description?: string;
  createdAt: Date;
} 