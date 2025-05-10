import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';

// 환경변수에서 Supabase URL과 키 가져오기
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// URL 또는 키가 없으면 오류 출력
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase URL 또는 Anon Key가 환경변수에 설정되지 않았습니다.');
}

// Supabase 클라이언트 생성 - 필수 설정만 포함
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,  // 세션 유지
    autoRefreshToken: true // 토큰 자동 갱신
  }
});

// 타입 정의를 위한 함수 추가
export type Tables<T extends keyof Database['public']['Tables']> = 
  Database['public']['Tables'][T]['Row'];
export type Enums<T extends keyof Database['public']['Enums']> = 
  Database['public']['Enums'][T]; 