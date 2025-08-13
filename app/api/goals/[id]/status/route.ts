import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

// 목표 상태 변경
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { status } = await request.json()

    if (!id || !status) {
      return NextResponse.json(
        { error: '목표 ID와 상태가 필요합니다.' },
        { status: 400 }
      )
    }

    // 유효한 상태인지 확인
    const validStatuses = ['pending', 'on_track', 'difficult', 'completed', 'stopped']
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: '유효하지 않은 상태입니다.' },
        { status: 400 }
      )
    }

    const supabase = createServiceClient()
    const { data, error } = await supabase
      .from('goals')
      .update({ status })
      .eq('id', id)
      .select()

    if (error) {
      console.error('목표 상태 변경 오류:', error)
      return NextResponse.json(
        { error: '목표 상태 변경에 실패했습니다.' },
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