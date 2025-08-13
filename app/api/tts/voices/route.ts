import { NextResponse } from 'next/server';
import { getVoices } from '@/lib/elevenlabs';

export async function GET() {
  try {
    // 환경변수 확인
    const apiKey = process.env.ELEVENLABS_API_KEY;
    console.log('API Key exists:', !!apiKey);
    console.log('API Key length:', apiKey?.length || 0);
    
    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          error: 'ELEVENLABS_API_KEY is not configured',
          details: 'Please check your .env.local file',
        },
        { status: 500 }
      );
    }
    
    const voices = await getVoices();
    
    return NextResponse.json({
      success: true,
      voices,
    });
  } catch (error) {
    console.error('Error fetching voices:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch voices',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
} 