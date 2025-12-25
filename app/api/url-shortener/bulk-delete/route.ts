import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createRouteHandlerClient();

    // 사용자 인증 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    const body = await request.json();
    const { ids } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: '삭제할 ID 목록이 필요합니다.' }, { status: 400 });
    }

    // 일괄 삭제 (소유권 확인 포함)
    const { error, count } = await supabase
      .from('shortened_urls')
      .delete({ count: 'exact' })
      .in('id', ids)
      .eq('user_id', user.id);

    if (error) {
      console.error('일괄 삭제 오류:', error);
      return NextResponse.json({ error: '일괄 삭제에 실패했습니다.' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `${count || 0}개의 URL이 삭제되었습니다.`,
      deletedCount: count || 0
    });

  } catch (error) {
    console.error('일괄 삭제 오류:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

