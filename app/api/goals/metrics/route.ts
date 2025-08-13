import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

// 지표값 추가
export async function POST(request: NextRequest) {
  try {
    const supabase = createServiceClient()
    const body = await request.json()
    
    const { data, error } = await supabase
      .from('goal_checkins')
      .insert([{
        goal_id: body.goalId,
        checkin_date: body.date,
        metric_value: parseFloat(body.value),
        notes: body.note || null
      }])
      .select()
    
    if (error) {
      console.error('지표값 추가 오류:', error)
      return NextResponse.json({ error: '지표값 추가 실패' }, { status: 500 })
    }
    
    return NextResponse.json(data[0])
  } catch (error) {
    console.error('지표값 추가 오류:', error)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}

// 지표값 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const goalId = searchParams.get('goalId')

    if (!goalId) {
      return NextResponse.json(
        { error: '목표 ID가 필요합니다.' },
        { status: 400 }
      )
    }

    const supabase = createServiceClient()
    const { data, error } = await supabase
      .from('goal_checkins')
      .select('*')
      .eq('goal_id', goalId)
      .order('checkin_date', { ascending: false })

    if (error) {
      console.error('지표값 조회 오류:', error)
      return NextResponse.json(
        { error: '지표값 조회에 실패했습니다.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('API 오류:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
} 