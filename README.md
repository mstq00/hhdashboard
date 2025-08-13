# HH Dashboard

비즈니스 대시보드 애플리케이션

## 환경 변수 설정

Vercel 배포를 위해 다음 환경 변수들을 설정해야 합니다:

### Supabase 설정
- `NEXT_PUBLIC_SUPABASE_URL`: Supabase 프로젝트 URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase 익명 키
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase 서비스 롤 키

### Google API 설정
- `GOOGLE_API_KEY`: Google API 키
- `NEXT_PUBLIC_GOOGLE_API_KEY`: 클라이언트용 Google API 키
- `NEXT_PUBLIC_SHEET_ID`: Google Sheets ID

### Notion API 설정
- `NOTION_API_KEY`: Notion API 키
- `NOTION_ORDER_DATABASE_ID`: 주문 데이터베이스 ID
- `NOTION_TOTAL_SALES_DATABASE_ID`: 총 매출 데이터베이스 ID
- `NOTION_TOTAL_SALES_DETAIL_DATABASE_ID`: 매출 상세 데이터베이스 ID

### ElevenLabs 설정
- `ELEVENLABS_API_KEY`: ElevenLabs API 키

### Gemini API 설정
- `NEXT_PUBLIC_GEMINI_API_KEY`: Gemini API 키

## Vercel 배포

1. Vercel CLI 설치:
```bash
npm i -g vercel
```

2. 프로젝트 배포:
```bash
vercel
```

3. 환경 변수 설정:
   - Vercel 대시보드에서 프로젝트 설정
   - Environment Variables 섹션에서 위의 환경 변수들을 추가

## 로컬 개발

```bash
npm install
npm run dev
```

## 빌드

```bash
npm run build
npm start
```

## 데이터베이스 설정

### Supabase 데이터베이스 스키마 설정

1. Supabase 프로젝트 대시보드에서 SQL Editor로 이동
2. `database_schema.sql` 파일의 내용을 복사하여 실행
3. `database_rls_policies.sql` 파일의 내용을 복사하여 실행
4. `database_mapping_utilities.sql` 파일의 내용을 복사하여 실행 (선택사항)

### 테이블 구조

#### orders (주문 데이터)
- 채널별 주문 정보 저장
- 주문번호, 상품명, 옵션명의 조합으로 중복 방지
- 자동 중복 처리 트리거 포함

#### channel_default_passwords (채널별 기본 비밀번호)
- 각 채널의 기본 비밀번호 저장
- 관리자가 설정 가능

#### user_channel_passwords (사용자별 채널 비밀번호)
- 사용자별로 저장된 채널 비밀번호
- 자동 적용 기능

#### file_uploads (파일 업로드 히스토리)
- 업로드된 파일의 처리 결과 기록
- 통계 및 모니터링용

#### channel_mappings (채널별 컬럼 매핑)
- 각 채널의 엑셀 컬럼과 데이터베이스 컬럼 매핑
- 기본 매핑 데이터 포함
- 사용자 정의 매핑 저장 및 관리
- 채널별 매핑 자동 불러오기

### 보안 설정

- Row Level Security (RLS) 활성화
- 인증된 사용자만 데이터 관리 가능
- 사용자별 데이터 접근 제한

### 매핑 관리 기능

- **자동 매핑 저장**: 업로드 시 자동으로 매핑 설정 저장
- **채널별 매핑**: 각 채널별로 독립적인 매핑 설정
- **매핑 검증**: 유효한 데이터베이스 컬럼인지 검증
- **매핑 백업/복원**: JSON 형태로 매핑 설정 백업 및 복원
- **매핑 통계**: 채널별 매핑 현황 통계 조회
