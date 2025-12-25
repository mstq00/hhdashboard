import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// API 라우트용 클라이언트 (쿠키 기반 인증)
export async function createRouteHandlerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // 쿠키 설정 실패 시 무시 (읽기 전용 환경)
          }
        },
      },
    }
  );
}

