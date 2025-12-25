import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

// 단축 URL 리다이렉트 테스트 API
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const shortCode = searchParams.get('code');

    if (!shortCode) {
      return NextResponse.json(
        { error: 'short_code 파라미터가 필요합니다.' },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // URL 조회
    const { data: urlData, error } = await supabase
      .from('shortened_urls')
      .select('id, short_code, original_url, is_active, expires_at, click_count')
      .eq('short_code', shortCode)
      .single();

    if (error) {
      console.error('URL 조회 오류:', error);
      return NextResponse.json(
        {
          error: 'URL 조회 실패',
          details: error.message,
          code: error.code,
        },
        { status: 500 }
      );
    }

    if (!urlData) {
      return NextResponse.json(
        {
          error: 'URL을 찾을 수 없습니다',
          shortCode,
        },
        { status: 404 }
      );
    }

    // RLS 정책 테스트 (anon key로 조회 시도)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    let rlsTestResult = null;
    if (supabaseUrl && supabaseAnonKey) {
      try {
        const rlsResponse = await fetch(
          `${supabaseUrl}/rest/v1/shortened_urls?short_code=eq.${shortCode}&select=original_url,is_active,expires_at,id`,
          {
            headers: {
              'apikey': supabaseAnonKey,
              'Authorization': `Bearer ${supabaseAnonKey}`,
              'Content-Type': 'application/json',
            },
          }
        );

        rlsTestResult = {
          status: rlsResponse.status,
          ok: rlsResponse.ok,
          data: rlsResponse.ok ? await rlsResponse.json() : await rlsResponse.text(),
        };
      } catch (rlsError: any) {
        rlsTestResult = {
          error: rlsError.message,
        };
      }
    }

    return NextResponse.json({
      success: true,
      urlData,
      rlsTest: rlsTestResult,
      checks: {
        isActive: urlData.is_active,
        isExpired: urlData.expires_at
          ? new Date(urlData.expires_at) < new Date()
          : false,
        canRedirect: urlData.is_active && (!urlData.expires_at || new Date(urlData.expires_at) > new Date()),
      },
      environment: {
        hasSupabaseUrl: !!supabaseUrl,
        hasSupabaseAnonKey: !!supabaseAnonKey,
      },
    });
  } catch (error: any) {
    console.error('테스트 오류:', error);
    return NextResponse.json(
      {
        error: '서버 오류',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

