import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export async function PATCH(request: NextRequest) {
  try {
    const supabase = createServiceClient()
    const { cycleId } = await request.json()

    // 먼저 모든 사이클의 기본 설정을 해제
    const { error: resetError } = await supabase
      .from('goal_cycles')
      .update({ is_default: false })
      .eq('user_id', 'sample-user') // 실제로는 인증된 사용자 ID 사용

    if (resetError) {
      console.error('기본 사이클 해제 오류:', resetError)
      return NextResponse.json({ error: '기본 사이클 해제 실패' }, { status: 500 })
    }

    // 지정된 사이클을 기본으로 설정
    const { error: setError } = await supabase
      .from('goal_cycles')
      .update({ is_default: true })
      .eq('id', cycleId)
      .eq('user_id', 'sample-user') // 실제로는 인증된 사용자 ID 사용

    if (setError) {
      console.error('기본 사이클 설정 오류:', setError)
      return NextResponse.json({ error: '기본 사이클 설정 실패' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('기본 사이클 설정 오류:', error)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
} 