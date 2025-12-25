# hej2.xyz 도메인 연결 가이드

이 문서는 hej2.xyz 도메인을 URL 단축기 앱에 연결하는 방법을 설명합니다.

## 1. 환경 변수 설정

### 로컬 개발 환경

`.env.local` 파일에 다음 환경 변수를 추가하세요:

```env
# URL 단축기 도메인 설정
NEXT_PUBLIC_SHORT_BASE_URL=hej2.xyz
```

### Vercel 프로덕션 환경

1. Vercel 대시보드에 로그인
2. 프로젝트 선택
3. **Settings** → **Environment Variables** 이동
4. 다음 환경 변수 추가:
   - **Name**: `NEXT_PUBLIC_SHORT_BASE_URL`
   - **Value**: `hej2.xyz`
   - **Environment**: Production, Preview, Development 모두 선택

## 2. DNS 설정

도메인 제공업체(예: 가비아, 후이즈, Cloudflare 등)에서 **둘 중 하나의 방법**을 선택하여 설정하세요:

### 방법 1: DNS Records 설정 (도메인 제공업체에서 직접 설정)

Vercel 대시보드의 **DNS Records** 탭에서 표시된 레코드를 도메인 제공업체에 설정합니다.

#### A 레코드 사용 (권장)

Vercel에서 제공하는 최신 IP 주소를 사용:
```
Type: A
Name: @ (또는 비워두기, 루트 도메인)
Value: 216.198.79.1 (Vercel에서 표시된 IP 주소)
TTL: 3600 (또는 자동)
```

**참고**: Vercel은 IP 범위 확장을 진행 중이므로, Vercel 대시보드에 표시된 최신 IP 주소를 사용하세요.

### 방법 2: Vercel DNS 사용 (네임서버 변경)

도메인 제공업체에서 네임서버를 Vercel로 변경하여 Vercel이 DNS를 관리하도록 합니다.

1. Vercel 대시보드의 **Vercel DNS** 탭 확인
2. 표시된 네임서버를 도메인 제공업체에 설정:
   - `ns1.vercel-dns.com`
   - `ns2.vercel-dns.com`

**장점**: Vercel이 DNS를 자동으로 관리하므로 더 편리합니다.
**단점**: 도메인 제공업체에서 네임서버 변경이 필요합니다.

### 선택 가이드

- **방법 1 (DNS Records)**: 도메인 제공업체의 DNS를 계속 사용하고 싶을 때
- **방법 2 (Vercel DNS)**: Vercel이 DNS를 관리하도록 하고 싶을 때 (더 간편)

**중요**: 두 방법 중 **하나만 선택**하여 설정하세요. 둘 다 적용할 필요는 없습니다.

## 3. Vercel 도메인 추가

1. Vercel 대시보드에서 프로젝트 선택
2. **Settings** → **Domains** 이동
3. **Add Domain** 클릭
4. `hej2.xyz` 입력
5. **중요**: "Connect to an environment" 옵션을 선택하고 "Production"을 선택하세요
   - ❌ "Redirect to Another Domain"을 선택하면 안 됩니다 (URL 단축기가 작동하지 않음)
   - ✅ "Connect to an environment" → "Production"을 선택해야 합니다
6. Vercel이 DNS 설정을 확인하고 연결 완료

**참고**: hej2.xyz의 루트 경로(`/`)는 자동으로 URL 단축기 페이지(`/url-shortener`)로 리다이렉트됩니다. 
메인 대시보드는 다른 도메인(또는 기본 Vercel 도메인)에서 접근하시면 됩니다.

### 서브도메인도 사용하려면

만약 `www.hej2.xyz`도 사용하고 싶다면:
1. DNS에 추가 CNAME 레코드 설정:
   ```
   Type: CNAME
   Name: www
   Value: cname.vercel-dns.com
   ```
2. Vercel에서 `www.hej2.xyz`도 추가

## 4. SSL 인증서

Vercel은 자동으로 Let's Encrypt SSL 인증서를 발급하여 HTTPS를 활성화합니다.
도메인 연결 후 몇 분 내에 자동으로 설정됩니다.

## 5. 확인 방법

### DNS 전파 확인

다음 명령어로 DNS 전파 상태를 확인하세요:

```bash
# Windows
nslookup hej2.xyz

# macOS/Linux
dig hej2.xyz
```

### 도메인 연결 확인

1. 브라우저에서 `https://hej2.xyz` 접속
2. Vercel 대시보드의 **Domains** 섹션에서 상태 확인
3. "Valid Configuration" 상태가 되면 연결 완료

