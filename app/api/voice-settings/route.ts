import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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

    // 사용자 정보 가져오기
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      console.log('Voice settings - 사용자 인증 실패:', userError);
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
    
    console.log('Voice settings - 사용자 인증 성공:', user.id);
    
    // skip_auth 모드에서는 임시 사용자 ID 사용 (테스트용)
    const userId = user.id || 'temp_user_id';

    // 사용자 프로필에서 음성 설정 가져오기
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('default_voice_settings')
      .eq('id', userId)
      .single();

    // 테이블이 없거나 프로필이 없는 경우 기본값 반환
    if (error) {
      console.log('Voice settings not found, returning defaults:', error.message);
      return NextResponse.json({ 
        settings: {
          stability: 0.5,
          similarity: 0.75,
          style_exaggeration: 0.0,
          use_speaker_boost: false,
          speed: 1.0
        }
      });
    }

    return NextResponse.json({ 
      settings: profile?.default_voice_settings || {
        stability: 0.5,
        similarity: 0.75,
        style_exaggeration: 0.0,
        use_speaker_boost: false,
        speed: 1.0
      }
    });

  } catch (error) {
    console.error('Error in voice settings GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('POST /api/voice-settings - Start');
    
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('POST /api/voice-settings - No auth header');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    console.log('POST /api/voice-settings - Token received');
    
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

    // 사용자 정보 가져오기
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      console.log('POST /api/voice-settings - User error:', userError);
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    console.log('POST /api/voice-settings - User:', user.id);

    // skip_auth 모드에서는 임시 사용자 ID 사용 (테스트용)
    const userId = user.id || 'temp_user_id';

    const { settings } = await request.json();
    console.log('POST /api/voice-settings - Settings:', settings);

    // 음성 설정 유효성 검사
    if (!settings || typeof settings !== 'object') {
      console.log('POST /api/voice-settings - Invalid settings format');
      return NextResponse.json({ error: 'Invalid settings format' }, { status: 400 });
    }

    // 사용자 프로필 업데이트 (없으면 생성)
    const upsertData = {
      id: userId,
      email: user.email!,
      default_voice_settings: settings,
      updated_at: new Date().toISOString()
    };
    
    console.log('POST /api/voice-settings - Upserting:', upsertData);
    
    const { error } = await supabase
      .from('user_profiles')
      .upsert(upsertData);

    if (error) {
      console.error('POST /api/voice-settings - Supabase error:', error);
      return NextResponse.json({ error: 'Failed to save voice settings', details: error.message }, { status: 500 });
    }

    console.log('POST /api/voice-settings - Success');
    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('POST /api/voice-settings - Catch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 