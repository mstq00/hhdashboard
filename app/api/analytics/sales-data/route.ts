import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { MappingService } from '@/lib/mappingService';
import { toKoreanTime } from '@/lib/utils/dateUtils';

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

export async function GET(request: NextRequest) {

  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const channel = searchParams.get('channel');

    if (!startDate || !endDate) {
      return NextResponse.json({ error: '시작일과 종료일이 필요합니다.' }, { status: 400 });
    }

    // 한국시간 기준으로 날짜 범위 조정
    // YYYY-MM-DD 형식의 날짜 문자열을 한국시간 기준으로 파싱
    const startDateTime = new Date(startDate + 'T00:00:00+09:00'); // 한국시간 명시
    const endDateTime = new Date(endDate + 'T23:59:59+09:00'); // 한국시간 명시

    // 유효한 날짜인지 확인
    if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
      return NextResponse.json({ error: '잘못된 날짜 형식입니다.' }, { status: 400 });
    }

    console.log('🔍 API 날짜 범위:', {
      startDate,
      endDate,
      startDateTime: `${startDateTime.getFullYear()}-${String(startDateTime.getMonth() + 1).padStart(2, '0')}-${String(startDateTime.getDate()).padStart(2, '0')}T${String(startDateTime.getHours()).padStart(2, '0')}:${String(startDateTime.getMinutes()).padStart(2, '0')}:${String(startDateTime.getSeconds()).padStart(2, '0')}`,
      endDateTime: `${endDateTime.getFullYear()}-${String(endDateTime.getMonth() + 1).padStart(2, '0')}-${String(endDateTime.getDate()).padStart(2, '0')}T${String(endDateTime.getHours()).padStart(2, '0')}:${String(endDateTime.getMinutes()).padStart(2, '0')}:${String(endDateTime.getSeconds()).padStart(2, '0')}`
    });

    const supabase = createServiceClient();

    // 배치로 모든 데이터 가져오기
    let allData: any[] = [];
    let hasMore = true;
    let from = 0;
    const batchSize = 1000;

    while (hasMore) {
      // 기본 쿼리 구성
      // 한국시간 기준 경계값을 문자열로 생성 (타임존 명시)
      const startBoundary = `${startDateTime.getFullYear()}-${String(startDateTime.getMonth() + 1).padStart(2, '0')}-${String(startDateTime.getDate()).padStart(2, '0')}T00:00:00+09:00`;
      const endBoundary = `${endDateTime.getFullYear()}-${String(endDateTime.getMonth() + 1).padStart(2, '0')}-${String(endDateTime.getDate()).padStart(2, '0')}T23:59:59+09:00`;

      let query = supabase
        .from('orders')
        .select(`
          id,
          channel,
          order_number,
          order_date,
          customer_name,
          customer_phone,
          product_name,
          product_option,
          quantity,
          unit_price,
          total_price,
          status,
          product_order_number
        `)
        .gte('order_date', startBoundary)
        .lte('order_date', endBoundary)
        .order('order_date', { ascending: true })
        .range(from, from + batchSize - 1);

      // 채널 필터 적용
      if (channel && channel !== 'all') {
        query = query.eq('channel', channel);
      }

      const { data, error } = await query;

      if (error) {
        console.error('DB 조회 오류:', error);
        return NextResponse.json({ error: '데이터 조회 중 오류가 발생했습니다.' }, { status: 500 });
      }

      if (data && data.length > 0) {
        allData = allData.concat(data);
        from += batchSize;
        
        // 배치 크기보다 적은 데이터가 오면 마지막 배치
        if (data.length < batchSize) {
          hasMore = false;
        }
      } else {
        hasMore = false;
      }
    }

    // 매핑 서비스 초기화
    const mappingService = new MappingService();
    await mappingService.loadMappingData();
    
    // 디버깅: 매핑된 데이터와 미매핑 데이터 개수 확인
    let mappedCount = 0;
    let unmappedCount = 0;
    let cancelledCount = 0;

    // 데이터 변환 및 매핑 정보 적용
    const transformedData = allData.map(item => {
      // DB 원본 데이터 로깅 (각 채널별 첫 번째 항목만)
      const isFirstForChannel = allData.findIndex(data => data.channel === item.channel) === allData.indexOf(item);
      if (isFirstForChannel) {
        console.log(`🔍 ${item.channel} 채널 첫 번째 DB 원본 order_date:`, {
          channel: item.channel,
          orderNumber: item.order_number,
          original: item.order_date,
          type: typeof item.order_date,
          parsed: new Date(item.order_date)
        });
      }

      // 매핑 정보 가져오기 (주문일 기준 가격 적용)
      // 한국시간 기준으로 YYYY-MM-DD 문자열 생성
      const orderDateForPricing = (() => {
        try {
          const kst = toKoreanTime(item.order_date);
          const y = kst.getFullYear();
          const m = String(kst.getMonth() + 1).padStart(2, '0');
          const d = String(kst.getDate()).padStart(2, '0');
          return `${y}-${m}-${d}`;
        } catch {
          return undefined;
        }
      })();

      const mappingInfo = mappingService.getMappedProductInfo(
        item.product_name,
        item.product_option,
        item.channel,
        orderDateForPricing
      );

      // 한국시간 기준으로 주문일시 처리
      // DB에 이미 한국시간으로 저장되어 있으므로 그대로 사용
      const orderDate = new Date(item.order_date);
      
      // 디버깅: 첫 번째 항목의 날짜 정보 로깅
      if (allData.indexOf(item) === 0) {
        console.log('🔍 첫 번째 DB 항목 날짜 정보:', {
          original: item.order_date,
          parsed: orderDate.toISOString(),
          local: orderDate.toString(),
          year: orderDate.getFullYear(),
          month: orderDate.getMonth() + 1,
          day: orderDate.getDate(),
          hours: orderDate.getHours()
        });
      }
      
      const formatKoreanDateString = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        // 한국시간 표기 일관화를 위해 +09:00 타임존을 명시적으로 포함
        return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}+09:00`;
      };

      // 기본 데이터 구조
      const baseData = {
        channel: item.channel,
        orderNumber: item.order_number,
        orderDate: formatKoreanDateString(orderDate), // 한국시간 기준 문자열
        customerName: item.customer_name || '',
        customerID: item.customer_phone || '',
        productName: item.product_name || '',
        optionName: item.product_option || '',
        quantity: item.quantity || 0,
        price: item.unit_price || 0,
        status: item.status || '',
        productOrderNumber: item.product_order_number || '',
        totalSales: item.total_price || 0
      };

      // 취소/환불/미결제취소 상태인지 확인
      const isCancelledOrder = ['취소', '환불', '미결제취소', '반품', '구매취소', '주문취소'].includes(item.status);
      
      // 매핑 정보가 있고 유효한 주문인 경우 가격 계산 적용
      if (mappingInfo && !isCancelledOrder) {
        mappedCount++;
        const quantity = item.quantity || 0;
        const mappedPrice = mappingInfo.price || 0;
        const mappedCost = mappingInfo.cost || 0;
        const commissionRate = mappingInfo.fee || 0;

        // 매출액 계산
        const sales = mappedPrice * quantity;
        
        // 순이익 계산 (매출액 - 공급가)
        const netProfit = (mappedPrice - mappedCost) * quantity;
        
        // 수수료 금액 계산
        const commissionAmount = sales * (commissionRate / 100);
        
        // 영업이익 계산 (순이익 - 수수료)
        const operatingProfit = netProfit - commissionAmount;



        return {
          ...baseData,
          mappedProductName: mappingInfo.product,
          mappedOptionName: mappingInfo.option,
          price: mappedPrice,
          totalSales: sales,
          commissionRate: commissionRate,
          commissionAmount: commissionAmount,
          netProfit: netProfit,
          operatingProfit: operatingProfit,
          marginRate: sales > 0 ? ((netProfit / sales) * 100).toFixed(1) : '0.0',
          operatingMarginRate: sales > 0 ? ((operatingProfit / sales) * 100).toFixed(1) : '0.0',
          matchingStatus: '매핑완료',
          isMapped: true
        };
      } else {
        // 매핑 정보가 없거나 취소/환불/미결제취소 주문인 경우
        if (isCancelledOrder) {
          cancelledCount++;
        } else {
          unmappedCount++;
        }
        return {
          ...baseData,
          mappedProductName: mappingInfo?.product || null,
          mappedOptionName: mappingInfo?.option || null,
          commissionRate: 0,
          commissionAmount: 0,
          netProfit: 0,
          operatingProfit: 0,
          marginRate: '0.0',
          operatingMarginRate: '0.0',
          matchingStatus: isCancelledOrder ? '취소주문' : (mappingInfo ? '매핑완료' : '미매핑'),
          isMapped: !!mappingInfo,
          isCancelled: isCancelledOrder
        };
      }
    }) || [];



    // 디버깅 정보 출력
    console.log('🔍 데이터 처리 결과:', {
      totalData: allData.length,
      transformedData: transformedData.length,
      mappedCount,
      unmappedCount,
      cancelledCount,
      mappingRate: `${((mappedCount / transformedData.length) * 100).toFixed(1)}%`
    });

    const response = NextResponse.json({
      success: true,
      data: transformedData,
      total: transformedData.length
    });
    
    // CORS 헤더 추가
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    return response;

  } catch (error) {
    console.error('API 오류:', error);
    const errorResponse = NextResponse.json({ 
      error: '서버 오류가 발생했습니다.',
      details: error instanceof Error ? error.message : '알 수 없는 오류'
    }, { status: 500 });
    
    // CORS 헤더 추가
    errorResponse.headers.set('Access-Control-Allow-Origin', '*');
    errorResponse.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    errorResponse.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    return errorResponse;
  }
} 