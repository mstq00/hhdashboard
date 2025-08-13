import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

// 목표 목록 조회
export async function GET(request: NextRequest) {
  try {
    const supabase = createServiceClient()
    
    // URL 파라미터에서 필터링 옵션 가져오기
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const cycle = searchParams.get('cycle')
    const organization = searchParams.get('organization')
    
    let query = supabase
      .from('goals')
      .select(`
        *,
        goal_cycles!inner(name, keywords)
      `)
      .order('created_at', { ascending: false })
    
    // 필터링 적용
    if (status && status !== 'all') {
      query = query.eq('status', status)
    }
    if (cycle && cycle !== 'all') {
      query = query.eq('cycle_id', cycle)
    }
    if (organization && organization !== 'all') {
      query = query.eq('organization', organization)
    }
    
    const { data, error } = await query
    
    if (error) {
      console.error('목표 조회 오류:', error)
      return NextResponse.json({ error: '목표 조회 실패' }, { status: 500 })
    }
    
    return NextResponse.json(data)
  } catch (error) {
    console.error('목표 조회 오류:', error)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}

// 새 목표 생성
export async function POST(request: NextRequest) {
  try {
    const supabase = createServiceClient()
    const body = await request.json()
    
    const { data, error } = await supabase
      .from('goals')
      .insert([{
        title: body.title,
        description: body.description,
        cycle_id: body.cycleId,
        organization: body.organization,
        assignee: body.assignee,
        start_date: body.startDate,
        end_date: body.endDate,
        metric_name: body.metricName || null,
        start_value: body.startValue ? parseFloat(body.startValue) : null,
        target_value: body.targetValue ? parseFloat(body.targetValue) : null,
        current_value: 0,
        status: 'pending',
        keyword: body.keyword || null,
        user_id: 'sample-user' // TODO: 실제 사용자 ID로 변경
      }])
      .select()
    
    if (error) {
      console.error('목표 생성 오류:', error)
      return NextResponse.json({ error: '목표 생성 실패' }, { status: 500 })
    }
    
    return NextResponse.json(data[0])
  } catch (error) {
    console.error('목표 생성 오류:', error)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
} 