import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase-server';

// URL 수정
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const supabase = await createRouteHandlerClient();

    // 사용자 인증 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    // Next.js 15에서는 params가 Promise일 수 있음
    const resolvedParams = await Promise.resolve(params);
    const { id } = resolvedParams;
    const body = await request.json();
    const { title, description, isActive, expiresIn } = body;

    // URL 조회 (사용자 소유 확인)
    const { data: existing, error: fetchError } = await supabase
      .from('shortened_urls')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !existing) {
      console.error('URL 조회 오류 또는 권한 없음:', fetchError);
      return NextResponse.json({
        error: 'URL을 찾을 수 없거나 수정 권한이 없습니다.'
      }, { status: 404 });
    }

    // 만료 일시 계산
    let expiresAt: string | null = existing.expires_at;
    if (expiresIn !== undefined) {
      if (expiresIn === null || expiresIn === 0) {
        expiresAt = null;
      } else {
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + expiresIn);
        expiresAt = expiryDate.toISOString();
      }
    }

    // 업데이트
    const { data, error } = await supabase
      .from('shortened_urls')
      .update({
        title: title !== undefined ? title : existing.title,
        description: description !== undefined ? description : existing.description,
        is_active: isActive !== undefined ? isActive : existing.is_active,
        expires_at: expiresAt
      })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('URL 수정 오류:', error);
      return NextResponse.json({ error: 'URL 수정에 실패했습니다.' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data
    });

  } catch (error) {
    console.error('URL 수정 오류:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

// URL 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const supabase = await createRouteHandlerClient();

    // 사용자 인증 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    // Next.js 15에서는 params가 Promise일 수 있음
    const resolvedParams = await Promise.resolve(params);
    const { id } = resolvedParams;

    // 삭제 (소유권 확인 포함)
    const { error } = await supabase
      .from('shortened_urls')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('URL 삭제 오류:', error);
      return NextResponse.json({ error: 'URL 삭제에 실패했습니다.' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'URL이 삭제되었습니다.'
    });

  } catch (error) {
    console.error('URL 삭제 오류:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

