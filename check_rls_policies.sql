-- RLS 정책 확인 쿼리
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'shortened_urls'
ORDER BY policyname;

-- 공개 조회 테스트 (인증 없이)
-- 이 쿼리가 결과를 반환하면 RLS 정책이 제대로 작동하는 것입니다
SELECT 
  id,
  short_code,
  original_url,
  is_active,
  expires_at
FROM shortened_urls
WHERE is_active = true 
  AND (expires_at IS NULL OR expires_at > NOW())
LIMIT 5;

