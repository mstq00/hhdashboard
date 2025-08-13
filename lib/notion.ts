import { Client } from '@notionhq/client';
import { cache } from 'react';
import { MappingService, SalesItem } from './mappingService';

// 노션 클라이언트 초기화
const notion = new Client({
  auth: process.env.NOTION_API_KEY,
});

// 캐시 설정
const CACHE_DURATION = 60 * 60 * 1000; // 1시간
let totalSalesCache: { data: any; timestamp: number; year: number } | null = null;
let orderDataCache: { data: any; timestamp: number } | null = null;

// 캐시 유효성 검사
function isCacheValid(cache: { timestamp: number } | null): boolean {
  if (!cache) return false;
  return Date.now() - cache.timestamp < CACHE_DURATION;
}

// 연도별 통합매출 데이터 가져오기
export const fetchYearlyTotalSalesData = cache(async (year?: number) => {
  try {
    const currentYear = year || new Date().getFullYear();
    const mappingService = new MappingService();
    
    // 캐시 확인 (연도별로 다른 캐시)
    if (isCacheValid(totalSalesCache) && totalSalesCache!.year === currentYear) {
      console.log(`${currentYear}년 통합매출 데이터 캐시 사용`);
      return totalSalesCache!.data;
    }

    console.log(`${currentYear}년 통합매출 데이터 가져오는 중...`);

    // 공동구매 매출 데이터베이스 ID
    const groupSalesDbId = 'e6121c39c37c4d349032829e5b796c2c';
    // 유료광고 수익 데이터베이스 ID
    const adRevenueDbId = 'd04c779e1ee84e6d9dd062823ebb4ff8';
    

    // 월별 데이터를 저장할 객체 초기화
    const monthlyData: Record<number, {
      month: number,
      year: number,
      storeSales: number,
      adRevenue: number,
      groupSales: number,
      totalSales: number,
      notes: string
    }> = {};

    // 1~12월 데이터 초기화
    for (let month = 1; month <= 12; month++) {
      monthlyData[month] = {
        month,
        year: currentYear,
        storeSales: 0,
        adRevenue: 0, 
        groupSales: 0,
        totalSales: 0,
        notes: ''
      };
    }

    // 1. 공동구매 매출 데이터 가져오기
    console.log('공동구매 매출 데이터 가져오는 중...');
    try {
      const groupSalesInfo = await notion.databases.retrieve({
        database_id: groupSalesDbId,
      });
      
      console.log('공동구매 데이터베이스 속성:', Object.keys(groupSalesInfo.properties).join(', '));
      
      let groupSalesResponse;
      try {
        groupSalesResponse = await notion.databases.query({
          database_id: groupSalesDbId,
          filter: {
            and: [
              {
                property: '일정',
                date: {
                  on_or_after: `${currentYear}-01-01`,
                },
              },
              {
                property: '일정',
                date: {
                  before: `${currentYear+1}-01-01`,
                },
              },
            ],
          },
        });
      } catch (error) {
        console.log('공동구매 데이터 조회 오류, 필터 없이 재시도합니다.', error);
        groupSalesResponse = await notion.databases.query({
          database_id: groupSalesDbId,
        });
        console.log(`필터 없이 ${groupSalesResponse.results.length}개의 공동구매 매출 데이터를 가져왔습니다.`);
      }

      // 공동구매 데이터 처리
      groupSalesResponse.results.forEach((page: any, idx: number) => {
        const properties = page.properties;
        
        // 첫 번째 페이지의 전체 속성 구조 로깅 (디버깅용)
        if (idx === 0) {
          console.log('공동구매 첫 번째 페이지 속성 구조:');
          Object.keys(properties).forEach(key => {
            const prop = properties[key];
            console.log(`  속성명: ${key}, 타입: ${prop.type}`);
          });
        }
        
        // 일정(date) 속성에서 시작일 가져오기
        const scheduleProperty = findPropertyByType(properties, 'date', '일정', 'Schedule');
        const scheduleDateStr = getDateValue(properties, scheduleProperty);
        
        if (scheduleDateStr) {
          console.log(`일정 시작일: ${scheduleDateStr}`);
          const scheduleDate = new Date(scheduleDateStr);
          const month = scheduleDate.getMonth() + 1; // 0-11 => 1-12
          const year = scheduleDate.getFullYear();
          
          // 해당 연도의 데이터만 처리
          if (year === currentYear && month >= 1 && month <= 12) {
            // 매출액 가져오기
            const salesProperty = findPropertyByType(properties, 'number', '매출액', 'Sales Amount');
            const salesAmount = getNumberValue(properties, salesProperty);
            
            console.log(`${month}월 공동구매 매출: ${salesAmount}`);
            
            // 월별 데이터에 추가
            if (monthlyData[month]) {
              monthlyData[month].groupSales += salesAmount;
              console.log(`${month}월 공동구매 매출 누적: ${monthlyData[month].groupSales}`);
            }
          }
        } else {
          console.log('일정 속성을 찾을 수 없습니다');
        }
      });
      
      console.log('공동구매 매출 데이터 로드 완료');
    } catch (error) {
      console.error('공동구매 매출 데이터 로드 실패:', error);
    }

    // 2. 유료광고 수익 데이터 가져오기
    console.log('유료광고 수익 데이터 가져오는 중...');
    try {
      // 유료광고 수익 데이터베이스 ID 직접 지정
      const adRevenueDbId = 'd04c779e1ee84e6d9dd062823ebb4ff8';
      
      const adRevenueInfo = await notion.databases.retrieve({
        database_id: adRevenueDbId,
      });
      
      console.log('유료광고 데이터베이스 속성:', Object.keys(adRevenueInfo.properties).join(', '));
      
      let adRevenueResponse;
      try {
        adRevenueResponse = await notion.databases.query({
          database_id: adRevenueDbId,
          filter: {
            and: [
              {
                property: '정산입금일자',
                date: {
                  on_or_after: `${currentYear}-01-01`,
                },
              },
              {
                property: '정산입금일자',
                date: {
                  before: `${currentYear+1}-01-01`,
                },
              },
            ],
          },
        });
        
        console.log(`${adRevenueResponse.results.length}개의 유료광고 수익 데이터를 가져왔습니다.`);
      } catch (error) {
        console.log('유료광고 데이터 조회 오류, 필터 없이 재시도합니다.', error);
        adRevenueResponse = await notion.databases.query({
          database_id: adRevenueDbId,
        });
        console.log(`필터 없이 ${adRevenueResponse.results.length}개의 유료광고 수익 데이터를 가져왔습니다.`);
      }

      // 유료광고 데이터 처리
      adRevenueResponse.results.forEach((page: any, idx: number) => {
        const properties = page.properties;
        
        // 첫 번째 페이지의 전체 속성 구조 로깅 (디버깅용)
        if (idx === 0) {
          console.log('유료광고 첫 번째 페이지 속성 구조:');
          Object.keys(properties).forEach(key => {
            const prop = properties[key];
            console.log(`  속성명: ${key}, 타입: ${prop.type}`);
          });
        }
        
        // 정산입금일자 속성 가져오기
        const depositDateProperty = findPropertyByType(properties, 'date', '정산입금일자', 'Settlement Date');
        const depositDateStr = getDateValue(properties, depositDateProperty);
        
        if (depositDateStr) {
          console.log(`정산입금일자: ${depositDateStr}`);
          const depositDate = new Date(depositDateStr);
          const month = depositDate.getMonth() + 1; // 0-11 => 1-12
          const year = depositDate.getFullYear();
          
          // 해당 연도의 데이터만 처리
          if (year === currentYear && month >= 1 && month <= 12) {
            // 정산금액 가져오기
            const amountProperty = findPropertyByType(properties, 'number', '정산금액', 'Settlement Amount');
            const amount = getNumberValue(properties, amountProperty);
            
            console.log(`${month}월 유료광고 수익: ${amount}`);
            
            // 월별 데이터에 추가
            if (monthlyData[month] && amount) {
              monthlyData[month].adRevenue += amount;
              console.log(`${month}월 유료광고 수익 누적: ${monthlyData[month].adRevenue}`);
            }
          }
        } else {
          console.log('정산입금일자 속성을 찾을 수 없습니다');
        }
      });
      
      console.log('유료광고 수익 데이터 로드 완료');
    } catch (error) {
      console.error('유료광고 수익 데이터 로드 실패:', error);
    }

    // 3. 스토어 매출 데이터는 통합 매출 API에서 직접 처리하므로 여기서는 제거
    console.log('스토어 매출 데이터는 통합 매출 API에서 직접 처리됩니다.');
    
    // 4. 월별 합계 계산 (스토어 매출은 0으로 초기화, 통합 매출 API에서 채워짐)
    Object.values(monthlyData).forEach(data => {
      data.storeSales = 0; // 통합 매출 API에서 채워질 예정
      data.totalSales = data.storeSales + data.adRevenue + data.groupSales;
    });

    // 배열로 변환
    const resultData = Object.values(monthlyData);
    
    // 캐시 저장
    totalSalesCache = {
      data: resultData,
      timestamp: Date.now(),
      year: currentYear
    };
    
    return resultData;
  } catch (error) {
    console.error('통합매출 데이터 로드 실패:', error);
    return [];
  }
});

