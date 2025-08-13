import { VoiceSettings } from '@/types/tts';

/**
 * 음성 설정의 기본값을 반환합니다 (클라이언트용)
 */
export function getDefaultVoiceSettings(): VoiceSettings {
  return {
    stability: 0.5,
    similarity: 0.75,
    style_exaggeration: 0.0,
    use_speaker_boost: false,
    speed: 1.0,
  };
}

/**
 * 음성 설정 값의 유효성을 검사합니다 (클라이언트용)
 */
export function validateVoiceSettings(settings: VoiceSettings): boolean {
  return (
    settings.stability >= 0 && settings.stability <= 1 &&
    settings.similarity >= 0 && settings.similarity <= 1 &&
    settings.style_exaggeration >= 0 && settings.style_exaggeration <= 1 &&
    settings.speed >= 0.7 && settings.speed <= 1.2
  );
}

/**
 * 음성 설정을 사용자 친화적인 라벨로 변환합니다
 */
export function getVoiceSettingLabels() {
  return {
    stability: {
      label: 'Stability (안정성)',
      description: '음성의 안정성을 조절합니다. 높을수록 일관된 음성이 생성됩니다.',
    },
    similarity: {
      label: 'Similarity (유사성)',
      description: '원본 음성과의 유사성을 조절합니다.',
    },
    style_exaggeration: {
      label: 'Style Exaggeration (스타일 과장)',
      description: '음성 스타일의 과장 정도를 조절합니다.',
    },
    use_speaker_boost: {
      label: 'Speaker Boost (스피커 부스트)',
      description: '음성의 명료도를 향상시킵니다.',
    },
    speed: {
      label: 'Speed (속도)',
      description: '음성의 재생 속도를 조절합니다.',
    },
  };
} 