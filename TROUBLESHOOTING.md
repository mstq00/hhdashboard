# URL 단축기 404 오류 해결 가이드

## 현재 상황
- 데이터베이스에 `A51Kzz` 코드가 존재함
- `https://hej2.xyz/A51Kzz` 접속 시 404 오류 발생

## 진단 단계

### 1. RLS 정책 확인

Supabase SQL Editor에서 다음 쿼리 실행:

```sql
-- RLS 정책 목록 확인
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'shortened_urls';

-- 공개 조회 테스트 (인증 없이)
SELECT 
  id,
  short_code,
  original_url,
  is_active,
  expires_at
FROM shortened_urls
WHERE short_code = 'A51Kzz';
```

**예상 결과**: 
- `Public can view active shortened URLs` 정책이 있어야 함
- 두 번째 쿼리가 결과를 반환해야 함

### 2. 데이터 상태 확인

Supabase Table Editor에서 `shortened_urls` 테이블을 열고:
- `A51Kzz` 행의 `is_active` 컬럼이 `true`인지 확인
- `expires_at`이 `NULL`이거나 미래 날짜인지 확인

### 3. 테스트 API로 확인

브라우저에서 다음 URL 접속:
```
https://hej2.xyz/api/url-shortener/test-redirect?code=A51Kzz
```

**예상 결과**:
```json
{
  "success": true,
  "urlData": { ... },
  "rlsTest": {
    "status": 200,
    "ok": true,
    "data": [ ... ]
  },
  "checks": {
    "isActive": true,
    "isExpired": false,
    "canRedirect": true
  }
}
```

### 4. Vercel 로그 확인

1. Vercel 대시보드 → 프로젝트 선택
2. **Deployments** → 최신 배포 클릭
3. **Functions** 탭 → `middleware` 로그 확인

**확인할 내용**:
- `[Middleware] 단축 코드 감지: A51Kzz` 로그가 있는지
- `[Middleware] Supabase 응답 상태: 200` 인지
- `[Middleware] Supabase API 오류` 메시지가 있는지

### 5. 배포 확인

**중요**: middleware 변경사항은 반드시 배포해야 적용됩니다!

```bash
# 로컬에서 변경사항 커밋
git add .
git commit -m "Fix middleware logging"
git push

# 또는 Vercel에서 자동 배포 확인
```

## 가능한 원인 및 해결 방법

### 원인 1: RLS 정책 미적용
**증상**: 테스트 API에서 `rlsTest.status`가 401 또는 403
**해결**: `fix_url_shortener_rls.sql` 파일의 SQL을 Supabase에서 실행

### 원인 2: is_active가 false
**증상**: 데이터베이스에서 `is_active = false`
**해결**: Supabase Table Editor에서 `is_active`를 `true`로 변경

### 원인 3: 배포 미반영
**증상**: Vercel 로그에 middleware 로그가 없음
**해결**: 변경사항을 커밋하고 푸시하여 재배포

### 원인 4: 환경 변수 미설정
**증상**: Vercel 로그에 "Supabase 환경 변수가 설정되지 않음"
**해결**: Vercel 대시보드 → Settings → Environment Variables에서 확인

### 원인 5: matcher 설정 문제
**증상**: middleware가 전혀 실행되지 않음
**해결**: `middleware.ts`의 `config.matcher` 확인

## 즉시 테스트 방법

1. **테스트 API 호출**:
   ```
   https://hej2.xyz/api/url-shortener/test-redirect?code=A51Kzz
   ```

2. **Vercel 로그 확인**:
   - Functions 탭에서 middleware 실행 여부 확인
   - 오류 메시지 확인

3. **RLS 정책 재적용**:
   ```sql
   DROP POLICY IF EXISTS "Public can view active shortened URLs" ON shortened_urls;
   
   CREATE POLICY "Public can view active shortened URLs"
     ON shortened_urls FOR SELECT
     USING (
       is_active = true 
       AND (expires_at IS NULL OR expires_at > NOW())
     );
   ```

