import { NextRequest, NextResponse } from 'next/server';
import { analyzeImageFile, analyzeTextFile, analyzeAudioFile } from '@/lib/gemini';

export async function POST(request: NextRequest) {
  try {
    // 환경변수 확인
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    console.log('File Analysis - API Key exists:', !!apiKey);
    
    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          error: 'NEXT_PUBLIC_GEMINI_API_KEY is not configured',
          details: 'Please configure the environment variable in Vercel',
        },
        { status: 503 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const fileType = formData.get('fileType') as string;

    // 입력 검증
    if (!file || !fileType) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: file, fileType',
        },
        { status: 400 }
      );
    }

    // 파일 크기 검증 (20MB 제한 - Gemini API 제한)
    const maxSize = 20 * 1024 * 1024; // 20MB
    if (file.size > maxSize) {
      return NextResponse.json(
        {
          success: false,
          error: 'File size too large. Maximum size is 20MB',
        },
        { status: 400 }
      );
    }

    let prompt: string;
    let analysis: any;

    // 파일 타입별 분석
    switch (fileType) {
      case 'image':
        prompt = await analyzeImageFile(file);
        analysis = {
          fileType: 'image',
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type,
        };
        break;

      case 'audio':
        prompt = await analyzeAudioFile(file);
        analysis = {
          fileType: 'audio',
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type,
        };
        break;

      case 'text':
        const textContent = await file.text();
        prompt = await analyzeTextFile(textContent);
        analysis = {
          fileType: 'text',
          fileName: file.name,
          fileSize: file.size,
          textLength: textContent.length,
        };
        break;

      case 'video':
        // 비디오 파일은 현재 지원하지 않음 (향후 확장 예정)
        return NextResponse.json(
          {
            success: false,
            error: 'Video files are not supported yet. Please use image, audio, or text files.',
          },
          { status: 400 }
        );

      default:
        return NextResponse.json(
          {
            success: false,
            error: 'Unsupported file type',
          },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      prompt,
      analysis: {
        ...analysis,
        timestamp: new Date().toISOString(),
      },
    });

  } catch (error) {
    console.error('Error analyzing file:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to analyze file',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
