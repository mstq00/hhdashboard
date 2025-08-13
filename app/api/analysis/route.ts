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
  console.log('Authorization 헤더:', authHeader ? '존재함' : '없음');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log('Authorization 헤더 형식 오류 또는 없음');
    return null;
  }

  const token = authHeader.split(' ')[1];
  console.log('토큰 길이:', token?.length || 0);
  
  const supabase = createSupabaseAdmin();
  
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    console.log('토큰 검증 결과:', { hasUser: !!user, hasError: !!error, errorMessage: error?.message });
    
    if (error || !user) {
      console.log('토큰 검증 실패:', error?.message);
      return null;
    }
    
    console.log('사용자 인증 성공:', user.id);
    return user;
  } catch (error) {
    console.error('토큰 검증 오류:', error);
    return null;
  }
};

// 분석 결과 저장 (POST)
export async function POST(request: NextRequest) {
  try {
    console.log('POST /api/analysis - 분석 결과 저장 요청');
    
    // 사용자 인증 확인
    const user = await getUserFromToken(request);
    if (!user) {
      console.log('POST /api/analysis - 인증 실패');
      return NextResponse.json(
        { success: false, error: '인증이 필요합니다.' },
        { status: 401 }
      );
    }

    console.log('POST /api/analysis - 사용자 인증 성공:', user.id);

    // 요청 데이터 파싱
    const body = await request.json();
    const { videoUrl, videoTitle, videoThumbnail, analysisData } = body;

    // 필수 필드 검증
    if (!videoUrl || !videoTitle || !analysisData) {
      console.log('POST /api/analysis - 필수 필드 누락');
      return NextResponse.json(
        { success: false, error: '필수 필드가 누락되었습니다.' },
        { status: 400 }
      );
    }

    console.log('POST /api/analysis - 저장할 데이터:', {
      videoUrl: videoUrl.substring(0, 50) + '...',
      videoTitle: videoTitle.substring(0, 30) + '...',
      hasAnalysisData: !!analysisData
    });

    // Supabase에 분석 결과 저장
    const supabase = createSupabaseAdmin();
    const { data, error } = await supabase
      .from('shortform_analyses')
      .insert({
        user_id: user.id,
        video_url: videoUrl,
        video_title: videoTitle,
        video_thumbnail: videoThumbnail || null,
        analysis_data: analysisData,
        status: 'completed'
      })
      .select()
      .single();

    if (error) {
      console.error('POST /api/analysis - DB 저장 오류:', error);
      return NextResponse.json(
        { success: false, error: '데이터베이스 저장 중 오류가 발생했습니다.' },
        { status: 500 }
      );
    }

    console.log('POST /api/analysis - 저장 성공:', data.id);
    return NextResponse.json({
      success: true,
      data,
      message: '분석 결과가 성공적으로 저장되었습니다.'
    });

  } catch (error) {
    console.error('POST /api/analysis - 서버 오류:', error);
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// 분석 결과 목록 조회 (GET)
export async function GET(request: NextRequest) {
  try {
    console.log('GET /api/analysis - 분석 결과 조회 요청');
    
    // 사용자 인증 확인
    const user = await getUserFromToken(request);
    if (!user) {
      console.log('GET /api/analysis - 인증 실패');
      return NextResponse.json(
        { success: false, error: '인증이 필요합니다.' },
        { status: 401 }
      );
    }

    console.log('GET /api/analysis - 사용자 인증 성공:', user.id);

    // URL 파라미터 추출
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Supabase에서 사용자의 분석 결과 조회
    const supabase = createSupabaseAdmin();
    const { data, error, count } = await supabase
      .from('shortform_analyses')
      .select(`
        id,
        video_url,
        video_title,
        video_thumbnail,
        analysis_data,
        status,
        created_at,
        updated_at
      `, { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('GET /api/analysis - DB 조회 오류:', error);
      return NextResponse.json(
        { success: false, error: '데이터베이스 조회 중 오류가 발생했습니다.' },
        { status: 500 }
      );
    }

    console.log('GET /api/analysis - 조회 성공:', data?.length, '개 항목');
    return NextResponse.json({
      success: true,
      data: data || [],
      total: count || 0,
      limit,
      offset
    });

  } catch (error) {
    console.error('GET /api/analysis - 서버 오류:', error);
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// 분석 결과 삭제 (DELETE)
export async function DELETE(request: NextRequest) {
  try {
    console.log('DELETE /api/analysis - 분석 결과 삭제 요청');
    
    // 사용자 인증 확인
    const user = await getUserFromToken(request);
    if (!user) {
      console.log('DELETE /api/analysis - 인증 실패');
      return NextResponse.json(
        { success: false, error: '인증이 필요합니다.' },
        { status: 401 }
      );
    }

    console.log('DELETE /api/analysis - 사용자 인증 성공:', user.id);

    // URL 파라미터에서 ID 추출
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      console.log('DELETE /api/analysis - ID 파라미터 누락');
      return NextResponse.json(
        { success: false, error: '삭제할 항목의 ID가 필요합니다.' },
        { status: 400 }
      );
    }

    console.log('DELETE /api/analysis - 삭제할 ID:', id);

    // Supabase에서 해당 사용자의 분석 결과만 삭제 (보안)
    const supabase = createSupabaseAdmin();
    const { data, error } = await supabase
      .from('shortform_analyses')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id) // 본인의 데이터만 삭제 가능
      .select()
      .single();

    if (error) {
      console.error('DELETE /api/analysis - DB 삭제 오류:', error);
      
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

    console.log('DELETE /api/analysis - 삭제 성공:', data?.id);
    return NextResponse.json({
      success: true,
      message: '분석 결과가 성공적으로 삭제되었습니다.',
      deletedId: data?.id
    });

  } catch (error) {
    console.error('DELETE /api/analysis - 서버 오류:', error);
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 