// 속성 타입별로 속성 찾기 (여러 가능한 이름으로 검색)
function findPropertyByType(properties: any, type: string, ...possibleNames: string[]): string | null {
  for (const key in properties) {
    if (properties[key].type === type && 
        (possibleNames.includes(key) || 
         possibleNames.some(name => key.toLowerCase().includes(name.toLowerCase())))) {
      return key;
    }
  }
  return null;
}

// 숫자 속성 값 가져오기
function getNumberValue(properties: any, propertyName: string | null): number {
  if (!propertyName || !properties[propertyName]) return 0;
  return properties[propertyName].number || 0;
}

// 리치텍스트 속성 값 가져오기
function getRichTextValue(properties: any, propertyName: string | null): string {
  if (!propertyName || !properties[propertyName]) return '';
  return properties[propertyName].rich_text?.map((text: any) => text.text.content).join('') || '';
}

// 통합매출 상세 데이터 가져오기
export const fetchTotalSalesDetailData = cache(async (month: number, year?: number) => {
  try {
    const currentYear = year || new Date().getFullYear();
    console.log(`${currentYear}년 ${month}월 통합매출 상세 데이터 가져오는 중...`);

    // 결과 데이터를 저장할 배열
    const detailData: any[] = [];
    
    // 1. 스토어 매출 상세 데이터 (판매채널별 매출)
    try {
      console.log(`스토어 매출 상세 데이터 가져오는 중...`);
      
      // Supabase 클라이언트 생성
      const { createClient } = await import('@supabase/supabase-js');
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      
      // 해당 월의 시작일과 끝일 계산
      const startDate = new Date(currentYear, month - 1, 1);
      const endDate = new Date(currentYear, month, 0); // 해당 월의 마지막 날
      
      // DB에서 해당 월의 데이터 가져오기
      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];
      
      const { data, error } = await supabase
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
        .gte('order_date', startDateStr)
        .lte('order_date', endDateStr)
        .order('order_date', { ascending: true });
      
      if (error) {
        throw new Error(`DB 쿼리 오류: ${error.message}`);
      }
      
      const allSalesData = data || [];
      
      // 유효한 데이터만 필터링
      const validSalesData = allSalesData.filter(item => {
        const isValid = item.order_number && 
          item.order_date && 
          item.product_name && 
          item.quantity > 0;
        
        if (!isValid) return false;
        
        const isCancelledOrder = ['취소', '환불', '미결제취소', '반품', '구매취소', '주문취소'].includes(item.status);
        return !isCancelledOrder;
      });
      
      // 채널별 매출 집계
      const channelSales: {[key: string]: number} = {};
      validSalesData.forEach(item => {
        const channel = item.channel || '기타';
        const sales = item.total_price || (item.unit_price * item.quantity);
        
        if (!channelSales[channel]) {
          channelSales[channel] = 0;
        }
        channelSales[channel] += sales;
      });
      
      // 스토어 매출 상세 데이터 추가
      Object.entries(channelSales).forEach(([channel, amount]) => {
        detailData.push({
          id: `store-${channel}`,
          date: `${currentYear}-${month.toString().padStart(2, '0')}`,
          channel: '스토어',
          category: channel,
          amount: amount,
          description: `${channel} 총 매출`,
          type: 'store'
        });
      });
      
      console.log(`${Object.keys(channelSales).length}개 채널의 스토어 매출 데이터 로드 완료`);
    } catch (error) {
      console.error('스토어 매출 상세 데이터 로드 실패:', error);
    }
    
    // 2. 유료광고 수익 상세 데이터
    try {
      console.log(`유료광고 수익 상세 데이터 가져오는 중...`);
      
      // 유료광고 수익 데이터베이스 ID 직접 지정
      const adRevenueDbId = 'd04c779e1ee84e6d9dd062823ebb4ff8';
      
      // 해당 월의 데이터만 필터링
      let adRevenueResponse;
      try {
        adRevenueResponse = await notion.databases.query({
          database_id: adRevenueDbId,
          filter: {
            and: [
              {
                property: '정산입금일자',
                date: {
                  on_or_after: `${currentYear}-${month.toString().padStart(2, '0')}-01`,
                },
              },
              {
                property: '정산입금일자',
                date: {
                  before: `${currentYear}-${(month + 1).toString().padStart(2, '0')}-01`,
                },
              },
            ],
          },
        });
        
        console.log(`${adRevenueResponse.results.length}개의 유료광고 수익 상세 데이터를 가져왔습니다.`);
      } catch (error) {
        console.log('유료광고 상세 데이터 조회 오류:', error);
        adRevenueResponse = { results: [] };
      }
      
      // 유료광고 데이터 처리
      adRevenueResponse.results.forEach((page: any) => {
        const properties = page.properties;
        
        // 속성 가져오기
        const nameProperty = findPropertyByType(properties, 'title', '이름', 'Name');
        const amountProperty = findPropertyByType(properties, 'number', '정산금액', 'Settlement Amount');
        const depositDateProperty = findPropertyByType(properties, 'date', '정산입금일자', 'Settlement Date');
        
        // 값 추출
        const name = nameProperty && properties[nameProperty]?.title?.map((text: any) => text.plain_text).join('') || '무제';
        const amount = getNumberValue(properties, amountProperty);
        const depositDateStr = getDateValue(properties, depositDateProperty);
        
        // 상세 데이터 추가
        detailData.push({
          id: page.id,
          date: depositDateStr || `${currentYear}-${month.toString().padStart(2, '0')}`,
          channel: '유료광고',
          category: name,
          amount: amount,
          description: `유료광고 수익`,
          type: 'adRevenue'
        });
      });
      
      console.log(`${adRevenueResponse.results.length}개의 유료광고 수익 상세 데이터 로드 완료`);
    } catch (error) {
      console.error('유료광고 수익 상세 데이터 로드 실패:', error);
    }
    
    // 3. 공동구매 매출 상세 데이터
    try {
      console.log(`공동구매 매출 상세 데이터 가져오는 중...`);
      
      // 공동구매 매출 데이터베이스 ID 직접 지정
      const groupSalesDbId = 'e6121c39c37c4d349032829e5b796c2c';
      
      // 해당 월의 데이터만 필터링
      let groupSalesResponse;
      try {
        groupSalesResponse = await notion.databases.query({
          database_id: groupSalesDbId,
          filter: {
            and: [
              {
                property: '일정',
                date: {
                  on_or_after: `${currentYear}-${month.toString().padStart(2, '0')}-01`,
                },
              },
              {
                property: '일정',
                date: {
                  before: `${currentYear}-${(month + 1).toString().padStart(2, '0')}-01`,
                },
              },
            ],
          },
        });
        
        console.log(`${groupSalesResponse.results.length}개의 공동구매 매출 상세 데이터를 가져왔습니다.`);
      } catch (error) {
        console.log('공동구매 상세 데이터 조회 오류:', error);
        groupSalesResponse = { results: [] };
      }
      
      // 공동구매 데이터 처리
      groupSalesResponse.results.forEach((page: any) => {
        const properties = page.properties;
        
        // 속성 가져오기
        const nameProperty = findPropertyByType(properties, 'title', '이름', 'Name');
        const salesProperty = findPropertyByType(properties, 'number', '매출액', 'Sales Amount');
        const settlementProperty = findPropertyByType(properties, 'number', '정산금액', 'Settlement Amount');
        const depositDateProperty = findPropertyByType(properties, 'date', '정산입금일', 'Settlement Date');
        
        // 값 추출
        const name = nameProperty && properties[nameProperty]?.title?.map((text: any) => text.plain_text).join('') || '무제';
        const salesAmount = getNumberValue(properties, salesProperty);
        const settlementAmount = getNumberValue(properties, settlementProperty);
        const depositDateStr = getDateValue(properties, depositDateProperty);
        
        // 정산 완료 여부
        const isSettlementComplete = !!depositDateStr;
        
        // 상세 데이터 추가
        detailData.push({
          id: page.id,
          date: depositDateStr || `${currentYear}-${month.toString().padStart(2, '0')}`,
          channel: '공동구매',
          category: name,
          amount: salesAmount,
          settlementAmount: settlementAmount,
          description: `공동구매 매출${settlementAmount ? ` (정산금액: ${settlementAmount.toLocaleString()}원)` : ''}`,
          isSettlementComplete: isSettlementComplete,
          type: 'groupSales'
        });
      });
      
      console.log(`${groupSalesResponse.results.length}개의 공동구매 매출 상세 데이터 로드 완료`);
    } catch (error) {
      console.error('공동구매 매출 상세 데이터 로드 실패:', error);
    }
    
    // 타입 순서대로 정렬 (스토어 > 유료광고 > 공동구매)
    const typeOrder = { 'store': 0, 'adRevenue': 1, 'groupSales': 2 };
    detailData.sort((a, b) => {
      // 먼저 타입별로 정렬
      const typeOrderA = typeOrder[a.type as keyof typeof typeOrder] || 0;
      const typeOrderB = typeOrder[b.type as keyof typeof typeOrder] || 0;
      if (typeOrderA !== typeOrderB) {
        return typeOrderA - typeOrderB;
      }
      
      // 같은 타입 내에서는 금액 큰 순으로
      return b.amount - a.amount;
    });
    
    console.log(`${detailData.length}개의 통합매출 상세 데이터 로드 완료`);
    return detailData;
  } catch (error) {
    console.error('통합매출 상세 데이터 로드 실패:', error);
    return [];
  }
});

