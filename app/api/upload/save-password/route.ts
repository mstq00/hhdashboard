import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// 환경 변수 확인
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Supabase 환경 변수가 설정되지 않았습니다:', {
    url: supabaseUrl,
    hasServiceKey: !!supabaseServiceKey
  });
}

const supabase = createClient(supabaseUrl!, supabaseServiceKey!, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

export async function POST(request: NextRequest) {
  try {
    const { channel, password, userId } = await request.json();

    if (!channel || !password || !userId) {
      return NextResponse.json(
        { error: '필수 데이터가 누락되었습니다.' },
        { status: 400 }
      );
    }

    // 사용자별 채널 비밀번호 저장 (upsert)
    const { error } = await supabase
      .from('user_channel_passwords')
      .upsert({
        user_id: userId,
        channel,
        password
      }, {
        onConflict: 'user_id,channel'
      });

    if (error) {
      console.error('비밀번호 저장 오류:', error);
      return NextResponse.json(
        { error: '비밀번호 저장 중 오류가 발생했습니다.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '비밀번호가 저장되었습니다.'
    });

  } catch (error) {
    console.error('비밀번호 저장 오류:', error);
    return NextResponse.json(
      { error: '비밀번호 저장 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// 저장된 비밀번호 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const channel = searchParams.get('channel');
    const userId = searchParams.get('userId');

    if (!channel || !userId) {
      return NextResponse.json(
        { error: '채널과 사용자 ID가 필요합니다.' },
        { status: 400 }
      );
    }

    // 사용자별 채널 비밀번호 조회
    const { data, error } = await supabase
      .from('user_channel_passwords')
      .select('password')
      .eq('user_id', userId)
      .eq('channel', channel)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116는 데이터가 없는 경우
      console.error('비밀번호 조회 오류:', error);
      return NextResponse.json(
        { error: '비밀번호 조회 중 오류가 발생했습니다.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        password: data?.password || null
      }
    });

  } catch (error) {
    console.error('비밀번호 조회 오류:', error);
    return NextResponse.json(
      { error: '비밀번호 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 