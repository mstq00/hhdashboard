import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const createSupabaseAdmin = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

const getUserFromToken = async (request: NextRequest) => {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.split(' ')[1];
  const supabase = createSupabaseAdmin();
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) return null;
    return user;
  } catch (e) {
    console.error('Auth token verification error:', e);
    return null;
  }
};

// 생성 기록 저장
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromToken(request);
    if (!user) return NextResponse.json({ success: false, error: '인증이 필요합니다.' }, { status: 401 });

    const body = await request.json();
    const { 
      prompt, 
      audioUrl, 
      duration, 
      variantIndex = 1, 
      numVariants = 1,
      sourceType = 'manual',
      sourceData = null,
      fileType = null,
      isLiked = false
    } = body;

    if (!prompt || !audioUrl || duration === undefined) {
      return NextResponse.json({ success: false, error: '필수 필드 누락' }, { status: 400 });
    }

    const supabase = createSupabaseAdmin();
    const { data, error } = await supabase
      .from('bgm_generations')
      .insert({
        user_id: user.id,
        prompt,
        audio_url: audioUrl,
        duration_seconds: duration,
        variant_index: variantIndex,
        num_variants: numVariants,
        source_type: sourceType,
        source_data: sourceData,
        file_type: fileType,
        is_liked: isLiked,
      })
      .select()
      .single();

    if (error) {
      console.error('BGMs save error:', error);
      return NextResponse.json({ success: false, error: 'DB 저장 오류' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('POST /api/bgm/history error:', error);
    return NextResponse.json({ success: false, error: '서버 오류' }, { status: 500 });
  }
}

// 목록 조회
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromToken(request);
    if (!user) return NextResponse.json({ success: false, error: '인증이 필요합니다.' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '30');
    const offset = parseInt(searchParams.get('offset') || '0');

    const supabase = createSupabaseAdmin();
    const { data, error, count } = await supabase
      .from('bgm_generations')
      .select('id, prompt, audio_url, duration_seconds, variant_index, num_variants, is_liked, created_at', { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('BGMs list error:', error);
      return NextResponse.json({ success: false, error: 'DB 조회 오류' }, { status: 500 });
    }

    const transformed = (data || []).map((r) => ({
      id: r.id,
      prompt: r.prompt,
      audioUrl: r.audio_url,
      duration: r.duration_seconds,
      createdAt: r.created_at,
      status: 'completed',
      variantIndex: r.variant_index,
      isLiked: r.is_liked,
    }));

    return NextResponse.json({ success: true, data: transformed, total: count || 0, limit, offset });
  } catch (error) {
    console.error('GET /api/bgm/history error:', error);
    return NextResponse.json({ success: false, error: '서버 오류' }, { status: 500 });
  }
}

// 삭제
export async function DELETE(request: NextRequest) {
  try {
    const user = await getUserFromToken(request);
    if (!user) return NextResponse.json({ success: false, error: '인증이 필요합니다.' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ success: false, error: 'id가 필요합니다.' }, { status: 400 });

    const supabase = createSupabaseAdmin();
    const { data, error } = await supabase
      .from('bgm_generations')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('BGMs delete error:', error);
      return NextResponse.json({ success: false, error: 'DB 삭제 오류' }, { status: 500 });
    }

    return NextResponse.json({ success: true, deletedId: data?.id });
  } catch (error) {
    console.error('DELETE /api/bgm/history error:', error);
    return NextResponse.json({ success: false, error: '서버 오류' }, { status: 500 });
  }
}

// 좋아요 토글 등 일부 필드 업데이트
export async function PATCH(request: NextRequest) {
  try {
    const user = await getUserFromToken(request);
    if (!user) return NextResponse.json({ success: false, error: '인증이 필요합니다.' }, { status: 401 });

    const body = await request.json();
    const { id, isLiked } = body as { id?: string; isLiked?: boolean };
    if (!id || typeof isLiked !== 'boolean') {
      return NextResponse.json({ success: false, error: 'id와 isLiked(boolean)가 필요합니다.' }, { status: 400 });
    }

    const supabase = createSupabaseAdmin();
    const { data, error } = await supabase
      .from('bgm_generations')
      .update({ is_liked: isLiked })
      .eq('id', id)
      .eq('user_id', user.id)
      .select('id, is_liked')
      .single();

    if (error) {
      console.error('BGMs like update error:', error);
      return NextResponse.json({ success: false, error: 'DB 업데이트 오류' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('PATCH /api/bgm/history error:', error);
    return NextResponse.json({ success: false, error: '서버 오류' }, { status: 500 });
  }
}


