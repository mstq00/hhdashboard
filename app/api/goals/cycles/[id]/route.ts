import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = createServiceClient()
    const body = await request.json()

    const { data, error } = await supabase
      .from('goal_cycles')
      .update({
        name: body.name,
        start_date: body.start_date,
        end_date: body.end_date,
        keywords: body.keywords
      })
      .eq('id', id)
      .eq('user_id', 'sample-user') // 실제로는 인증된 사용자 ID 사용
      .select()

    if (error) {
      console.error('사이클 수정 오류:', error)
      return NextResponse.json({ error: '사이클 수정 실패' }, { status: 500 })
    }

    return NextResponse.json(data[0])
  } catch (error) {
    console.error('사이클 수정 오류:', error)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = createServiceClient()

    const { error } = await supabase
      .from('goal_cycles')
      .delete()
      .eq('id', id)
      .eq('user_id', 'sample-user') // 실제로는 인증된 사용자 ID 사용

    if (error) {
      console.error('사이클 삭제 오류:', error)
      return NextResponse.json({ error: '사이클 삭제 실패' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('사이클 삭제 오류:', error)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
} 