## 6. URL 단축기 사용

도메인 연결이 완료되면:

1. URL 단축기 페이지에서 URL 생성
2. 생성된 단축 URL 형식: `https://hej2.xyz/{code}`
3. 예시: `https://hej2.xyz/abc123`

## 7. 문제 해결

### DNS 전파가 안 될 때

- DNS 변경 후 최대 48시간까지 소요될 수 있습니다
- 보통 몇 분에서 몇 시간 내에 완료됩니다
- `dig` 또는 `nslookup` 명령어로 전파 상태 확인

### Vercel에서 도메인을 인식하지 못할 때

1. DNS 설정이 올바른지 확인
2. Vercel의 **Domains** 섹션에서 오류 메시지 확인
3. 필요시 Vercel 지원팀에 문의

### HTTPS가 작동하지 않을 때

- SSL 인증서 발급에는 몇 분이 걸릴 수 있습니다
- Vercel이 자동으로 처리하므로 잠시 기다려주세요
- 24시간 후에도 문제가 지속되면 Vercel 지원팀에 문의

### SSL 인증서 발급 실패 오류 (http-01 challenge failed)

**오류 메시지**: "We could not generate a cert for hej2.xyz because the required http-01 challenge failed"

이 오류는 DNS 설정이 제대로 되지 않았거나, 도메인이 Vercel로 제대로 라우팅되지 않을 때 발생합니다.

**해결 방법**:

1. **DNS 전파 확인**
   ```bash
   # Windows
   nslookup hej2.xyz
   
   # macOS/Linux
   dig hej2.xyz
   ```
   - A 레코드를 사용한 경우: IP 주소가 Vercel의 IP(216.198.79.1)로 설정되어 있는지 확인
   - CNAME을 사용한 경우: 올바른 CNAME 값으로 설정되어 있는지 확인

2. **DNS 레코드 재확인**
   - 도메인 제공업체에서 DNS 레코드가 정확히 설정되어 있는지 확인
   - 오타나 잘못된 값이 없는지 확인
   - TTL이 너무 높게 설정되어 있으면 낮춰보세요 (3600 권장)

3. **도메인 연결 재시도**
   - Vercel 대시보드에서 도메인을 제거했다가 다시 추가
   - 또는 "Refresh" 버튼을 클릭하여 다시 검증 시도

4. **다른 DNS 레코드 확인**
   - `www.hej2.xyz` 같은 서브도메인이 충돌하는지 확인
   - 기존에 설정된 다른 DNS 레코드가 없는지 확인

5. **Vercel DNS 사용 권장**
   - 도메인 제공업체에서 네임서버를 Vercel로 변경하는 것이 가장 확실한 방법입니다
   - Vercel 대시보드의 "Vercel DNS" 탭에서 네임서버 정보 확인
   - 도메인 제공업체에서 네임서버를 `ns1.vercel-dns.com`, `ns2.vercel-dns.com`로 변경

6. **시간 대기**
   - DNS 변경 후 최대 48시간까지 전파 시간이 걸릴 수 있습니다
   - 보통 몇 시간 내에 완료되지만, 경우에 따라 더 걸릴 수 있습니다

7. **Vercel 로그 확인**
   - Vercel 대시보드의 "Deployments" 탭에서 오류 로그 확인
   - "Domains" 탭에서 도메인 상태 확인

**추가 팁**:
- DNS 전파 확인 도구 사용: https://dnschecker.org/
- 여러 지역에서 DNS 전파 상태 확인 가능
- 모든 지역에서 올바른 IP로 전파될 때까지 기다려야 합니다

## 8. 추가 설정 (선택사항)

### 리다이렉트 설정

루트 도메인(`hej2.xyz`)을 특정 페이지로 리다이렉트하려면 `vercel.json`에 추가:

```json
{
  "redirects": [
    {
      "source": "/",
      "destination": "/url-shortener",
      "permanent": false
    }
  ]
}
```

또는 Next.js의 `next.config.ts`에서:

```typescript
const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: '/',
        destination: '/url-shortener',
        permanent: false,
      },
    ];
  },
};
```

## 참고사항

- 도메인 연결 후 변경사항이 반영되려면 앱을 재배포해야 할 수 있습니다
- 환경 변수 `NEXT_PUBLIC_SHORT_BASE_URL`은 클라이언트 사이드에서도 사용되므로 `NEXT_PUBLIC_` 접두사가 필요합니다
- 프로덕션 환경에서만 `hej2.xyz`를 사용하고, 로컬 개발 환경에서는 `localhost:3000`을 사용할 수 있습니다

