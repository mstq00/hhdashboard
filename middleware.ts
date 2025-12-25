import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// URL 단축 코드 감지 및 리디렉션 처리
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value));
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // 세션 새로고침 시도
  await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const hostname = request.headers.get('host') || '';

  const isHej2Domain = hostname === 'hej2.xyz' || hostname === 'www.hej2.xyz';

  // hej2.xyz 도메인에서 루트 경로 접근 시 URL 단축기 페이지로 리다이렉트
  if (pathname === '/' && isHej2Domain) {
    return NextResponse.redirect(new URL('/url-shortener', request.url), { status: 302 });
  }

  // 정적 파일, API 라우트, Next.js 내부 경로 제외
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/static') ||
    pathname.includes('.') || // 파일 확장자가 있는 경우
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/sales') ||
    pathname.startsWith('/upload') ||
    pathname.startsWith('/products') ||
    pathname.startsWith('/goals') ||
    pathname.startsWith('/orders') ||
    pathname.startsWith('/lineart') ||
    pathname.startsWith('/suno') ||
    pathname.startsWith('/thumbnail') ||
    pathname.startsWith('/url-shortener') ||
    pathname.startsWith('/bgm')
  ) {
    return NextResponse.next();
  }

  // 로컬 개발 환경에서도 테스트 가능하도록 localhost 허용 (개발용)
  const isLocalDev = hostname.includes('localhost') || hostname.includes('127.0.0.1');

  // hej2.xyz 도메인에서만 루트 레벨 단축 코드 처리
  // URL 단축 코드 패턴 체크 (3-50자의 영문, 숫자, 하이픈, 언더스코어)
  if ((isHej2Domain || isLocalDev) && pathname !== '/') {
    const shortCodePattern = /^\/([a-zA-Z0-9_-]{3,50})$/;
    const match = pathname.match(shortCodePattern);

    if (match) {
      const shortCode = match[1];
      console.log(`[Middleware] 단축 코드 감지: ${shortCode} (도메인: ${hostname})`);

      try {
        // Supabase에서 짧은 코드 조회
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseAnonKey) {
          console.error('[Middleware] Supabase 환경 변수가 설정되지 않음');
          console.error('[Middleware] NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '설정됨' : '없음');
          console.error('[Middleware] NEXT_PUBLIC_SUPABASE_ANON_KEY:', supabaseAnonKey ? '설정됨' : '없음');
          return NextResponse.next();
        }

        const response = await fetch(
          `${supabaseUrl}/rest/v1/shortened_urls?short_code=eq.${shortCode}&select=original_url,is_active,expires_at,id,click_count`,
          {
            headers: {
              'apikey': supabaseAnonKey,
              'Authorization': `Bearer ${supabaseAnonKey}`,
              'Content-Type': 'application/json',
            },
          }
        );

        console.log(`[Middleware] Supabase 응답 상태: ${response.status}`);

        if (response.ok) {
          const data = await response.json();
          console.log(`[Middleware] Supabase 응답 데이터:`, JSON.stringify(data));

          if (data && data.length > 0) {
            const urlData = data[0];
            console.log(`[Middleware] URL 데이터:`, JSON.stringify(urlData));

            // 비활성화된 URL 체크
            if (!urlData.is_active) {
              console.log(`[Middleware] 비활성화된 URL: ${shortCode}`);
              return NextResponse.next(); // 404로 처리
            }

            // 만료 체크
            if (urlData.expires_at) {
              const expiryDate = new Date(urlData.expires_at);
              if (expiryDate < new Date()) {
                console.log(`[Middleware] 만료된 URL: ${shortCode}`);
                // 만료 페이지로 리디렉션
                return NextResponse.redirect(new URL(`/expired/${shortCode}`, request.url));
              }
            }

            // 클릭수 증가 (비동기로 처리하고 기다리지 않음)
            fetch(`${supabaseUrl}/rest/v1/shortened_urls?id=eq.${urlData.id}`, {
              method: 'PATCH',
              headers: {
                'apikey': supabaseAnonKey,
                'Authorization': `Bearer ${supabaseAnonKey}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=minimal',
              },
              body: JSON.stringify({
                click_count: (urlData.click_count || 0) + 1,
              }),
            }).catch((err) => {
              console.error('[Middleware] 클릭수 업데이트 실패:', err);
            });

            // 클릭 로그 저장 (비동기)
            const ipAddress = request.headers.get('x-forwarded-for') ||
              request.headers.get('x-real-ip') ||
              'unknown';
            const userAgent = request.headers.get('user-agent') || '';
            const referer = request.headers.get('referer') || '';

            fetch(`${supabaseUrl}/rest/v1/url_clicks`, {
              method: 'POST',
              headers: {
                'apikey': supabaseAnonKey,
                'Authorization': `Bearer ${supabaseAnonKey}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=minimal',
              },
              body: JSON.stringify({
                shortened_url_id: urlData.id,
                ip_address: ipAddress.split(',')[0].trim(),
                user_agent: userAgent.substring(0, 500),
                referer: referer.substring(0, 500),
              }),
            }).catch((err) => {
              console.error('[Middleware] 클릭 로그 저장 실패:', err);
            });

            console.log(`[Middleware] 리다이렉트: ${shortCode} -> ${urlData.original_url}`);
            // 원본 URL로 리디렉션 (301 Permanent Redirect)
            return NextResponse.redirect(urlData.original_url, { status: 301 });
          } else {
            console.log(`[Middleware] URL을 찾을 수 없음: ${shortCode}`);
          }
        } else {
          console.error(`[Middleware] Supabase API 오류: ${response.status} ${response.statusText}`);
          const errorText = await response.text().catch(() => '');
          console.error(`[Middleware] 오류 상세:`, errorText);
          console.error(`[Middleware] 요청 URL: ${supabaseUrl}/rest/v1/shortened_urls?short_code=eq.${shortCode}`);
          console.error(`[Middleware] 사용된 헤더:`, {
            apikey: supabaseAnonKey ? '설정됨' : '없음',
            Authorization: supabaseAnonKey ? '설정됨' : '없음',
          });
          // RLS 정책 오류인 경우에도 404로 처리
          return NextResponse.next();
        }
      } catch (error) {
        console.error('[Middleware] 오류 발생:', error);
        if (error instanceof Error) {
          console.error('[Middleware] 오류 메시지:', error.message);
          console.error('[Middleware] 오류 스택:', error.stack);
        }
      }
    }
  }

  // 매칭되지 않으면 정상 처리
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};

