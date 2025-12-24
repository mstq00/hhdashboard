import { MusicGenerationRequest, MusicGenerationResponse, CompositionPlan } from '@/types/bgm';

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const ELEVENLABS_BASE_URL = 'https://api.elevenlabs.io/v1';

if (!ELEVENLABS_API_KEY) {
  console.error('ELEVENLABS_API_KEY is not set in environment variables');
}

/**
 * ElevenLabs API 요청을 위한 기본 헤더
 */
const getHeaders = () => ({
  'xi-api-key': ELEVENLABS_API_KEY!,
  'Content-Type': 'application/json',
});

/**
 * 음악 생성을 위한 컴포지션 플랜을 생성합니다
 */
export async function createCompositionPlan(prompt: string, musicLengthMs: number): Promise<CompositionPlan> {
  try {
    console.log('Creating composition plan:', { prompt, musicLengthMs });
    
    const response = await fetch(`${ELEVENLABS_BASE_URL}/music/composition-plan`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        prompt,
        music_length_ms: musicLengthMs,
      }),
    });

    console.log('Composition plan response status:', response.status);
    console.log('Composition plan response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Composition plan error response:', errorText);
      throw new Error(`Composition plan creation failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    console.log('Composition plan created successfully:', data);
    return data as CompositionPlan;
  } catch (error) {
    console.error('Error creating composition plan:', error);
    throw error;
  }
}

/**
 * 프롬프트를 기반으로 음악을 생성합니다
 */
export async function generateMusic(request: MusicGenerationRequest): Promise<MusicGenerationResponse[]> {
  try {
    if (!ELEVENLABS_API_KEY) {
      throw new Error('ELEVENLABS_API_KEY is not set in environment variables');
    }

    console.log('Generating music with request:', request);
    console.log('Using API key length:', ELEVENLABS_API_KEY.length);

    const requestBody: any = {
      prompt: request.prompt,
      // autoDuration이 true면 길이 생략 (서버가 자동 결정)
      ...(request.autoDuration ? {} : { music_length_ms: request.musicLengthMs || 30000 }),
      ...(request.numVariants ? { num_variants: Math.min(Math.max(request.numVariants, 1), 2) } : {}),
    };

    // 컴포지션 플랜이 있는 경우 추가
    if (request.compositionPlan) {
      requestBody.composition_plan = request.compositionPlan;
    }

    console.log('Sending request to Eleven Labs:', {
      url: `${ELEVENLABS_BASE_URL}/music`,
      method: 'POST',
      headers: getHeaders(),
      body: requestBody,
    });

    const response = await fetch(`${ELEVENLABS_BASE_URL}/music`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(requestBody),
    });

    console.log('Eleven Labs API response status:', response.status);
    console.log('Eleven Labs API response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Eleven Labs API error response:', errorText);
      
      let errorMessage = `Music generation failed: ${response.status} ${response.statusText}`;
      
      try {
        const errorData = JSON.parse(errorText);
        if (errorData.detail) {
          errorMessage += ` - ${errorData.detail}`;
        }
        if (errorData.message) {
          errorMessage += ` - ${errorData.message}`;
        }
      } catch (parseError) {
        errorMessage += ` - ${errorText}`;
      }
      
      throw new Error(errorMessage);
    }

    // 컨텐츠 타입에 따라 처리 분기 (audio/mpeg 이면 바이너리 오디오 바이트 반환)
    const contentType = response.headers.get('content-type') || '';
    console.log('Eleven Labs API content-type:', contentType);

    const results: MusicGenerationResponse[] = [];

    if (contentType.includes('audio/mpeg')) {
      const audioBuffer = await response.arrayBuffer();
      const base64Audio = Buffer.from(audioBuffer).toString('base64');
      const audioDataUrl = `data:audio/mpeg;base64,${base64Audio}`;
      results.push({
        id: `music_${Date.now()}`,
        prompt: request.prompt,
        audioUrl: audioDataUrl,
        duration: request.autoDuration ? 0 : (request.musicLengthMs ? request.musicLengthMs / 1000 : 0),
        createdAt: new Date().toISOString(),
        status: 'completed',
        variantIndex: 1,
      });
      console.log('Transformed binary audio response');
      return results;
    }

    // 그 외(JSON) 응답 대응
    const data = await response.json();
    console.log('Eleven Labs API success JSON response:', data);
    console.log('Requested numVariants:', request.numVariants);

    // variants 배열 처리 개선
    let list: any[] = [];
    if (Array.isArray(data?.variants)) {
      list = data.variants;
      console.log('Found variants array:', list.length, 'items');
    } else if (Array.isArray(data?.items)) {
      list = data.items;
      console.log('Found items array:', list.length, 'items');
    } else if (data?.variants && typeof data.variants === 'object') {
      // variants가 객체인 경우 (예: {0: {...}, 1: {...}})
      list = Object.values(data.variants);
      console.log('Found variants object, converted to array:', list.length, 'items');
    } else {
      console.log('No variants or items found in response');
    }

    if (list.length > 0) {
      console.log('Processing variants:', list);
      list.forEach((item: any, idx: number) => {
        console.log(`Processing variant ${idx + 1}:`, item);
        const url = item.audio_url || item.audio || item.download_url || item.url;
        if (url) {
          results.push({
            id: item.id || `music_${Date.now()}_${idx+1}`,
            prompt: request.prompt,
            audioUrl: url,
            duration: typeof item.duration_seconds === 'number' ? item.duration_seconds : (request.autoDuration ? 0 : (request.musicLengthMs ? request.musicLengthMs/1000 : 0)),
            createdAt: item.created_at || new Date().toISOString(),
            status: 'completed',
            variantIndex: idx + 1,
          });
          console.log(`Added variant ${idx + 1} with URL:`, url);
        } else {
          console.warn(`Variant ${idx + 1} has no valid URL:`, item);
        }
      });
      console.log('Final results:', results);
      return results;
    }

    // 단일 URL만 오는 경우
    const singleUrl = data.audio_url || data.audio || data.download_url || '';
    if (singleUrl) {
      results.push({
        id: data.id || `music_${Date.now()}`,
        prompt: request.prompt,
        audioUrl: singleUrl,
        duration: request.autoDuration ? 0 : (request.musicLengthMs ? request.musicLengthMs / 1000 : 0),
        createdAt: new Date().toISOString(),
        status: 'completed',
        variantIndex: 1,
      });
    }
    return results;
  } catch (error) {
    console.error('Error generating music:', error);
    throw error;
  }
}

/**
 * 음악 생성을 스트리밍으로 처리합니다 (긴 음악의 경우)
 */
export async function streamMusic(request: MusicGenerationRequest): Promise<ReadableStream> {
  try {
    if (!ELEVENLABS_API_KEY) {
      throw new Error('ELEVENLABS_API_KEY is not set in environment variables');
    }

    const requestBody: any = {
      prompt: request.prompt,
      music_length_ms: request.musicLengthMs,
    };

    if (request.compositionPlan) {
      requestBody.composition_plan = request.compositionPlan;
    }

    const response = await fetch(`${ELEVENLABS_BASE_URL}/music/stream`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Music streaming failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    return response.body!;
  } catch (error) {
    console.error('Error streaming music:', error);
    throw error;
  }
}

/**
 * 사용 가능한 음악 모델 목록을 가져옵니다
 */
export async function getMusicModels() {
  try {
    if (!ELEVENLABS_API_KEY) {
      throw new Error('ELEVENLABS_API_KEY is not set in environment variables');
    }

    const response = await fetch(`${ELEVENLABS_BASE_URL}/models`, {
      headers: getHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch music models: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.models?.filter((model: any) => model.type === 'music') || [];
  } catch (error) {
    console.error('Error fetching music models:', error);
    throw error;
  }
}

/**
 * 음악 생성 사용량 정보를 가져옵니다
 */
export async function getMusicUsageInfo() {
  try {
    if (!ELEVENLABS_API_KEY) {
      throw new Error('ELEVENLABS_API_KEY is not set in environment variables');
    }

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
