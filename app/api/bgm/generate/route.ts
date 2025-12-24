import { NextRequest, NextResponse } from 'next/server';
import { generateMusic } from '@/lib/elevenlabs-music';
import { MusicGenerationRequest } from '@/types/bgm';

export async function POST(request: NextRequest) {
  try {
    // 환경변수 확인
    const apiKey = process.env.ELEVENLABS_API_KEY;
    console.log('BGM Generate - API Key exists:', !!apiKey);
    console.log('BGM Generate - API Key length:', apiKey?.length || 0);
    
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
    console.log('BGM Generate - Request body:', body);
    
    const { prompt, musicLengthMs, autoDuration, compositionPlan }: MusicGenerationRequest = body;

    // 입력 검증
    if (!prompt) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required field: prompt',
          received: { prompt: !!prompt },
        },
        { status: 400 }
      );
    }

    // 음악 길이 검증 (autoDuration이 아닌 경우만)
    if (!autoDuration && musicLengthMs !== undefined && (musicLengthMs < 10000 || musicLengthMs > 300000)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Music length must be between 10 seconds (10000ms) and 5 minutes (300000ms)',
          received: musicLengthMs,
        },
        { status: 400 }
      );
    }
    
    // 변형은 항상 1개로 고정
    const safeNumVariants = 1;

    console.log('BGM Generate - Calling Eleven Labs API with:', {
      prompt,
      musicLengthMs,
      hasCompositionPlan: !!compositionPlan,
    });

    // 음악 생성 (여러 변형 지원)
    const musicResponse = await generateMusic({
      prompt,
      musicLengthMs,
      autoDuration,
      numVariants: safeNumVariants,
      compositionPlan,
    });

    console.log('BGM Generate - Eleven Labs API response:', musicResponse);

    return NextResponse.json({ success: true, music: musicResponse });

  } catch (error) {
    console.error('Error generating BGM:', error);
    
    // 더 자세한 오류 정보 제공
    let errorMessage = 'Failed to generate music';
    let errorDetails = 'Unknown error';
    
    if (error instanceof Error) {
      errorMessage = error.message;
      errorDetails = error.stack || 'No stack trace available';
    }
    
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        details: errorDetails,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
