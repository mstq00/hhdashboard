import { GoogleGenAI } from "@google/genai";

const INSTRUMENTAL_PROMPT = `IMPORTANT RULE: Your entire response, including spaces, MUST NOT exceed 500 characters. The total character count must be between 450 and 500. This is a non-negotiable, hard limit.

TASK: Analyze the provided audio file to create a prompt for SUNO AI to generate a similar instrumental song. Your analysis must be extremely detailed and focus ONLY on the instrumental aspects. IGNORE any vocals or lyrics completely.
Your analysis must include:
1. A very detailed description of the overall mood, key, scale, and specific instrumentation used.
2. A very detailed description of the Genre, BPM, and distinctive instrumental features (e.g., specific melody lines, rhythmic patterns, solos, and harmonic progressions).

Combine this analysis into a single, highly descriptive paragraph in English.`;

const DEFAULT_PROMPT = `IMPORTANT RULE: Your entire response, including spaces, MUST NOT exceed 500 characters. The total character count must be between 450 and 500. This is a non-negotiable, hard limit.

TASK: Analyze the provided audio file to create a prompt for SUNO AI to generate a similar song. Your analysis must be extremely detailed.
Your analysis must include:
1. A very detailed description of the overall mood, key, scale, and specific instrumentation used.
2. A very detailed description of the Genre, BPM, and distinctive features (including a detailed description of the vocal style, timbre, and delivery if present).

Combine this analysis into a single, highly descriptive paragraph in English.`;

/**
 * Converts a File object to a Base64 string (without data URI prefix).
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      // Remove the data URI prefix (e.g., "data:audio/mpeg;base64,")
      const base64Data = result.split(',')[1];
      if (base64Data) {
        resolve(base64Data);
      } else {
        reject(new Error("Failed to extract base64 data from file."));
      }
    };
    reader.onerror = (error) => {
      reject(error);
    };
  });
}

/**
 * Analyzes an audio file using Gemini AI to generate a Suno-compatible prompt.
 */
export async function analyzeAudioForSuno(audioFile: File, isInstrumental: boolean): Promise<string> {
  try {
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI API KEY가 설정되지 않았습니다.');
    }

    const ai = new GoogleGenAI({ apiKey: apiKey });
    
    const base64Audio = await fileToBase64(audioFile);

    const audioPart = {
      inlineData: {
        data: base64Audio,
        mimeType: audioFile.type,
      },
    };

    const prompt = isInstrumental ? INSTRUMENTAL_PROMPT : DEFAULT_PROMPT;

    const textPart = {
      text: prompt,
    };

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: { parts: [textPart, audioPart] },
    });

    if (response.text) {
      let result = response.text.trim();
      // As a failsafe, programmatically truncate the result if it still exceeds the hard limit.
      if (result.length > 500) {
        result = result.substring(0, 500);
      }
      return result;
    } else {
      throw new Error("API가 텍스트를 반환하지 않았습니다. 응답이 차단되었을 수 있습니다.");
    }
  } catch (error) {
    console.error("Gemini를 사용한 오디오 분석 오류:", error);
    throw new Error("오디오 분석에 실패했습니다. 자세한 내용은 콘솔을 확인하세요.");
  }
}

