import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createRouteHandlerClient();

    // 사용자 인증 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const sortBy = searchParams.get('sortBy') || 'created_at';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const search = searchParams.get('search') || '';
    const filter = searchParams.get('filter') || 'all'; // all, active, inactive, expired

    const offset = (page - 1) * limit;

    // 기본 쿼리 (특정 사용자 URL만 대상)
    let query = supabase
      .from('shortened_urls')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id);

    // 검색 조건 추가
    if (search) {
      query = query.or(`short_code.ilike.%${search}%,original_url.ilike.%${search}%,title.ilike.%${search}%`);
    }

    // 필터 조건 추가
    const now = new Date().toISOString();
    if (filter === 'active') {
      query = query.eq('is_active', true).or(`expires_at.is.null,expires_at.gte.${now}`);
    } else if (filter === 'inactive') {
      query = query.eq('is_active', false);
    } else if (filter === 'expired') {
      query = query.lt('expires_at', now);
    }

    // 정렬
    query = query.order(sortBy, { ascending: sortOrder === 'asc' });

    // 페이지네이션
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('URL 목록 조회 오류:', error);
      return NextResponse.json({ error: 'URL 목록 조회에 실패했습니다.' }, { status: 500 });
    }

    // 각 URL의 실제 클릭 수를 url_clicks 테이블에서 집계
    const urlIds = data?.map(url => url.id) || [];
    const clickCounts: { [key: string]: number } = {};

    if (urlIds.length > 0) {
      // url_clicks 테이블에서 각 URL의 클릭 수 집계
      const { data: clicksData, error: clicksError } = await supabase
        .from('url_clicks')
        .select('shortened_url_id')
        .in('shortened_url_id', urlIds);

      if (!clicksError && clicksData) {
        // 각 URL ID별로 클릭 수 카운트
        clicksData.forEach(click => {
          const urlId = click.shortened_url_id;
          clickCounts[urlId] = (clickCounts[urlId] || 0) + 1;
        });
      }
    }

    // 짧은 URL 추가 - 기본 도메인 hej2.xyz, hej2.xyz/{code} 형식
    const baseUrl = process.env.NEXT_PUBLIC_SHORT_BASE_URL || 'hej2.xyz';
    const protocol = baseUrl.includes('localhost') ? 'http' : 'https';

    const dataWithShortUrl = data?.map(item => {
      // 실제 클릭 수가 있으면 사용, 없으면 click_count 사용
      const actualClickCount = clickCounts[item.id] || 0;
      const displayClickCount = actualClickCount > 0 ? actualClickCount : (item.click_count || 0);

      return {
        ...item,
        click_count: displayClickCount, // 실제 클릭 수로 업데이트
        short_url: `${protocol}://${baseUrl}/${item.short_code}`,
        is_expired: item.expires_at ? new Date(item.expires_at) < new Date() : false
      };
    });

    return NextResponse.json({
      success: true,
      data: dataWithShortUrl,
      pagination: {
        total: count || 0,
        page,
        limit,
        totalPages: Math.ceil((count || 0) / limit)
      }
    });

  } catch (error) {
    console.error('URL 목록 조회 오류:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

