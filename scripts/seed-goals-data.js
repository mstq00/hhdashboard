require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

// 환경 변수 설정
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('환경 변수가 설정되지 않았습니다.')
  console.error('NEXT_PUBLIC_SUPABASE_URL:', !!supabaseUrl)
  console.error('SUPABASE_SERVICE_ROLE_KEY:', !!supabaseServiceKey)
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// 사이클 데이터
const cycles = [
  {
    id: '550e8400-e29b-41d4-a716-446655440001',
    name: '25년 하반기',
    start_date: '2025-07-01',
    end_date: '2025-12-31',
    keywords: [
      { name: '효율', description: '업무 효율성 향상과 프로세스 최적화' },
      { name: '혁신', description: '새로운 아이디어와 기술 도입' },
      { name: '확장', description: '비즈니스 규모 확대와 시장 진출' }
    ],
    is_default: true,
    user_id: 'sample-user'
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440002',
    name: '기본 사이클',
    start_date: '2025-01-01',
    end_date: '2025-12-31',
    keywords: [
      { name: '성장', description: '지속적인 성장과 발전' },
      { name: '안정', description: '안정적인 운영과 관리' }
    ],
    is_default: false,
    user_id: 'sample-user'
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440003',
    name: 'Q1 목표',
    start_date: '2025-01-01',
    end_date: '2025-03-31',
    keywords: [
      { name: '출시', description: '신제품 출시 준비' },
      { name: '마케팅', description: '마케팅 전략 수립 및 실행' }
    ],
    is_default: false,
    user_id: 'sample-user'
  }
]

// 목표 데이터
const goals = [
  {
    id: '550e8400-e29b-41d4-a716-446655440101',
    title: '고객 만족도 평균 5점 달성',
    description: '고객 서비스 품질 향상을 통한 만족도 개선',
    cycle_id: '550e8400-e29b-41d4-a716-446655440001',
    organization: '개인',
    assignee: '김철수',
    start_date: '2025-01-01',
    end_date: '2025-12-31',
    metric_name: '고객 만족도',
    start_value: 3.5,
    target_value: 5.0,
    current_value: 4.1,
    status: 'on_track',
    user_id: 'sample-user'
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440102',
    title: '고객 피드백 시스템 구축',
    description: '고객 의견 수집 및 분석 시스템 개발',
    cycle_id: '550e8400-e29b-41d4-a716-446655440001',
    organization: '개인',
    assignee: '김철수',
    start_date: '2025-01-01',
    end_date: '2025-06-30',
    metric_name: '시스템 구축률',
    start_value: 0,
    target_value: 100,
    current_value: 100,
    status: 'completed',
    user_id: 'sample-user'
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440103',
    title: '고객 서비스 교육 프로그램 개발',
    description: '직원 교육 프로그램 설계 및 운영',
    cycle_id: '550e8400-e29b-41d4-a716-446655440001',
    organization: '개인',
    assignee: '김철수',
    start_date: '2025-03-01',
    end_date: '2025-08-31',
    metric_name: '교육 진행률',
    start_value: 0,
    target_value: 100,
    current_value: 60,
    status: 'on_track',
    user_id: 'sample-user'
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440104',
    title: '매출 20% 증가',
    description: '영업 전략 개선을 통한 매출 증대',
    cycle_id: '550e8400-e29b-41d4-a716-446655440001',
    organization: '키워드',
    assignee: '팀 전체',
    start_date: '2025-01-01',
    end_date: '2025-12-31',
    metric_name: '매출 증가율',
    start_value: 0,
    target_value: 20,
    current_value: 9,
    status: 'difficult',
    keyword: '효율',
    user_id: 'sample-user'
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440105',
    title: '신제품 출시',
    description: '새로운 제품 라인업 출시',
    cycle_id: '550e8400-e29b-41d4-a716-446655440001',
    organization: '공통',
    assignee: '이영희',
    start_date: '2025-03-01',
    end_date: '2025-08-31',
    metric_name: '출시 준비도',
    start_value: 0,
    target_value: 100,
    current_value: 15,
    status: 'pending',
    user_id: 'sample-user'
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440106',
    title: '직원 만족도 향상',
    description: '직원 복지 및 업무 환경 개선',
    cycle_id: '550e8400-e29b-41d4-a716-446655440001',
    organization: '공통',
    assignee: '인사팀',
    start_date: '2025-01-01',
    end_date: '2025-12-31',
    metric_name: '직원 만족도',
    start_value: 3.8,
    target_value: 5.0,
    current_value: 4.2,
    status: 'on_track',
    user_id: 'sample-user'
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440107',
    title: '디지털 마케팅 전략 수립',
    description: '온라인 마케팅 전략 개발 및 실행',
    cycle_id: '550e8400-e29b-41d4-a716-446655440001',
    organization: '키워드',
    assignee: '마케팅팀',
    start_date: '2025-01-01',
    end_date: '2025-06-30',
    metric_name: '전략 수립률',
    start_value: 0,
    target_value: 100,
    current_value: 100,
    status: 'completed',
    keyword: '혁신',
    user_id: 'sample-user'
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440108',
    title: '팀 빌딩 워크샵 진행',
    description: '팀원 간 소통 및 협력 강화',
    cycle_id: '550e8400-e29b-41d4-a716-446655440001',
    organization: '공통',
    assignee: '인사팀',
    start_date: '2025-04-01',
    end_date: '2025-04-30',
    status: 'pending',
    user_id: 'sample-user'
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440109',
    title: '개인 스킬 개발',
    description: '개인 역량 강화를 위한 학습',
    cycle_id: '550e8400-e29b-41d4-a716-446655440001',
    organization: '개인',
    assignee: '김철수',
    start_date: '2025-01-01',
    end_date: '2025-12-31',
    status: 'on_track',
    user_id: 'sample-user'
  },
  // 하위 목표 예시
  {
    id: '550e8400-e29b-41d4-a716-446655440201',
    title: '하위 목표 예시 1',
    description: '고객 만족도 달성을 위한 하위 목표',
    cycle_id: '550e8400-e29b-41d4-a716-446655440001',
    parent_goal_id: '550e8400-e29b-41d4-a716-446655440101',
    organization: '개인',
    assignee: '김철수',
    start_date: '2025-01-01',
    end_date: '2025-06-30',
    metric_name: '하위 진행률',
    start_value: 0,
    target_value: 100,
    current_value: 30,
    status: 'on_track',
    user_id: 'sample-user'
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440202',
    title: '하위 목표 예시 2',
    description: '매출 증가를 위한 하위 목표',
    cycle_id: '550e8400-e29b-41d4-a716-446655440001',
    parent_goal_id: '550e8400-e29b-41d4-a716-446655440104',
    organization: '키워드',
    assignee: '이강민',
    start_date: '2025-07-01',
    end_date: '2025-12-31',
    status: 'pending',
    user_id: 'sample-user'
  }
]

