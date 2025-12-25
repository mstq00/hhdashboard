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

        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

        // 1. Total URLs & Active URLs (특정 사용자 필터링)
        const { count: totalUrls } = await supabase
            .from('shortened_urls')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id);

        const { count: activeUrls } = await supabase
            .from('shortened_urls')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('is_active', true);

        // 2. Today Created
        const { count: todayCreated } = await supabase
            .from('shortened_urls')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .gte('created_at', startOfDay);

        // 3. Expired URLs
        const { count: expiredUrls } = await supabase
            .from('shortened_urls')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .lt('expires_at', now.toISOString());

        // 4. Total Clicks & Today Clicks
        // 해당 사용자의 URL ID 목록 가져오기
        const { data: userUrls } = await supabase
            .from('shortened_urls')
            .select('id')
            .eq('user_id', user.id);

        const userUrlIds = userUrls?.map(u => u.id) || [];

        let totalClicks = 0;
        let todayClicks = 0;

        if (userUrlIds.length > 0) {
            const { count: totalClicksCount } = await supabase
                .from('url_clicks')
                .select('*', { count: 'exact', head: true })
                .in('shortened_url_id', userUrlIds);

            totalClicks = totalClicksCount || 0;

            const { count: todayClicksCount } = await supabase
                .from('url_clicks')
                .select('*', { count: 'exact', head: true })
                .in('shortened_url_id', userUrlIds)
                .gte('clicked_at', startOfDay);

            todayClicks = todayClicksCount || 0;
        }

        return NextResponse.json({
            success: true,
            stats: {
                totalUrls: totalUrls || 0,
                activeUrls: activeUrls || 0,
                todayCreated: todayCreated || 0,
                expiredUrls: expiredUrls || 0,
                totalClicks: totalClicks,
                todayClicks: todayClicks
            }
        });

    } catch (error) {
        console.error('Snapshot stats error:', error);
        return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
    }
}
