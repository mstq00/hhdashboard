import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Supabase 클라이언트 생성 (서버사이드)
const createSupabaseAdmin = () => {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
};

// 사용자 인증 토큰에서 사용자 정보 추출
const getUserFromToken = async (request: NextRequest) => {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.split(' ')[1];
  const supabase = createSupabaseAdmin();
  
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
      return null;
    }
    return user;
  } catch (error) {
    console.error('토큰 검증 오류:', error);
    return null;
  }
};

// TTS 생성 기록 저장 (POST)
export async function POST(request: NextRequest) {
  try {
    console.log('POST /api/tts/history - TTS 기록 저장 요청');
    
    // 사용자 인증 확인
    const user = await getUserFromToken(request);
    if (!user) {
      console.log('POST /api/tts/history - 인증 실패');
      return NextResponse.json(
        { success: false, error: '인증이 필요합니다.' },
        { status: 401 }
      );
    }

    console.log('POST /api/tts/history - 사용자 인증 성공:', user.id);

    // 요청 데이터 파싱
    const body = await request.json();
    const { 
      originalText, 
      processedText, 
      voiceId, 
      voiceSettings, 
      modelId, 
      characterCount, 
      generationTime, 
      fileSize,
      improveKorean,
      status = 'completed',
      errorMessage 
    } = body;

    // 필수 필드 검증
    if (!originalText || !processedText || !voiceId || !voiceSettings || characterCount === undefined) {
      console.log('POST /api/tts/history - 필수 필드 누락');
      return NextResponse.json(
        { success: false, error: '필수 필드가 누락되었습니다.' },
        { status: 400 }
      );
    }

    console.log('POST /api/tts/history - 저장할 데이터:', {
      originalText: originalText.substring(0, 50) + '...',
      characterCount,
      voiceId,
      status
    });

    // Supabase에 TTS 기록 저장
    const supabase = createSupabaseAdmin();
    const { data, error } = await supabase
      .from('tts_generations')
      .insert({
        user_id: user.id,
        original_text: originalText,
        processed_text: processedText,
        voice_id: voiceId,
        voice_settings: voiceSettings,
        model_id: modelId || 'eleven_multilingual_v2',
        character_count: characterCount,
        generation_time_ms: generationTime || null,
        file_size_bytes: fileSize || null,
        improve_korean: improveKorean !== undefined ? improveKorean : true,
        status: status,
        error_message: errorMessage || null
      })
      .select()
      .single();

    if (error) {
      console.error('POST /api/tts/history - DB 저장 오류:', error);
      return NextResponse.json(
        { success: false, error: '데이터베이스 저장 중 오류가 발생했습니다.' },
        { status: 500 }
      );
    }

    console.log('POST /api/tts/history - 저장 성공:', data.id);
    return NextResponse.json({
      success: true,
      data,
      message: 'TTS 기록이 성공적으로 저장되었습니다.'
    });

  } catch (error) {
    console.error('POST /api/tts/history - 서버 오류:', error);
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// TTS 기록 목록 조회 (GET)
export async function GET(request: NextRequest) {
  try {
    console.log('GET /api/tts/history - TTS 기록 조회 요청');
    
    // 사용자 인증 확인
    const user = await getUserFromToken(request);
    if (!user) {
      console.log('GET /api/tts/history - 인증 실패');
      return NextResponse.json(
        { success: false, error: '인증이 필요합니다.' },
        { status: 401 }
      );
    }

    console.log('GET /api/tts/history - 사용자 인증 성공:', user.id);

    // URL 파라미터 추출
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    const status = searchParams.get('status'); // 상태 필터링

    // Supabase에서 사용자의 TTS 기록 조회
    const supabase = createSupabaseAdmin();
    let query = supabase
      .from('tts_generations')
      .select(`
        id,
        original_text,
        processed_text,
        voice_id,
        voice_settings,
        model_id,
        character_count,
        generation_time_ms,
        file_size_bytes,
        improve_korean,
        status,
        error_message,
        created_at
      `, { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // 상태 필터링 적용
    if (status) {
      query = query.eq('status', status);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('GET /api/tts/history - DB 조회 오류:', error);
      return NextResponse.json(
        { success: false, error: '데이터베이스 조회 중 오류가 발생했습니다.' },
        { status: 500 }
      );
    }

    // 통계 정보 계산
    const statsQuery = supabase
      .from('tts_generations')
      .select('character_count, status')
      .eq('user_id', user.id);

    const { data: statsData } = await statsQuery;

    const stats = statsData?.reduce((acc, record) => {
      acc.totalGenerations++;
      acc.totalCharacters += record.character_count || 0;
      if (record.status === 'completed') {
        acc.successfulGenerations++;
      }
      return acc;
    }, {
      totalGenerations: 0,
      totalCharacters: 0,
      successfulGenerations: 0
    }) || { totalGenerations: 0, totalCharacters: 0, successfulGenerations: 0 };

    console.log('GET /api/tts/history - 조회 성공:', data?.length, '개 항목');
    return NextResponse.json({
      success: true,
      data: data || [],
      total: count || 0,
      limit,
      offset,
      stats
    });

  } catch (error) {
    console.error('GET /api/tts/history - 서버 오류:', error);
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// TTS 기록 삭제 (DELETE)
export async function DELETE(request: NextRequest) {
  try {
    console.log('DELETE /api/tts/history - TTS 기록 삭제 요청');
    
    // 사용자 인증 확인
    const user = await getUserFromToken(request);
    if (!user) {
      console.log('DELETE /api/tts/history - 인증 실패');
      return NextResponse.json(
        { success: false, error: '인증이 필요합니다.' },
        { status: 401 }
      );
    }

    console.log('DELETE /api/tts/history - 사용자 인증 성공:', user.id);

    // URL 파라미터에서 ID 추출
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      console.log('DELETE /api/tts/history - ID 파라미터 누락');
      return NextResponse.json(
        { success: false, error: '삭제할 항목의 ID가 필요합니다.' },
        { status: 400 }
      );
    }

    console.log('DELETE /api/tts/history - 삭제할 ID:', id);

    // Supabase에서 해당 사용자의 TTS 기록만 삭제 (보안)
    const supabase = createSupabaseAdmin();
    const { data, error } = await supabase
      .from('tts_generations')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id) // 본인의 데이터만 삭제 가능
      .select()
      .single();

    if (error) {
      console.error('DELETE /api/tts/history - DB 삭제 오류:', error);
      
      // 항목을 찾을 수 없는 경우
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { success: false, error: '삭제할 항목을 찾을 수 없거나 권한이 없습니다.' },
          { status: 404 }
        );
      }
      
      return NextResponse.json(
        { success: false, error: '데이터베이스 삭제 중 오류가 발생했습니다.' },
        { status: 500 }
      );
    }

    console.log('DELETE /api/tts/history - 삭제 성공:', data?.id);
    return NextResponse.json({
      success: true,
      message: 'TTS 기록이 성공적으로 삭제되었습니다.',
      deletedId: data?.id
    });

  } catch (error) {
    console.error('DELETE /api/tts/history - 서버 오류:', error);
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 