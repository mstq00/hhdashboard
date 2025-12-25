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

    // 해당 사용자의 URL 목록 조회
    const { data: allUrls, error: allError } = await supabase
      .from('shortened_urls')
      .select('id, click_count, is_active, expires_at, created_at')
      .eq('user_id', user.id);

    if (allError) {
      console.error('통계 조회 오류:', allError);
      return NextResponse.json({ error: '통계 조회에 실패했습니다.' }, { status: 500 });
    }

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // 통계 계산
    const totalUrls = allUrls?.length || 0;

    // 해당 사용자의 URL ID 목록 추출
    const userUrlIds = allUrls?.map(url => url.id) || [];

    // 전체 클릭수는 url_clicks 테이블에서 해당 사용자의 URL들에 대한 클릭 로그 카운트
    let totalClicks = 0;
    let todayClickCount = 0;
    let clickTrend: { date: string, count: number }[] = [];

    if (userUrlIds.length > 0) {
      // 해당 사용자의 URL들에 대한 전체 클릭 수
      const { count: clicksCount, error: countError } = await supabase
        .from('url_clicks')
        .select('*', { count: 'exact', head: true })
        .in('shortened_url_id', userUrlIds);

      const totalClicksFromLogs = clicksCount || 0;
      const totalClicksFromCount = allUrls?.reduce((sum, url) => sum + (url.click_count || 0), 0) || 0;
      totalClicks = totalClicksFromLogs > 0 ? totalClicksFromLogs : totalClicksFromCount;

      // 오늘의 클릭수
      const { count: todayCount } = await supabase
        .from('url_clicks')
        .select('*', { count: 'exact', head: true })
        .in('shortened_url_id', userUrlIds)
        .gte('clicked_at', todayStart.toISOString());

      todayClickCount = todayCount || 0;

      // 최근 7일 클릭 추이
      const sevenDaysAgo = new Date(now);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data: recentClicks, error: recentError } = await supabase
        .from('url_clicks')
        .select('clicked_at')
        .in('shortened_url_id', userUrlIds)
        .gte('clicked_at', sevenDaysAgo.toISOString())
        .order('clicked_at', { ascending: true });

      if (recentError) {
        console.error('최근 클릭 조회 오류:', recentError);
      } else {
        // 일별로 그룹화
        const clicksByDay: { [key: string]: number } = {};
        recentClicks?.forEach(click => {
          const date = new Date(click.clicked_at).toLocaleDateString('ko-KR');
          clicksByDay[date] = (clicksByDay[date] || 0) + 1;
        });

        clickTrend = Object.entries(clicksByDay).map(([date, count]) => ({
          date,
          count
        }));
      }
    }

    const activeUrls = allUrls?.filter(url => {
      if (!url.is_active) return false;
      if (!url.expires_at) return true;
      return new Date(url.expires_at) > now;
    }).length || 0;

    const expiredUrls = allUrls?.filter(url => {
      if (!url.expires_at) return false;
      return new Date(url.expires_at) <= now;
    }).length || 0;

    const inactiveUrls = allUrls?.filter(url => !url.is_active).length || 0;

    const todayUrls = allUrls?.filter(url => {
      return new Date(url.created_at) >= todayStart;
    }).length || 0;

    // 상위 5개 URL (해당 사용자 것만)
    const { data: topUrls, error: topError } = await supabase
      .from('shortened_urls')
      .select('id, short_code, title, original_url, click_count')
      .eq('user_id', user.id)
      .order('click_count', { ascending: false })
      .limit(5);

    if (topError) {
      console.error('상위 URL 조회 오류:', topError);
    }

    return NextResponse.json({
      success: true,
      data: {
        totalUrls,
        totalClicks,
        activeUrls,
        expiredUrls,
        inactiveUrls,
        todayUrls,
        todayClicks: todayClickCount,
        topUrls: topUrls || [],
        clickTrend
      }
    });

  } catch (error) {
    console.error('통계 조회 오류:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

