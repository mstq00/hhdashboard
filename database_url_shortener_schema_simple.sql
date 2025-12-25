-- URL Shortener Schema (Simple Version)
-- Supabase SQL Editor에서 실행하세요

-- 1. 테이블 생성
CREATE TABLE IF NOT EXISTS shortened_urls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  short_code VARCHAR(50) UNIQUE NOT NULL,
  original_url TEXT NOT NULL,
  title VARCHAR(255),
  description TEXT,
  user_id UUID,
  click_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  
  CONSTRAINT short_code_length CHECK (char_length(short_code) >= 3)
);

-- 2. 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_shortened_urls_short_code ON shortened_urls(short_code);
CREATE INDEX IF NOT EXISTS idx_shortened_urls_user_id ON shortened_urls(user_id);
CREATE INDEX IF NOT EXISTS idx_shortened_urls_created_at ON shortened_urls(created_at DESC);

-- 3. RLS (Row Level Security) 비활성화 (간단하게)
ALTER TABLE shortened_urls DISABLE ROW LEVEL SECURITY;

-- 만약 RLS를 사용하려면 아래 주석 해제:
-- ALTER TABLE shortened_urls ENABLE ROW LEVEL SECURITY;
-- 
-- CREATE POLICY "Users can manage their own URLs"
--   ON shortened_urls
--   FOR ALL
--   USING (auth.uid() = user_id)
--   WITH CHECK (auth.uid() = user_id);

-- 4. 클릭 로그 테이블 (선택적)
CREATE TABLE IF NOT EXISTS url_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shortened_url_id UUID REFERENCES shortened_urls(id) ON DELETE CASCADE,
  clicked_at TIMESTAMPTZ DEFAULT NOW(),
  ip_address VARCHAR(45),
  user_agent TEXT,
  referer TEXT
);

CREATE INDEX IF NOT EXISTS idx_url_clicks_shortened_url_id ON url_clicks(shortened_url_id);
CREATE INDEX IF NOT EXISTS idx_url_clicks_clicked_at ON url_clicks(clicked_at DESC);

ALTER TABLE url_clicks DISABLE ROW LEVEL SECURITY;

COMMENT ON TABLE shortened_urls IS 'URL 단축 서비스 메인 테이블';
COMMENT ON TABLE url_clicks IS 'URL 클릭 로그 테이블';

