// 목표(Goal) 타입 정의
export type Goal = {
  id: string;
  type: 'directional' | 'common' | 'personal'; // 방향성/공통/개인
  category: string; // ex. '효율', '확장', '공통성장지표'
  title: string;
  description?: string;
  checked?: boolean;
  progress?: number; // 0~100, 하위 목표 있을 때
  subGoals?: Goal[];
  targetValue?: number | string; // ex. 20만, 2억 등
  currentValue?: number | string;
  unit?: string; // ex. 명, 원, %
  owner?: string; // 개인 목표 담당자
  dueDate?: string;
  tags?: string[];
};

// 샘플 목표 데이터 (2025년 하반기)
export const sampleGoals: Goal[] = [
  {
    id: 'efficiency',
    type: 'directional',
    category: '효율',
    title: '일의 효율 2',
    checked: false,
    subGoals: [
      { id: 'auto-tool', type: 'directional', category: '효율', title: '자동화 툴 활용 및 개선', checked: true },
      { id: 'solution', type: 'directional', category: '효율', title: '필요한 솔루션 검증/구독', checked: false },
      { id: 'equipment', type: 'directional', category: '효율', title: '효율 장비 구매', checked: false, subGoals: [
        { id: 'nas', type: 'directional', category: '효율', title: 'NAS', checked: false },
        { id: 'phone', type: 'directional', category: '효율', title: '새 휴대폰', checked: false },
      ]},
      { id: 'repeat', type: 'directional', category: '효율', title: '반복 줄이기/개인 자동화', checked: true },
    ],
  },
  {
    id: 'fund-efficiency',
    type: 'directional',
    category: '효율',
    title: '자금의 효율 2',
    checked: false,
    subGoals: [
      { id: 'tax', type: 'directional', category: '효율', title: '세금(부가세) 고려', checked: false },
    ],
  },
  {
    id: 'product-expansion',
    type: 'directional',
    category: '확장',
    title: '상품의 확장',
    checked: false,
    description: '2달 1개 기준',
  },
  {
    id: 'marketing-expansion',
    type: 'directional',
    category: '확장',
    title: '마케팅 채널 확장',
    checked: false,
    subGoals: [
      { id: 'insta', type: 'directional', category: '확장', title: '브랜드 계정 → 인스타그램', checked: false },
      { id: 'tiktok', type: 'directional', category: '확장', title: '틱톡 → 본계정', checked: false },
    ],
  },
  {
    id: 'distribution-expansion',
    type: 'directional',
    category: '확장',
    title: '유통 채널 확장',
    checked: false,
    subGoals: [
      { id: 'self-gonggu', type: 'directional', category: '확장', title: '셀프 공구+타 인플루언서 공구 → 스마트스토어', checked: false },
      { id: 'toss', type: 'directional', category: '확장', title: '토스 쇼핑', checked: false },
      { id: 'coupang', type: 'directional', category: '확장', title: '쿠팡 로켓 배송', checked: false },
    ],
  },
  {
    id: 'branding-expansion',
    type: 'directional',
    category: '확장',
    title: '브랜딩 확장',
    checked: false,
  },
  // 공통 성장 지표
  {
    id: 'youtube-growth',
    type: 'common',
    category: '공통성장지표',
    title: '유튜브',
    targetValue: 200000,
    currentValue: 144000,
    unit: '명',
  },
  {
    id: 'instagram-growth',
    type: 'common',
    category: '공통성장지표',
    title: '인스타그램',
    targetValue: 200000,
    currentValue: 128000,
    unit: '명',
  },
  {
    id: 'blog-growth',
    type: 'common',
    category: '공통성장지표',
    title: '블로그',
    targetValue: 40000,
    currentValue: 30000,
    unit: '명',
  },
  {
    id: 'ohouse-growth',
    type: 'common',
    category: '공통성장지표',
    title: '오늘의집',
    targetValue: 25000,
    currentValue: 15000,
    unit: '명',
  },
  {
    id: 'tiktok-growth',
    type: 'common',
    category: '공통성장지표',
    title: '틱톡',
    targetValue: 10000,
    currentValue: 0,
    unit: '명',
  },
  {
    id: 'gonggu',
    type: 'common',
    category: '공동구매',
    title: '공동구매 매출',
    targetValue: 200000000,
    currentValue: 0,
    unit: '원',
  },
  {
    id: 'ad',
    type: 'common',
    category: '유료광고',
    title: '유료광고 이익',
    targetValue: 40000000,
    currentValue: 0,
    unit: '원',
  },
  {
    id: 'store-sales',
    type: 'common',
    category: '스토어매출',
    title: '스토어 매출',
    targetValue: 500000000,
    currentValue: 0,
    unit: '원',
  },
  {
    id: 'store-profit',
    type: 'common',
    category: '스토어매출',
    title: '스토어 순이익',
    targetValue: 200000000,
    currentValue: 0,
    unit: '원',
  },
  // 공통 달성 목표
  {
    id: 'logistics',
    type: 'common',
    category: '공통달성',
    title: '물류 일원화 100% 달성',
    checked: false,
  },
  {
    id: 'main-product',
    type: 'common',
    category: '공통달성',
    title: '주력상품 상세페이지 변경',
    checked: false,
  },
  // 개인 목표 (샘플)
  {
    id: 'kangmin-personal',
    type: 'personal',
    category: '개인',
    title: '강민의 목표',
    owner: '강민',
    checked: false,
  },
  {
    id: 'eunsun-personal',
    type: 'personal',
    category: '개인',
    title: '은선의 목표',
    owner: '은선',
    checked: false,
  },
];

// 기간(예: 2025년 하반기 등)
export type GoalPeriod = {
  id: string; // 예: '2025-H2'
  name: string; // 예: '2025년 하반기'
};

// 기간별 목표 데이터 샘플
export const samplePeriods: GoalPeriod[] = [
  { id: '2025-H2', name: '2025년 하반기' },
  { id: '2026-H1', name: '2026년 상반기' },
];

// 기간별 목표 맵
export const sampleGoalsByPeriod: Record<string, Goal[]> = {
  '2025-H2': sampleGoals,
  '2026-H1': [
    // 2026년 상반기 샘플 (간단 예시)
    {
      id: 'efficiency-2026',
      type: 'directional',
      category: '효율',
      title: '2026 상반기 효율 목표',
      checked: false,
    },
    {
      id: 'growth-yt-2026',
      type: 'common',
      category: '공통성장지표',
      title: '유튜브',
      targetValue: 250000,
      currentValue: 150000,
      unit: '명',
    },
  ],
}; 