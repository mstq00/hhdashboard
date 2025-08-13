import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl!, supabaseServiceKey!, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

export async function POST(request: NextRequest) {
  try {
    console.log('트리거 함수 생성 시작...');
    
    // 1. exec_sql 함수 생성
    const createExecSqlFunction = `
      CREATE OR REPLACE FUNCTION exec_sql(sql text)
      RETURNS void AS $$
      BEGIN
        EXECUTE sql;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `;

    // 2. 개선된 중복 처리 함수 생성
    const createImprovedDuplicateFunction = `
      CREATE OR REPLACE FUNCTION handle_duplicate_orders_improved()
      RETURNS TRIGGER AS $$
      BEGIN
        -- 더 엄격한 중복 기준: 주문번호, 주문일시, 수량, 상품명, 옵션명, 구매자명, 연락처가 모두 일치
        DELETE FROM orders 
        WHERE channel = NEW.channel 
          AND order_number = NEW.order_number 
          AND order_date = NEW.order_date
          AND quantity = NEW.quantity
          AND product_name = NEW.product_name 
          AND product_option = NEW.product_option
          AND customer_name = NEW.customer_name
          AND customer_phone = NEW.customer_phone;
        
        RETURN NEW;
      END;
      $$ language 'plpgsql';
    `;

    // 3. 기존 트리거 삭제 후 새 트리거 생성
    const createImprovedTrigger = `
      DROP TRIGGER IF EXISTS handle_duplicate_orders_trigger ON orders;
      
      CREATE TRIGGER handle_duplicate_orders_trigger 
        BEFORE INSERT ON orders 
        FOR EACH ROW EXECUTE FUNCTION handle_duplicate_orders_improved();
    `;

    // 함수들을 순차적으로 실행
    const functions = [
      { name: 'exec_sql', sql: createExecSqlFunction },
      { name: 'handle_duplicate_orders_improved', sql: createImprovedDuplicateFunction },
      { name: 'trigger', sql: createImprovedTrigger }
    ];

    for (const func of functions) {
      console.log(`${func.name} 함수 생성 중...`);
      
      const { error } = await supabase.rpc('exec_sql', { sql: func.sql });
      
      if (error) {
        console.error(`${func.name} 함수 생성 오류:`, error);
        return NextResponse.json({
          success: false,
          error: `${func.name} 함수 생성 중 오류: ${error.message}`
        }, { status: 500 });
      }
      
      console.log(`${func.name} 함수 생성 완료`);
    }

    console.log('모든 함수 생성 완료');

    return NextResponse.json({
      success: true,
      message: '트리거 함수가 성공적으로 생성되었습니다.'
    });

  } catch (error) {
    console.error('트리거 함수 생성 오류:', error);
    return NextResponse.json({
      success: false,
      error: `트리거 함수 생성 중 오류가 발생했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`
    }, { status: 500 });
  }
} 