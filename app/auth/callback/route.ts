import { NextResponse, type NextRequest } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const { searchParams, origin } = requestUrl;
  const code = searchParams.get('code');
  
  // 간단한 로깅만 유지
  console.log('콜백 처리 시작 - 코드 파라미터:', code ? '있음' : '없음');
  
  // 코드가 없으면 오류 페이지로 리다이렉션
  if (!code) {
    console.error('인증 코드 없음 - 오류 페이지로 리다이렉션');
    return NextResponse.redirect(`${origin}/auth/auth-error?reason=missing_code`);
  }
  
  try {
    // 세션 교환 시도
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (error) {
      console.error('인증 코드 교환 실패:', error.message);
      return NextResponse.redirect(`${origin}/auth/auth-error?reason=${encodeURIComponent(error.message)}`);
    }
    
    console.log('인증 성공 - 대시보드로 리다이렉션');
    return NextResponse.redirect(`${origin}/analytics`);
  } catch (error) {
    console.error('콜백 처리 중 예외 발생:', error);
    return NextResponse.redirect(`${origin}/auth/auth-error?reason=internal_error`);
  }
}