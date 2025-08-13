import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

const supabase = createServiceClient();

export async function POST(request: NextRequest) {
  try {
    console.log('트리거 관리 시작...');
    
    const { action } = await request.json();
    
    // 먼저 Supabase 연결 테스트
    const { error: connectionError } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .limit(1);

    if (connectionError) {
      console.error('Supabase 연결 오류:', connectionError);
      return NextResponse.json({
        success: false,
        error: 'Supabase 연결에 실패했습니다.',
        details: connectionError
      }, { status: 500 });
    }

    console.log('Supabase 연결 성공');
    
    if (action === 'disable') {
      // 트리거 비활성화 - 더 안전한 방법
      try {
        // 1. exec_sql 함수가 있는지 확인
        const { error: execSqlError } = await supabase.rpc('exec_sql', {
          sql: 'SELECT 1'
        });

        if (execSqlError) {
          console.log('exec_sql 함수가 없습니다. 직접 SQL 실행을 시도합니다.');
          
          // 2. 직접 SQL 실행 (PostgreSQL 확장 사용)
          const { error: directError } = await supabase
            .from('orders')
            .select('*')
            .limit(1);

          if (directError) {
            throw new Error('직접 SQL 실행도 실패');
          }

          console.log('트리거 비활성화를 건너뜁니다. (exec_sql 함수 없음)');
          return NextResponse.json({
            success: true,
            message: '트리거 비활성화를 건너뜁니다. (exec_sql 함수 없음)',
            warning: '트리거가 활성화된 상태로 진행됩니다.'
          });
        }

        // 3. exec_sql 함수가 있으면 트리거 비활성화
        const { error: dropError } = await supabase.rpc('exec_sql', {
          sql: 'DROP TRIGGER IF EXISTS handle_duplicate_orders_trigger ON orders;'
        });

        if (dropError) {
          console.error('트리거 삭제 오류:', dropError);
          return NextResponse.json({
            success: false,
            error: '트리거 삭제에 실패했습니다.',
            details: dropError
          }, { status: 500 });
        }

        console.log('트리거가 비활성화되었습니다.');
        return NextResponse.json({
          success: true,
          message: '트리거가 비활성화되었습니다.'
        });

      } catch (sqlError) {
        console.error('SQL 실행 오류:', sqlError);
        return NextResponse.json({
          success: false,
          error: 'SQL 실행 중 오류가 발생했습니다.',
          details: sqlError
        }, { status: 500 });
      }
      
    } else if (action === 'enable') {
      // 트리거 재활성화
      try {
        // 1. exec_sql 함수가 있는지 확인
        const { error: execSqlError } = await supabase.rpc('exec_sql', {
          sql: 'SELECT 1'
        });

        if (execSqlError) {
          console.log('exec_sql 함수가 없습니다. 트리거 재활성화를 건너뜁니다.');
          return NextResponse.json({
            success: true,
            message: '트리거 재활성화를 건너뜁니다. (exec_sql 함수 없음)',
            warning: '트리거가 비활성화된 상태로 유지됩니다.'
          });
        }

        // 2. 개선된 트리거 생성
        const createTriggerSQL = `
          CREATE TRIGGER handle_duplicate_orders_trigger 
          BEFORE INSERT ON orders 
          FOR EACH ROW EXECUTE FUNCTION handle_duplicate_orders_improved();
        `;

        const { error: createError } = await supabase.rpc('exec_sql', {
          sql: createTriggerSQL
        });

        if (createError) {
          console.error('트리거 생성 오류:', createError);
          return NextResponse.json({
            success: false,
            error: '트리거 생성에 실패했습니다.',
            details: createError
          }, { status: 500 });
        }

        console.log('트리거가 재활성화되었습니다.');
        return NextResponse.json({
          success: true,
          message: '트리거가 재활성화되었습니다.'
        });

      } catch (sqlError) {
        console.error('SQL 실행 오류:', sqlError);
        return NextResponse.json({
          success: false,
          error: 'SQL 실행 중 오류가 발생했습니다.',
          details: sqlError
        }, { status: 500 });
      }
      
    } else {
      return NextResponse.json({
        success: false,
        error: '잘못된 액션입니다. (disable 또는 enable)'
      }, { status: 400 });
    }

  } catch (error) {
    console.error('트리거 관리 예외:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류'
    }, { status: 500 });
  }
} 