import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createServiceClient();
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

    // Calculate date 30 days ago for trend
    const date30DaysAgo = new Date();
    date30DaysAgo.setDate(date30DaysAgo.getDate() - 30);
    const date30DaysAgoStr = date30DaysAgo.toISOString();

    // 1. Fetch recent logs (Limit 20)
    const { data: recentLogs } = await supabase
      .from('url_clicks')
      .select('*')
      .eq('shortened_url_id', id)
      .order('clicked_at', { ascending: false })
      .limit(20);

    // 2. Fetch clicks for trend (Last 30 days)
    // We fetch just the timestamps to minimize data transfer, or count locally.
    const { data: trendData } = await supabase
      .from('url_clicks')
      .select('clicked_at')
      .eq('shortened_url_id', id)
      .gte('clicked_at', date30DaysAgoStr);

    // 3. Aggregate Stats
    const totalClicks = await supabase
      .from('url_clicks')
      .select('*', { count: 'exact', head: true })
      .eq('shortened_url_id', id)
      .then(res => res.count || 0);

    const todayClicks = await supabase
      .from('url_clicks')
      .select('*', { count: 'exact', head: true })
      .eq('shortened_url_id', id)
      .gte('clicked_at', startOfDay)
      .then(res => res.count || 0);

    const weekClicks = await supabase
      .from('url_clicks')
      .select('*', { count: 'exact', head: true })
      .eq('shortened_url_id', id)
      .gte('clicked_at', new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .then(res => res.count || 0);

    // Process Trend Data
    // Group by date (YYYY-MM-DD)
    const dailyClicks: Record<string, number> = {};
    trendData?.forEach(item => {
      const date = item.clicked_at.split('T')[0];
      dailyClicks[date] = (dailyClicks[date] || 0) + 1;
    });

    // Fill in missing days for the last 7 days specifically (or 30) for the chart
    const last7Days: { date: string; count: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      last7Days.push({
        date: dateStr,
        count: dailyClicks[dateStr] || 0
      });
    }

    return NextResponse.json({
      success: true,
      stats: {
        totalClicks,
        todayClicks,
        weekClicks,
        last7Days, // For Chart
        recentLogs: recentLogs || []
      }
    });

  } catch (error) {
    console.error('URL detail stats error:', error);
    return NextResponse.json({ error: 'Failed to fetch detail stats' }, { status: 500 });
  }
}
