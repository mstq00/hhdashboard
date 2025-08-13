import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

// 지표값 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    if (!id) {
      return NextResponse.json(
        { error: '지표값 ID가 필요합니다.' },
        { status: 400 }
      )
    }

    const supabase = createServiceClient()
    const { error } = await supabase
      .from('goal_checkins')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('지표값 삭제 오류:', error)
      return NextResponse.json(
        { error: '지표값 삭제에 실패했습니다.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('API 오류:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
} 