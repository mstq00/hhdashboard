-- URL 단축기 RLS 정책 수정
-- 공개적으로 단축 URL을 조회할 수 있도록 정책 추가

-- 기존 정책 삭제 후 재생성
DROP POLICY IF EXISTS "Users can view their own shortened URLs" ON shortened_urls;

-- 새로운 정책: 사용자는 자신의 모든 URL을 볼 수 있고, 공개적으로 활성화된 URL도 조회 가능
CREATE POLICY "Users can view their own shortened URLs"
  ON shortened_urls FOR SELECT
  USING (
    auth.uid() = user_id 
    OR (is_active = true AND (expires_at IS NULL OR expires_at > NOW()))
  );

-- 공개 조회 정책 (인증되지 않은 사용자도 활성화된 URL 조회 가능)
CREATE POLICY "Public can view active shortened URLs"
  ON shortened_urls FOR SELECT
  USING (
    is_active = true 
    AND (expires_at IS NULL OR expires_at > NOW())
  );

