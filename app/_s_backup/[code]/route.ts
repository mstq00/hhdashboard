import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    const supabase = createServiceClient();
    const { code } = params;

    // 짧은 코드로 URL 조회
    const { data, error } = await supabase
      .from('shortened_urls')
      .select('*')
      .eq('short_code', code)
      .single();

    if (error || !data) {
      // 404 페이지로 리디렉션
      return NextResponse.redirect(new URL('/404', request.url));
    }

    // 만료 확인
    if (data.expires_at) {
      const expiryDate = new Date(data.expires_at);
      const now = new Date();
      
      if (expiryDate < now) {
        // 만료된 URL - 만료 페이지로 리디렉션
        return NextResponse.redirect(new URL(`/s/${code}/expired`, request.url));
      }
    }

    // 비활성화 확인
    if (!data.is_active) {
      return NextResponse.redirect(new URL('/404', request.url));
    }

    // 클릭수 증가
    const { error: updateError } = await supabase
      .from('shortened_urls')
      .update({ click_count: (data.click_count || 0) + 1 })
      .eq('id', data.id);

    if (updateError) {
      console.error('클릭수 업데이트 오류:', updateError);
    }

    // 클릭 로그 저장 (선택적)
    const ipAddress = request.headers.get('x-forwarded-for') || 
                      request.headers.get('x-real-ip') || 
                      'unknown';
    const userAgent = request.headers.get('user-agent') || '';
    const referer = request.headers.get('referer') || '';

    await supabase.from('url_clicks').insert({
      shortened_url_id: data.id,
      ip_address: ipAddress.split(',')[0].trim(),
      user_agent: userAgent.substring(0, 500), // 길이 제한
      referer: referer.substring(0, 500)
    });

    // 원본 URL로 리디렉션
    return NextResponse.redirect(data.original_url, { status: 301 });

  } catch (error) {
    console.error('리디렉션 오류:', error);
    return NextResponse.redirect(new URL('/404', request.url));
  }
}

