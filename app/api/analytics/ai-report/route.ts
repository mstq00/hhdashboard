import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Gemini API 클라이언트 초기화
const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY || '');

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const {
            summaryData,
            channelSalesData,
            productSalesData,
            businessStage,
            dateRange,
            currentDate
        } = body;

        // 필수 데이터 검증
        if (!summaryData || !channelSalesData) {
            return NextResponse.json(
                { success: false, error: '필수 데이터가 누락되었습니다.' },
                { status: 400 }
            );
        }

        // 날짜 포맷팅 (YYYY-MM-DD)
        const formattedDate = currentDate ? new Date(currentDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];

        // AI 프롬프트 구성 (구조화된 양식)
        const prompt = `당신은 전문 경영 컨설턴트입니다. 아래 데이터를 분석하여 **정확히 다음 형식**에 맞춰 경영 전략 리포트를 작성해주세요.

## 분석 정보
- **기준일:** ${formattedDate}
- **분석 기간:** ${dateRange || '선택된 기간'}

### 비즈니스 진단 결과
**현재 상태:** ${businessStage}

${productSalesData && productSalesData.length > 0 ? `
### 주요 제품별 판매 현황 (상위 5개)
${productSalesData.slice(0, 5).map((prod: any, idx: number) =>
            `${idx + 1}. **${prod.productName || prod.name}:** ${prod.sales?.toLocaleString()}원 (${prod.quantity || 0}개)`
        ).join('\n')}
` : ''}

---

## 리포트 작성 지침
**반드시 아래 형식을 정확히 따라 작성하세요:**

### 1. 현황 요약
- 2-3문장으로 현재 비즈니스의 전반적인 상태를 간결하게 요약
- 매출, 고객, 객단가의 주요 변화를 언급

### 2. 주요 발견사항
- **정확히 3-4개의 bullet point**로 작성
- 각 항목은 다음 형식으로 시작:
  * **[핵심 키워드]:** 구체적인 수치와 함께 설명
- 데이터에서 발견한 핵심 인사이트만 포함

### 3. 전략적 제언
- **정확히 3-4개의 실행 가능한 액션 아이템**
- 각 제언은 다음 구조로 작성:
  * **[제언 제목]:** 
    - **현황:** 1문장으로 문제 상황 설명
    - **실행:** 구체적이고 즉시 실행 가능한 방안 제시

### 4. 리스크 및 기회
- **리스크:** 2-3문장으로 주의해야 할 위험 요소
- **기회:** 2-3문장으로 활용 가능한 기회 요소

---

**작성 규칙:**
- 모든 섹션 제목은 정확히 위의 형식(###)을 사용
- 구체적인 수치를 반드시 인용
- 일반론이 아닌 이 비즈니스만의 특수성 반영
- 전문적이면서도 이해하기 쉬운 언어 사용
- 한국어로 작성
- 각 섹션 사이에 빈 줄 추가`;

        // Gemini API 호출
        const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' });
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const aiReport = response.text();

        return NextResponse.json({
            success: true,
            report: aiReport,
            timestamp: new Date().toISOString()
        });

    } catch (error: any) {
        console.error('AI 리포트 생성 오류:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'AI 리포트 생성 중 오류가 발생했습니다.',
                details: error.message
            },
            { status: 500 }
        );
    }
}