// 발주 데이터 가져오기
export const fetchOrderData = cache(async () => {
  try {
    // 캐시 확인
    if (isCacheValid(orderDataCache)) {
      console.log('발주 데이터 캐시 사용');
      return orderDataCache!.data;
    }

    console.log('발주 데이터 가져오는 중...');

    // 노션 데이터베이스 ID는 환경 변수에서 가져옴
    const databaseId = process.env.NOTION_ORDER_DATABASE_ID;
    
    if (!databaseId) {
      throw new Error('NOTION_ORDER_DATABASE_ID 환경 변수가 설정되지 않았습니다.');
    }

    // 데이터베이스 구조 조회
    const databaseInfo = await notion.databases.retrieve({
      database_id: databaseId,
    });
    
    console.log('발주 데이터베이스 속성:', Object.keys(databaseInfo.properties).join(', '));

    // 노션 DB 쿼리 (필터 없이 모든 발주 데이터)
    const response = await notion.databases.query({
      database_id: databaseId,
      sorts: [
        {
          property: 'OrderDate',
          direction: 'descending',
        },
      ],
    });

    // 데이터 변환
    const orderData = response.results.map((page: any) => {
      const properties = page.properties;
      
      // 속성 찾기
      const orderNumberProperty = findPropertyByTitle(properties, 'OrderNumber', '발주번호', '주문번호');
      const orderDateProperty = findPropertyByType(properties, 'date', 'OrderDate', '발주일', '발주날짜', '주문일');
      const supplierProperty = findPropertyByType(properties, 'select', 'Supplier', '공급업체', '업체');
      const statusProperty = findPropertyByType(properties, 'select', 'Status', '상태', '진행상태');
      const totalAmountProperty = findPropertyByType(properties, 'number', 'TotalAmount', '총금액', '합계');
      const itemsProperty = findPropertyByType(properties, 'rich_text', 'Items', '상품', '품목');
      const trackingNumberProperty = findPropertyByType(properties, 'rich_text', 'TrackingNumber', '추적번호', '송장번호');
      const notesProperty = findPropertyByType(properties, 'rich_text', 'Notes', '비고', '메모');
      
      return {
        id: page.id,
        orderNumber: getTitleValue(properties, orderNumberProperty),
        orderDate: getDateValue(properties, orderDateProperty),
        supplier: getSelectValue(properties, supplierProperty),
        status: getSelectValue(properties, statusProperty) || '대기',
        totalAmount: getNumberValue(properties, totalAmountProperty),
        items: getRichTextValue(properties, itemsProperty),
        trackingNumber: getRichTextValue(properties, trackingNumberProperty),
        notes: getRichTextValue(properties, notesProperty),
        lastUpdated: page.last_edited_time,
      };
    });

    // 캐시 업데이트
    orderDataCache = {
      data: orderData,
      timestamp: Date.now(),
    };

    console.log(`${orderData.length}개의 발주 데이터 로드 완료`);
    return orderData;
  } catch (error) {
    console.error('발주 데이터 로드 실패:', error);
    return [];
  }
});

