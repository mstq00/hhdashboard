import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const goalId = id

    if (!goalId) {
      return NextResponse.json(
        { success: false, error: '목표 ID가 필요합니다.' },
        { status: 400 }
      )
    }

    // 먼저 하위 목표가 있는지 확인
    const { data: subGoals, error: subGoalsError } = await supabase
      .from('goals')
      .select('id')
      .eq('parent_goal_id', goalId)

    if (subGoalsError) {
      console.error('하위 목표 조회 오류:', subGoalsError)
      return NextResponse.json(
        { success: false, error: '하위 목표 조회 중 오류가 발생했습니다.' },
        { status: 500 }
      )
    }

    // 하위 목표가 있으면 먼저 삭제
    if (subGoals && subGoals.length > 0) {
      const subGoalIds = subGoals.map(goal => goal.id)
      
      // 하위 목표 삭제
      const { error: deleteSubGoalsError } = await supabase
        .from('goals')
        .delete()
        .in('id', subGoalIds)

      if (deleteSubGoalsError) {
        console.error('하위 목표 삭제 오류:', deleteSubGoalsError)
        return NextResponse.json(
          { success: false, error: '하위 목표 삭제 중 오류가 발생했습니다.' },
          { status: 500 }
        )
      }
    }

    // 메인 목표 삭제
    const { error: deleteGoalError } = await supabase
      .from('goals')
      .delete()
      .eq('id', goalId)

    if (deleteGoalError) {
      console.error('목표 삭제 오류:', deleteGoalError)
      return NextResponse.json(
        { success: false, error: '목표 삭제 중 오류가 발생했습니다.' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { success: true, message: '목표가 성공적으로 삭제되었습니다.' },
      { status: 200 }
    )

  } catch (error) {
    console.error('목표 삭제 처리 오류:', error)
    return NextResponse.json(
      { success: false, error: '목표 삭제 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
} 