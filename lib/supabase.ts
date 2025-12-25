import { createClient } from '@supabase/supabase-js';
import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// 기본 클라이언트 (클라이언트 사이드용) - SSR 호환을 위해 createBrowserClient 사용 추천
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);

// 서비스 롤 클라이언트 (서버 사이드용)
export function createServiceClient() {
  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true
    },
    db: {
      schema: 'public'
    },
    global: {
      headers: {
        'Content-Type': 'application/json'
      }
    },
    realtime: {
      timeout: 20000
    }
  });
}

// 타입 정의 (임시로 any 사용)
export type Database = any;
export type Tables = any;
export type Enums = any; 