-- URL Shortener Schema
-- 단축 URL 테이블 생성

CREATE TABLE IF NOT EXISTS shortened_urls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  short_code VARCHAR(50) UNIQUE NOT NULL,
  original_url TEXT NOT NULL,
  title VARCHAR(255),
  description TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  click_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  
  -- 인덱스
  CONSTRAINT short_code_length CHECK (char_length(short_code) >= 3)
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_shortened_urls_short_code ON shortened_urls(short_code);
CREATE INDEX IF NOT EXISTS idx_shortened_urls_user_id ON shortened_urls(user_id);
CREATE INDEX IF NOT EXISTS idx_shortened_urls_created_at ON shortened_urls(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_shortened_urls_click_count ON shortened_urls(click_count DESC);
CREATE INDEX IF NOT EXISTS idx_shortened_urls_is_active ON shortened_urls(is_active);

-- 클릭 로그 테이블 (선택적 - 상세 통계를 원할 경우)
CREATE TABLE IF NOT EXISTS url_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shortened_url_id UUID REFERENCES shortened_urls(id) ON DELETE CASCADE,
  clicked_at TIMESTAMPTZ DEFAULT NOW(),
  ip_address VARCHAR(45),
  user_agent TEXT,
  referer TEXT
);

-- 클릭 로그 인덱스
CREATE INDEX IF NOT EXISTS idx_url_clicks_shortened_url_id ON url_clicks(shortened_url_id);
CREATE INDEX IF NOT EXISTS idx_url_clicks_clicked_at ON url_clicks(clicked_at DESC);

-- updated_at 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_shortened_urls_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_shortened_urls_updated_at
  BEFORE UPDATE ON shortened_urls
  FOR EACH ROW
  EXECUTE FUNCTION update_shortened_urls_updated_at();

-- Row Level Security (RLS) 설정
ALTER TABLE shortened_urls ENABLE ROW LEVEL SECURITY;
ALTER TABLE url_clicks ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 자신의 URL을 볼 수 있음
CREATE POLICY "Users can view their own shortened URLs"
  ON shortened_urls FOR SELECT
  USING (auth.uid() = user_id);

-- 모든 사용자가 자신의 URL을 생성할 수 있음
CREATE POLICY "Users can create their own shortened URLs"
  ON shortened_urls FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 모든 사용자가 자신의 URL을 수정할 수 있음
CREATE POLICY "Users can update their own shortened URLs"
  ON shortened_urls FOR UPDATE
  USING (auth.uid() = user_id);

-- 모든 사용자가 자신의 URL을 삭제할 수 있음
CREATE POLICY "Users can delete their own shortened URLs"
  ON shortened_urls FOR DELETE
  USING (auth.uid() = user_id);

-- 클릭 로그는 모든 사용자가 조회 가능 (자신의 URL에 대한 것만)
CREATE POLICY "Users can view clicks on their URLs"
  ON url_clicks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM shortened_urls 
      WHERE shortened_urls.id = url_clicks.shortened_url_id 
      AND shortened_urls.user_id = auth.uid()
    )
  );

-- 클릭 로그 삽입은 서비스 역할만 가능 (API에서 처리)
CREATE POLICY "Service role can insert clicks"
  ON url_clicks FOR INSERT
  WITH CHECK (true);

COMMENT ON TABLE shortened_urls IS 'URL 단축 서비스 메인 테이블';
COMMENT ON TABLE url_clicks IS 'URL 클릭 로그 테이블 (상세 통계용)';

