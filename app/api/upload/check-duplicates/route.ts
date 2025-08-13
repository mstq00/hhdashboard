import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

// 재시도 함수
async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      console.error(`시도 ${attempt}/${maxRetries} 실패:`, error);
      
      if (attempt === maxRetries) {
        throw error;
      }
      
      // 지수 백오프로 대기 시간 증가
      await new Promise(resolve => setTimeout(resolve, delay * attempt));
    }
  }
  throw new Error('모든 재시도 실패');
}

export async function POST(request: NextRequest) {
  try {
    const { orderItems, channel } = await request.json();

    if (!orderItems || !Array.isArray(orderItems)) {
      return NextResponse.json({ error: '주문 데이터가 필요합니다.' }, { status: 400 });
    }

    if (!channel) {
      return NextResponse.json({ error: '채널 정보가 필요합니다.' }, { status: 400 });
    }

    console.log('중복 검증 시작:', {
      totalItems: orderItems.length,
      channel: channel
    });

    // 중복 검증을 위한 쿼리
    const orderNumbers = orderItems
      .map(item => item.order_number)
      .filter(Boolean);

    if (orderNumbers.length === 0) {
      console.log('주문번호가 없어 중복 검증을 건너뜁니다.');
      return NextResponse.json({
        success: true,
        data: {
          total: orderItems.length,
          duplicates: 0,
          newItems: orderItems.length
        }
      });
    }

    // Supabase 클라이언트 생성 및 연결 테스트
    const supabase = createServiceClient();
    
    // 연결 테스트
    try {
      await retryOperation(async () => {
        const { error } = await supabase
          .from('orders')
          .select('count', { count: 'exact', head: true })
          .limit(1);
        
        if (error) {
          throw error;
        }
      }, 3, 1000);
      
      console.log('Supabase 연결 성공');
    } catch (connectionError) {
      console.error('Supabase 연결 실패:', connectionError);
      return NextResponse.json({
        success: true,
        data: {
          total: orderItems.length,
          duplicates: 0,
          newItems: orderItems.length,
          message: '데이터베이스 연결 실패로 모든 항목을 새로운 항목으로 처리합니다.'
        }
      });
    }

    // 채널별로 다른 중복 검증 기준 적용
    let existingOrders;
    let error;

    try {
      if (channel === 'smartstore' || channel === 'YTshopping' || channel === 'ytshopping') {
        // 스마트스토어와 유튜브쇼핑: 상품주문번호, 주문번호, 상품명, 옵션명 체크
        const result = await retryOperation(async () => {
          return await supabase
            .from('orders')
            .select('order_number, product_order_number, product_name, product_option')
            .in('order_number', orderNumbers)
            .eq('channel', channel);
        }, 3, 1000);

        existingOrders = result.data;
        error = result.error;
      } else {
        // 다른 채널들: 주문번호, 상품명, 옵션명 체크
        const result = await retryOperation(async () => {
          return await supabase
            .from('orders')
            .select('order_number, product_name, product_option')
            .in('order_number', orderNumbers)
            .eq('channel', channel);
        }, 3, 1000);

        existingOrders = result.data;
        error = result.error;
      }
    } catch (queryError) {
      console.error('데이터베이스 조회 실패:', queryError);
      return NextResponse.json({
        success: true,
        data: {
          total: orderItems.length,
          duplicates: 0,
          newItems: orderItems.length,
          message: '데이터베이스 조회 실패로 모든 항목을 새로운 항목으로 처리합니다.'
        }
      });
    }

    if (error) {
      console.error('중복 검증 오류:', error);
      return NextResponse.json({
        success: true,
        data: {
          total: orderItems.length,
          duplicates: 0,
          newItems: orderItems.length,
          message: '중복 검증 실패로 모든 항목을 새로운 항목으로 처리합니다.'
        }
      });
    }

    console.log('기존 데이터 조회 완료:', {
      existingCount: existingOrders?.length || 0,
      channel: channel
    });

    // 중복 데이터 계산
    const duplicateSet = new Set();
    const newItems = new Set();

    orderItems.forEach(item => {
      let isDuplicate = false;

      if (channel === 'smartstore' || channel === 'YTshopping' || channel === 'ytshopping') {
        // 스마트스토어와 유튜브쇼핑: 상품주문번호, 주문번호, 상품명, 옵션명이 모두 같아야 중복
        isDuplicate = existingOrders?.some(existing => 
          existing.order_number === item.order_number &&
          existing.product_order_number === item.product_order_number &&
          existing.product_name === item.product_name &&
          existing.product_option === item.product_option
        );
      } else {
        // 다른 채널들: 주문번호, 상품명, 옵션명이 같아야 중복
        isDuplicate = existingOrders?.some(existing => 
          existing.order_number === item.order_number &&
          existing.product_name === item.product_name &&
          existing.product_option === item.product_option
        );
      }

      if (isDuplicate) {
        if (channel === 'smartstore' || channel === 'YTshopping' || channel === 'ytshopping') {
          duplicateSet.add(`${item.order_number}-${item.product_order_number}-${item.product_name}-${item.product_option}`);
        } else {
          duplicateSet.add(`${item.order_number}-${item.product_name}-${item.product_option}`);
        }
      } else {
        if (channel === 'smartstore' || channel === 'YTshopping' || channel === 'ytshopping') {
          newItems.add(`${item.order_number}-${item.product_order_number}-${item.product_name}-${item.product_option}`);
        } else {
          newItems.add(`${item.order_number}-${item.product_name}-${item.product_option}`);
        }
      }
    });

    console.log('중복 검증 완료:', {
      total: orderItems.length,
      duplicates: duplicateSet.size,
      newItems: newItems.size,
      channel: channel
    });

    return NextResponse.json({
      success: true,
      data: {
        total: orderItems.length,
        duplicates: duplicateSet.size,
        newItems: newItems.size
      }
    });

  } catch (error) {
    console.error('중복 검증 오류:', error);
    return NextResponse.json(
      { 
        error: '중복 검증 중 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : '알 수 없는 오류'
      },
      { status: 500 }
    );
  }
} 