// 지표 데이터
const checkins = [
  {
    goal_id: '550e8400-e29b-41d4-a716-446655440101',
    checkin_date: '2025-01-15',
    metric_value: 4.1,
    user_id: 'sample-user'
  },
  {
    goal_id: '550e8400-e29b-41d4-a716-446655440102',
    checkin_date: '2025-01-20',
    metric_value: 100,
    user_id: 'sample-user'
  },
  {
    goal_id: '550e8400-e29b-41d4-a716-446655440103',
    checkin_date: '2025-02-01',
    metric_value: 60,
    user_id: 'sample-user'
  },
  {
    goal_id: '550e8400-e29b-41d4-a716-446655440104',
    checkin_date: '2025-01-25',
    metric_value: 9,
    user_id: 'sample-user'
  },
  {
    goal_id: '550e8400-e29b-41d4-a716-446655440105',
    checkin_date: '2025-02-01',
    metric_value: 15,
    user_id: 'sample-user'
  },
  {
    goal_id: '550e8400-e29b-41d4-a716-446655440106',
    checkin_date: '2025-01-30',
    metric_value: 4.2,
    user_id: 'sample-user'
  },
  {
    goal_id: '550e8400-e29b-41d4-a716-446655440107',
    checkin_date: '2025-01-15',
    metric_value: 100,
    user_id: 'sample-user'
  }
]

async function seedData() {
  try {
    console.log('데이터 삽입 시작...')
    
    // 사이클 데이터 삽입
    console.log('사이클 데이터 삽입 중...')
    const { error: cyclesError } = await supabase
      .from('goal_cycles')
      .upsert(cycles, { onConflict: 'id' })
    
    if (cyclesError) {
      console.error('사이클 데이터 삽입 오류:', cyclesError)
      return
    }
    
    // 목표 데이터 삽입
    console.log('목표 데이터 삽입 중...')
    const { error: goalsError } = await supabase
      .from('goals')
      .upsert(goals, { onConflict: 'id' })
    
    if (goalsError) {
      console.error('목표 데이터 삽입 오류:', goalsError)
      return
    }
    
    // 지표 데이터 삽입
    console.log('지표 데이터 삽입 중...')
    const { error: checkinsError } = await supabase
      .from('goal_checkins')
      .upsert(checkins, { onConflict: 'id' })
    
    if (checkinsError) {
      console.error('지표 데이터 삽입 오류:', checkinsError)
      return
    }
    
    console.log('✅ 모든 데이터 삽입 완료!')
  } catch (error) {
    console.error('데이터 삽입 중 오류 발생:', error)
  }
}

seedData() 