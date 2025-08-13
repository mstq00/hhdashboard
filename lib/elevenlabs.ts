import { Voice, VoiceSettings } from '@/types/tts';

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const ELEVENLABS_BASE_URL = 'https://api.elevenlabs.io/v1';

if (!ELEVENLABS_API_KEY) {
  throw new Error('ELEVENLABS_API_KEY is not set in environment variables');
}

/**
 * ElevenLabs API 요청을 위한 기본 헤더
 */
const getHeaders = () => ({
  'xi-api-key': ELEVENLABS_API_KEY!,
  'Content-Type': 'application/json',
});

/**
 * 사용 가능한 음성 목록을 가져옵니다
 */
export async function getVoices(): Promise<Voice[]> {
  try {
    const response = await fetch(`${ELEVENLABS_BASE_URL}/voices`, {
      headers: getHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch voices: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.voices as Voice[];
  } catch (error) {
    console.error('Error fetching voices:', error);
    throw error;
  }
}

/**
 * 특정 음성의 상세 정보를 가져옵니다
 */
export async function getVoice(voiceId: string): Promise<Voice> {
  try {
    const response = await fetch(`${ELEVENLABS_BASE_URL}/voices/${voiceId}`, {
      headers: getHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch voice: ${response.status} ${response.statusText}`);
    }

    return await response.json() as Voice;
  } catch (error) {
    console.error('Error fetching voice:', error);
    throw error;
  }
}

/**
 * 텍스트를 음성으로 변환합니다
 */
export async function textToSpeech(
  text: string,
  voiceId: string,
  voiceSettings: VoiceSettings,
  modelId: string = 'eleven_multilingual_v2'
): Promise<ArrayBuffer> {
  try {
    const requestBody = {
      text,
      model_id: modelId,
      voice_settings: {
        stability: voiceSettings.stability,
        similarity_boost: voiceSettings.similarity,
        style: voiceSettings.style_exaggeration,
        use_speaker_boost: voiceSettings.use_speaker_boost,
        speed: voiceSettings.speed,
      },
    };

    const response = await fetch(
      `${ELEVENLABS_BASE_URL}/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
      {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(requestBody),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`TTS API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    return await response.arrayBuffer();
  } catch (error) {
    console.error('Error in text-to-speech:', error);
    throw error;
  }
}

/**
 * 음성 설정 값의 유효성을 검사합니다 (서버용)
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
 * ElevenLabs 사용량 정보를 가져옵니다
 */
export async function getUsageInfo() {
  try {
    const response = await fetch(`${ELEVENLABS_BASE_URL}/user/subscription`, {
      headers: getHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch usage info: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching usage info:', error);
    throw error;
  }
} 