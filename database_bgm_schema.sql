-- BGM Studio 데이터베이스 스키마
-- 생성일: 2025-01-19

-- BGM 생성 기록 테이블
CREATE TABLE IF NOT EXISTS bgm_generations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    prompt TEXT NOT NULL,
    audio_url TEXT NOT NULL,
    duration_seconds INTEGER NOT NULL,
    variant_index INTEGER DEFAULT 1,
    num_variants INTEGER DEFAULT 1,
    is_liked BOOLEAN DEFAULT FALSE,
    source_type VARCHAR(20) DEFAULT 'manual' CHECK (source_type IN ('youtube', 'file', 'manual')),
    source_data TEXT, -- YouTube URL 또는 파일명
    file_type VARCHAR(20), -- audio, image, video, text
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_bgm_generations_user_id ON bgm_generations(user_id);
CREATE INDEX IF NOT EXISTS idx_bgm_generations_created_at ON bgm_generations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bgm_generations_source_type ON bgm_generations(source_type);

-- RLS 정책 설정
ALTER TABLE bgm_generations ENABLE ROW LEVEL SECURITY;

-- 사용자는 자신의 BGM 기록만 조회/수정/삭제 가능
CREATE POLICY "Users can view own BGM generations" ON bgm_generations
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own BGM generations" ON bgm_generations
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own BGM generations" ON bgm_generations
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own BGM generations" ON bgm_generations
    FOR DELETE USING (auth.uid() = user_id);

-- 업데이트 트리거
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_bgm_generations_updated_at 
    BEFORE UPDATE ON bgm_generations 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 테이블 코멘트
COMMENT ON TABLE bgm_generations IS 'BGM Studio에서 생성된 음악 기록을 저장하는 테이블';
COMMENT ON COLUMN bgm_generations.prompt IS '음악 생성에 사용된 프롬프트';
COMMENT ON COLUMN bgm_generations.audio_url IS '생성된 오디오 파일의 URL 또는 base64 데이터';
COMMENT ON COLUMN bgm_generations.duration_seconds IS '음악 길이(초)';
COMMENT ON COLUMN bgm_generations.variant_index IS '변형 인덱스 (1 또는 2)';
COMMENT ON COLUMN bgm_generations.num_variants IS '생성된 총 변형 개수';
COMMENT ON COLUMN bgm_generations.is_liked IS '사용자가 좋아요 표시했는지 여부';
COMMENT ON COLUMN bgm_generations.source_type IS '음악 생성 소스 (youtube, file, manual)';
COMMENT ON COLUMN bgm_generations.source_data IS '소스 데이터 (YouTube URL, 파일명 등)';
COMMENT ON COLUMN bgm_generations.file_type IS '업로드된 파일 타입 (audio, image, video, text)';

