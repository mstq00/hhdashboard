import { NextRequest, NextResponse } from 'next/server';
import { analyzeYouTubeVideo, analyzeAudioBuffer } from '@/lib/gemini';
import ytdl from 'ytdl-core';
import ffmpegPath from 'ffmpeg-static';
import Ffmpeg from 'fluent-ffmpeg';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    if (!process.env.NEXT_PUBLIC_GEMINI_API_KEY) {
      return NextResponse.json(
        { success: false, error: 'Gemini API not configured' },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { url, mode = 'auto', startSec = 15, durationSec = 30 } = body as { url: string; mode?: 'auto' | 'precise'; startSec?: number; durationSec?: number };

    if (!url || !/^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/.test(url)) {
      return NextResponse.json({ success: false, error: 'Invalid YouTube URL' }, { status: 400 });
    }

    // 정밀 분석 모드: 30초 오디오 샘플 추출 후 오디오 바이트로 분석
    if (mode === 'precise') {
      if (!ffmpegPath) {
        return NextResponse.json({ success: false, error: 'ffmpeg is not available in this environment' }, { status: 500 });
      }
      Ffmpeg.setFfmpegPath(ffmpegPath);

      // 1) YouTube 오디오 스트림 가져오기
      const audioStream = ytdl(url, { filter: 'audioonly', quality: 'highestaudio', highWaterMark: 1 << 25 });

      // 2) ffmpeg로 특정 구간을 mp3로 트랜스코딩
      const buffer: Buffer = await new Promise((resolve, reject) => {
        const chunks: Buffer[] = [];
        const command = Ffmpeg(audioStream)
          .format('mp3')
          .audioCodec('libmp3lame')
          .seekInput(Math.max(0, Number(startSec) || 0))
          .duration(Math.max(5, Number(durationSec) || 30))
          .on('error', (err) => reject(err))
          .on('end', () => resolve(Buffer.concat(chunks)));

        // ffmpeg stdout 수집
        command.pipe()
          .on('data', (d: Buffer) => chunks.push(d))
          .on('error', (e: any) => reject(e));
      });

      if (!buffer || buffer.length === 0) {
        return NextResponse.json({ success: false, error: 'Failed to extract audio sample from YouTube' }, { status: 500 });
      }

      // 3) Gemini 2.5 Pro로 오디오 바이트 분석
      const prompt = await analyzeAudioBuffer(buffer, 'audio/mpeg');
      return NextResponse.json({ success: true, prompt, analysis: { url, mode: 'precise', startSec, durationSec } });
    }

    // 기본 모드: URL 컨텍스트 분석
    const prompt = await analyzeYouTubeVideo(url);
    return NextResponse.json({ success: true, prompt, analysis: { url, mode: 'auto' } });
  } catch (error) {
    console.error('Error analyzing YouTube video with Gemini:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to analyze YouTube video',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