// 타이틀 속성 찾기 (titie 타입의 속성 찾기)
function findPropertyByTitle(properties: any, ...possibleNames: string[]): string | null {
  for (const key in properties) {
    if (properties[key].type === 'title' &&
        (possibleNames.includes(key) || 
         possibleNames.some(name => key.toLowerCase().includes(name.toLowerCase())))) {
      return key;
    }
  }
  return null;
}

// 타이틀 값 가져오기
function getTitleValue(properties: any, propertyName: string | null): string {
  if (!propertyName || !properties[propertyName]) return '';
  return properties[propertyName].title?.[0]?.text?.content || properties[propertyName].title?.[0]?.plain_text || '';
}

// 날짜 값 가져오기
function getDateValue(properties: any, propertyName: string | null): string {
  if (!propertyName || !properties[propertyName]) return '';
  return properties[propertyName].date?.start || '';
}

// 선택 값 가져오기
function getSelectValue(properties: any, propertyName: string | null): string {
  if (!propertyName || !properties[propertyName]) return '';
  return properties[propertyName].select?.name || '';
}

// 발주 상태 업데이트
export async function updateOrderStatus(orderId: string, newStatus: string) {
  try {
    await notion.pages.update({
      page_id: orderId,
      properties: {
        Status: {
          select: {
            name: newStatus,
          },
        },
      },
    });
    
    // 캐시 무효화
    orderDataCache = null;
    
    console.log(`발주 상태 업데이트 완료: ${orderId} -> ${newStatus}`);
    return true;
  } catch (error) {
    console.error('발주 상태 업데이트 실패:', error);
    return false;
  }
}

