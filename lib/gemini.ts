import { GoogleGenerativeAI } from '@google/generative-ai';

const GEMINI_API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  console.error('NEXT_PUBLIC_GEMINI_API_KEY is not set in environment variables');
}

const genAI = GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null;



/**
 * 이미지 파일을 분석하여 음악 생성 프롬프트를 만듭니다
 */
export async function analyzeImageFile(imageFile: File): Promise<string> {
  try {
    if (!genAI) {
      throw new Error('Gemini API 키가 설정되지 않았습니다.');
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-pro' });
    
    // 이미지를 base64로 변환 (서버/브라우저 모두 지원)
    const base64Image = await fileToBase64(imageFile);
    
    const prompt = `
You are a professional music analyst and composer. Analyze the following image and produce ONE compact English prompt for the Eleven Labs MUSIC API.

Focus on extracting:
- Visual mood and atmosphere (concise but specific)
- Emotional tone and feeling conveyed
- Color palette and lighting characteristics
- Subject matter and composition style
- Musical elements that could complement the visual

Then synthesize a detailed and comprehensive prompt suitable for generation. Make it as specific and detailed as possible, including all musical elements, instrumentation details, production characteristics, and emotional nuances. Avoid referencing copyrighted content, and avoid mentioning the image itself.

Return ONLY the final detailed English prompt for music generation. No extra text.`;

    const imagePart = {
      inlineData: {
        mimeType: imageFile.type || 'image/jpeg',
        data: base64Image,
      }
    } as any;

    const result = await model.generateContent([prompt, imagePart]);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('이미지 파일 분석 오류:', error);
    throw new Error('이미지 파일 분석에 실패했습니다.');
  }
}

/**
 * 텍스트 파일을 분석하여 음악 생성 프롬프트를 만듭니다
 */
export async function analyzeTextFile(textContent: string): Promise<string> {
  try {
    if (!genAI) {
      throw new Error('Gemini API 키가 설정되지 않았습니다.');
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-pro' });

    const prompt = `
You are a professional music analyst and composer. Analyze the following text and produce ONE compact English prompt for the Eleven Labs MUSIC API.

Text content:
${textContent}

Focus on extracting:
- Overall tone and mood of the text
- Emotional expression and atmosphere
- Subject matter and themes
- Rhythmic flow and pacing
- Musical elements that could complement the text

Then synthesize a detailed and comprehensive prompt suitable for generation. Make it as specific and detailed as possible, including all musical elements, instrumentation details, production characteristics, and emotional nuances. Avoid referencing copyrighted content, and avoid mentioning the text itself.

Return ONLY the final detailed English prompt for music generation. No extra text.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('텍스트 파일 분석 오류:', error);
    throw new Error('텍스트 파일 분석에 실패했습니다.');
  }
}

/**
 * 오디오 파일을 분석하여 음악 생성 프롬프트를 만듭니다
 */
export async function analyzeAudioFile(audioFile: File): Promise<string> {
  try {
    if (!genAI) {
      throw new Error('Gemini API 키가 설정되지 않았습니다.');
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-pro' });
    
    // 오디오를 base64로 변환 (서버/브라우저 모두 지원)
    const base64Audio = await fileToBase64(audioFile);
    
    const prompt = `
You are a professional music analyst and composer. Analyze the following audio clip and produce ONE compact English prompt for the Eleven Labs MUSIC API.

Focus on extracting:
- Mood and genre (concise but specific)
- Tempo with estimated BPM range and time signature
- Key and scale (e.g., A minor / C# Dorian) and general harmonic color
- Core instrumentation (primary/secondary instruments, synth/texture types)
- Rhythmic/metric characteristics (groove, syncopation, pattern descriptors)
- Arrangement/structure hints (intro/verse/chorus/bridge/outro; if obvious)
- Production/mix traits (reverb/space, compression, saturation, stereo width)
- Distinctive musical elements to emulate (hooks, motifs, arpeggios, ostinatos)

Then synthesize a detailed and comprehensive prompt suitable for generation. Make it as specific and detailed as possible, including all musical elements, instrumentation details, production characteristics, and emotional nuances. Avoid referencing copyrighted melodies, and avoid mentioning the audio itself.

Return ONLY the final detailed English prompt for music generation. No extra text.`;

    const audioPart = {
      inlineData: {
        mimeType: audioFile.type || 'audio/mpeg',
        data: base64Audio,
      },
    } as any;

    const result = await model.generateContent([prompt, audioPart]);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('오디오 파일 분석 오류:', error);
    throw new Error('오디오 파일 분석에 실패했습니다.');
  }
}

/**
 * 파일을 base64로 변환하는 유틸리티 함수
 */
async function fileToBase64(file: File): Promise<string> {
  // 서버 런타임(Node) 또는 FileReader 미지원 환경
  const isServer = typeof window === 'undefined' || typeof (globalThis as any).FileReader === 'undefined';
  if (isServer && (file as any)?.arrayBuffer) {
    const arr = await (file as any).arrayBuffer();
    return Buffer.from(arr).toString('base64');
  }

  // 브라우저 런타임
  return new Promise((resolve, reject) => {
    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64 = reader.result as string;
        const base64Data = base64.split(',')[1];
        resolve(base64Data);
      };
      reader.onerror = error => reject(error);
    } catch (e) {
      reject(e);
    }
  });
}

/**
 * 서버에서 오디오 바이트(Buffer/ArrayBuffer)를 받아 분석하여 프롬프트 생성
 */
export async function analyzeAudioBuffer(audioBuffer: ArrayBuffer | Uint8Array | Buffer, mimeType: string = 'audio/mpeg'): Promise<string> {
  try {
    if (!genAI) {
      throw new Error('Gemini API 키가 설정되지 않았습니다.');
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-pro' });
    const buf = Buffer.isBuffer(audioBuffer) ? audioBuffer : Buffer.from(audioBuffer as any);
    const base64Audio = buf.toString('base64');

    const prompt = `
You are a professional music analyst and composer. Analyze the following audio clip and produce ONE compact English prompt for the Eleven Labs MUSIC API.

Include: mood/genre, key+scale, estimated BPM and time signature, core instrumentation, rhythmic feel, arrangement hints, and unique motifs to emulate. Avoid referencing copyrighted melodies. Return ONLY the final prompt (1–3 sentences).
`;

    const audioPart = {
      inlineData: {
        mimeType,
        data: base64Audio,
      },
    } as any;

    const result = await model.generateContent([ { text: prompt }, audioPart ]);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('오디오 버퍼 분석 오류:', error);
    throw new Error('오디오 버퍼 분석에 실패했습니다.');
  }
}

/**
 * YouTube URL을 기반으로 설명/메타 정보를 추론하여 음악 프롬프트를 생성합니다.
 * 실제 크롤링은 수행하지 않으며, URL 컨텍스트(제목/설명 가정)에 맞춘 일반화된 프롬프트를 생성합니다.
 */
export async function analyzeYouTubeVideo(url: string): Promise<string> {
  try {
    if (!genAI) {
      throw new Error('Gemini API 키가 설정되지 않았습니다.');
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-pro' });
    const prompt = `
You are a professional music analyst and composer.
Given a YouTube video URL:
${url}

Infer likely content context (title, description, vibe) and produce ONE compact English prompt for the Eleven Labs MUSIC API.
Include: mood/genre, rough BPM range, key/scale suggestion, core instrumentation, arrangement hint, and production traits.
Do not reference the YouTube link or video directly. Return ONLY the final prompt (1–3 sentences).`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('YouTube URL 분석 오류:', error);
    // 안전한 기본값 반환 (빌드 안정성 확보)
    return 'Create an energetic synth-pop track (~120 BPM, A minor) with bright analog synth leads, punchy side‑chained bass, tight electronic drums, wide airy pads, and modern glossy production suitable for upbeat online content.';
  }
}
