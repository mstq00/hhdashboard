import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const supabase = createServiceClient();
    
    console.log('Unique constraints 마이그레이션 시작...');
    
    // 마이그레이션을 단계별로 실행
    const migrationSteps = [
      // Step 1: 중복 데이터 정리
      `
      DELETE FROM orders 
      WHERE id IN (
        SELECT id FROM (
          SELECT 
            id,
            ROW_NUMBER() OVER (
              PARTITION BY 
                channel,
                order_number,
                COALESCE(product_order_number, ''),
                COALESCE(product_name, ''),
                COALESCE(product_option, '')
              ORDER BY created_at DESC
            ) as rn
          FROM orders
        ) ranked
        WHERE rn > 1
      );
      `,
      
      // Step 2: Smartstore unique index
      `
      CREATE UNIQUE INDEX IF NOT EXISTS unique_smartstore_order_product 
      ON orders (channel, order_number, product_order_number, product_name, product_option) 
      WHERE channel = 'smartstore' AND product_order_number IS NOT NULL;
      `,
      
      // Step 3: Other channels unique index
      `
      CREATE UNIQUE INDEX IF NOT EXISTS unique_other_channels_order_product 
      ON orders (channel, order_number, product_name, product_option) 
      WHERE channel != 'smartstore' OR product_order_number IS NULL;
      `
    ];
    
    for (let i = 0; i < migrationSteps.length; i++) {
      const step = migrationSteps[i];
      console.log(`Step ${i + 1} 실행 중...`);
      
      const { error } = await supabase.rpc('exec_sql', { sql: step });
      
      if (error) {
        console.error(`Step ${i + 1} 오류:`, error);
        return NextResponse.json({
          success: false,
          error: `Step ${i + 1} 실행 중 오류: ${error.message}`
        }, { status: 500 });
      }
      
      console.log(`Step ${i + 1} 완료`);
    }
    
    console.log('Unique constraints 마이그레이션 완료');
    
    return NextResponse.json({
      success: true,
      message: 'Unique constraints가 성공적으로 추가되었습니다.'
    });
    
  } catch (error) {
    console.error('Unique constraints 마이그레이션 오류:', error);
    return NextResponse.json({
      success: false,
      error: `마이그레이션 중 오류가 발생했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`
    }, { status: 500 });
  }
} 