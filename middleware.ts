import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // URL 정보
  const url = new URL(request.url)
  const path = url.pathname
  
  // 쿼리 파라미터 확인
  const skipAuth = url.searchParams.get('skip_auth') === 'true'
  
  // 모든 쿠키 확인 (디버깅)
  console.log('모든 쿠키:', Array.from(request.cookies.getAll()).map(c => c.name).join(', '))
  
  // 인증 관련 경로는 미들웨어에서 제외
  if (path.startsWith('/auth/')) {
    return NextResponse.next()
  }
  
  // 직접 접근 파라미터가 있으면 인증 검사 건너뛰기 (임시 해결책)
  if (skipAuth && path.startsWith('/dashboard')) {
    console.log('직접 접근 모드: 인증 검사 건너뜀 -', path)
    return NextResponse.next()
  }
  
  // 다음 응답 객체 생성
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })
  
  try {
    // Supabase 클라이언트 생성
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => {
            return request.cookies.getAll().map(cookie => ({
              name: cookie.name,
              value: cookie.value,
            }))
          },
          setAll: (cookiesList) => {
            cookiesList.forEach(({ name, value, options }) => {
              response.cookies.set({
                name,
                value,
                ...options,
              })
            })
          },
        },
      }
    )

    // 세션 확인 (간소화된 로직)
    const { data: sessionData } = await supabase.auth.getSession()
    const isAuthenticated = !!sessionData?.session // 세션 존재 여부만으로 인증 상태 판단
    
    console.log('미들웨어 - 현재 경로:', path, '인증 상태:', isAuthenticated ? '인증됨' : '인증안됨')

    // 인증이 필요한 페이지 접근 시 로그인 필요
    if (path.startsWith('/dashboard') && !isAuthenticated) {
      console.log('인증 없이 대시보드 접근 시도 - 홈으로 리다이렉션')
      return NextResponse.redirect(new URL('/?auth_redirect=true', request.url))
    }

    // 이미 로그인된 사용자가 홈 페이지에 접근한 경우 대시보드로 리다이렉트
    if (path === '/' && isAuthenticated && !url.searchParams.get('auth_redirect')) {
      console.log('인증된 사용자의 홈 접근 - 대시보드로 리다이렉션')
      return NextResponse.redirect(new URL('/dashboard?skip_auth=true', request.url))
    }
  } catch (error) {
    console.error('미들웨어 오류:', error)
    // 오류 발생시에도 요청 계속 처리
  }

  return response
}

// 미들웨어를 적용할 경로 지정
export const config = {
  matcher: [
    '/',
    '/dashboard/:path*',
  ],
} 