// 캐시 지우기
export function clearNotionCache() {
  totalSalesCache = null;
  orderDataCache = null;
  console.log('노션 데이터 캐시 초기화 완료');
}

// 월별 상세 매출 데이터 가져오기
export async function fetchMonthlySalesData(year: number, month: number): Promise<SalesItem[]> {
  try {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);
    
    // Supabase 클라이언트 생성
    const { createClient } = await import('@supabase/supabase-js');
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // DB에서 해당 월의 데이터 가져오기
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];
    
    const { data, error } = await supabase
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
      .gte('order_date', startDateStr)
      .lte('order_date', endDateStr)
      .order('order_date', { ascending: true });
    
    if (error) {
      throw new Error(`DB 쿼리 오류: ${error.message}`);
    }
    
    const allSalesData = data || [];
    
    // 유효한 데이터만 필터링
    const validSalesData = allSalesData.filter(item => {
      const isValid = item.order_number && 
        item.order_date && 
        item.product_name && 
        item.quantity > 0;
      
      if (!isValid) return false;
      
      const isCancelledOrder = ['취소', '환불', '미결제취소', '반품', '구매취소', '주문취소'].includes(item.status);
      return !isCancelledOrder;
    });
    
    // 매핑 서비스 초기화
    const mappingService = new MappingService();
    await mappingService.loadMappingData();
    
    // 채널명 정규화 함수
    const normalizeChannelName = (channel: string) => {
      const channelMap: Record<string, string> = {
        'smartstore': 'smartstore',
        'ohouse': 'ohouse', 
        'ytshopping': 'ytshopping',
        'coupang': 'coupang'
      };
      return channelMap[channel.toLowerCase()] || channel.toLowerCase();
    };

    // 매핑 정보 적용
    const processedData = validSalesData.map((item: any) => {
      const mappingInfo = mappingService.getMappedProductInfo(
        item.product_name,
        item.product_option,
        item.channel
      );
      
      if (mappingInfo && !['취소', '미결제취소', '반품'].includes(item.status)) {
        return {
          ...item,
          price: mappingInfo.price,
          totalSales: mappingInfo.price * item.quantity,
          netProfit: (mappingInfo.price - mappingInfo.cost) * item.quantity,
          commissionAmount: (mappingInfo.price * item.quantity * (item.commissionRate / 100)),
          matchingStatus: '매핑완료'
        };
      } else {
        return {
          ...item,
          matchingStatus: '미매핑'
        };
      }
    });

    // 채널별 매출 집계
    const channelSales: Record<string, number> = {};
    const channelNames: Record<string, string> = {
      'smartstore': '스마트스토어',
      'ohouse': '오늘의집',
      'ytshopping': '유튜브쇼핑',
      'coupang': '쿠팡'
    };
    
    // 각 채널별 매출 합계 계산
    processedData.forEach(item => {
      const normalizedChannel = normalizeChannelName(item.channel);
      if (!channelSales[normalizedChannel]) {
        channelSales[normalizedChannel] = 0;
      }
      channelSales[normalizedChannel] += (item.totalSales || (item.unit_price * item.quantity) || 0);
    });
    
    // 노션에서 공동구매 및 유료광고 데이터 가져오기
    // 1. 노션에서 기본 데이터 가져오기
    const notionData = await fetchYearlyTotalSalesData(year);
    const monthData = notionData.find((item: any) => item.month === month);

    // 2. 공동구매 및 유료광고 상세 데이터 가져오기
    const notionDetailData = await fetchTotalSalesDetailData(month, year);
    
    // 최종 결과 생성 (채널별 스토어 매출 + 공동구매 + 유료광고)
    const result: SalesItem[] = [];
    
    // 스토어 매출 데이터 (채널별로 집계)
    Object.keys(channelSales).forEach(channel => {
      if (channelSales[channel] > 0) {
        result.push({
          channel: channelNames[channel] || channel,
          orderNumber: '-',
          orderDate: `${year}-${month.toString().padStart(2, '0')}-01`,
          customerName: '-',
          customerID: '-',
          productName: '월 통합 매출',
          optionName: '-',
          quantity: 0,
          price: 0,
          commissionRate: 0,
          commissionAmount: 0,
          netProfit: 0,
          status: '완료',
          type: "storeSales",
          category: '스토어 매출',
          amount: channelSales[channel]
        });
      }
    });
    
    // 공동구매 매출 데이터 (노션에서 가져오기)
    // 상세 정보 가져와서 각각 표시
    const groupSalesDetails = notionDetailData.filter(item => item.type === 'groupSales');
    if (groupSalesDetails.length > 0) {
      // 각 공동구매 항목 추가
      groupSalesDetails.forEach(detail => {
        result.push({
          channel: "공동구매",
          orderNumber: '-',
          orderDate: detail.date || `${year}-${month.toString().padStart(2, '0')}-01`,
          customerName: '-',
          customerID: '-',
          productName: detail.category || '공동구매',
          optionName: '-',
          quantity: 0,
          price: 0,
          commissionRate: 0,
          commissionAmount: 0,
          netProfit: 0,
          status: '완료',
          type: "groupSales",
          category: detail.category || '공동구매 매출',
          amount: detail.amount,
          isSettlementComplete: detail.isSettlementComplete,
          settlementAmount: detail.settlementAmount
        });
      });
    } else if (monthData && monthData.groupSales > 0) {
      // 상세 정보가 없는 경우 기존 방식으로 표시
      result.push({
        channel: "공동구매",
        orderNumber: '-',
        orderDate: `${year}-${month.toString().padStart(2, '0')}-01`,
        customerName: '-',
        customerID: '-',
        productName: '월 공동구매 매출',
        optionName: '-',
        quantity: 0,
        price: 0,
        commissionRate: 0,
        commissionAmount: 0,
        netProfit: 0,
        status: '완료',
        type: "groupSales",
        category: '공동구매 매출',
        amount: monthData.groupSales
      });
    }
    
    // 유료광고 수익 데이터 (노션에서 가져오기)
    // 상세 정보 가져와서 각각 표시
    const adRevenueDetails = notionDetailData.filter(item => item.type === 'adRevenue');
    if (adRevenueDetails.length > 0) {
      // 각 유료광고 항목 추가
      adRevenueDetails.forEach(detail => {
        result.push({
          channel: "유료광고",
          orderNumber: '-',
          orderDate: detail.date || `${year}-${month.toString().padStart(2, '0')}-01`,
          customerName: '-',
          customerID: '-',
          productName: detail.category || '유료광고',
          optionName: '-',
          quantity: 0,
          price: 0,
          commissionRate: 0,
          commissionAmount: 0,
          netProfit: 0,
          status: '완료',
          type: "adRevenue",
          category: detail.category || '유료광고 수익',
          amount: detail.amount
        });
      });
    } else if (monthData && monthData.adRevenue > 0) {
      // 상세 정보가 없는 경우 기존 방식으로 표시
      result.push({
        channel: "유료광고",
        orderNumber: '-',
        orderDate: `${year}-${month.toString().padStart(2, '0')}-01`,
        customerName: '-',
        customerID: '-',
        productName: '월 유료광고 수익',
        optionName: '-',
        quantity: 0,
        price: 0,
        commissionRate: 0,
        commissionAmount: 0,
        netProfit: 0,
        status: '완료',
        type: "adRevenue",
        category: '유료광고 수익',
        amount: monthData.adRevenue
      });
    }

    return result;
  } catch (error) {
    console.error('매출 데이터 가져오기 오류:', error);
    throw error;
  }
} 