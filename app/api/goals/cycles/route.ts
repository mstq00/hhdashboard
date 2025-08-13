import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

// 사이클 목록 조회
export async function GET() {
  try {
    const supabase = createServiceClient()
    
    const { data, error } = await supabase
      .from('goal_cycles')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('사이클 조회 오류:', error)
      return NextResponse.json({ error: '사이클 조회 실패' }, { status: 500 })
    }
    
    return NextResponse.json(data)
  } catch (error) {
    console.error('사이클 조회 오류:', error)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}

// 새 사이클 생성
export async function POST(request: NextRequest) {
  try {
    const supabase = createServiceClient()
    const body = await request.json()
    
    const { data, error } = await supabase
      .from('goal_cycles')
      .insert([{
        name: body.name,
        start_date: body.start_date,
        end_date: body.end_date,
        keywords: body.keywords,
        is_default: body.is_default || false,
        user_id: 'sample-user' // TODO: 실제 사용자 ID로 변경
      }])
      .select()
    
    if (error) {
      console.error('사이클 생성 오류:', error)
      return NextResponse.json({ error: '사이클 생성 실패' }, { status: 500 })
    }
    
    return NextResponse.json(data[0])
  } catch (error) {
    console.error('사이클 생성 오류:', error)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
} 