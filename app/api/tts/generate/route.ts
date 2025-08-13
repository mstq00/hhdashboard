import { NextRequest, NextResponse } from 'next/server';
import { textToSpeech, validateVoiceSettings } from '@/lib/elevenlabs';
import { improveKoreanPronunciation, validateTextLength } from '@/lib/text-utils';
import { createClient } from '@supabase/supabase-js';
import { PronunciationDictionary } from '@/types/tts';

export async function POST(request: NextRequest) {
  try {
    // 환경변수 확인
    const apiKey = process.env.ELEVENLABS_API_KEY;
    console.log('TTS Generate - API Key exists:', !!apiKey);
    
    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          error: 'ELEVENLABS_API_KEY is not configured',
          details: 'Please configure the environment variable in Vercel',
        },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { text, voiceId, voiceSettings, modelId = 'eleven_multilingual_v2', improveKorean = true } = body;

    // 입력 검증
    if (!text || !voiceId || !voiceSettings) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: text, voiceId, voiceSettings',
        },
        { status: 400 }
      );
    }

    // 텍스트 길이 검증
    const textValidation = validateTextLength(text);
    if (!textValidation.isValid) {
      return NextResponse.json(
        {
          success: false,
          error: textValidation.message,
        },
        { status: 400 }
      );
    }

    // 음성 설정 검증
    if (!validateVoiceSettings(voiceSettings)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid voice settings',
        },
        { status: 400 }
      );
    }

    // 한글 발음 개선 적용 (옵션)
    let processedText = text;
    if (improveKorean) {
      // 사용자 사전 가져오기
      let userDictionary: PronunciationDictionary = {};
      try {
        const authHeader = request.headers.get('authorization');
        if (authHeader && authHeader.startsWith('Bearer ')) {
          const token = authHeader.split(' ')[1];
          const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            {
              auth: {
                autoRefreshToken: false,
                persistSession: false
              },
              global: {
                headers: {
                  Authorization: `Bearer ${token}`
                }
              }
            }
          );

          const { data: { user } } = await supabase.auth.getUser(token);
          if (user) {
            const { data: entries } = await supabase
              .from('pronunciation_dictionary')
              .select('original_word, pronunciation_word')
              .eq('user_id', user.id);

            if (entries) {
              userDictionary = entries.reduce((dict, entry) => {
                dict[entry.original_word] = entry.pronunciation_word;
                return dict;
              }, {} as PronunciationDictionary);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching user dictionary:', error);
      }

      processedText = await improveKoreanPronunciation(text, userDictionary);
    }

    // TTS 생성
    const audioBuffer = await textToSpeech(processedText, voiceId, voiceSettings, modelId);

    // 오디오 데이터를 Base64로 인코딩
    const audioBase64 = Buffer.from(audioBuffer).toString('base64');
    const audioDataUrl = `data:audio/mpeg;base64,${audioBase64}`;

    return NextResponse.json({
      success: true,
      audioUrl: audioDataUrl,
      originalText: text,
      processedText: processedText,
    });

  } catch (error) {
    console.error('Error generating TTS:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to generate speech',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
} 