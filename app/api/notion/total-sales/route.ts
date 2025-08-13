import { NextResponse } from 'next/server';
import { fetchYearlyTotalSalesData, fetchMonthlySalesData } from '@/lib/notion';
import { createClient } from '@supabase/supabase-js';
import { subMonths } from 'date-fns';
import { MappingService } from '@/lib/mappingService';
import { Client } from '@notionhq/client';

// 노션 클라이언트 생성
const notionClient = new Client({
  auth: process.env.NOTION_API_KEY,
});

// Supabase 클라이언트 생성
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// 서버 사이드에서 직접 DB에서 데이터를 가져오는 함수
async function fetchSalesDataFromDBDirectly(startDate: Date, endDate: Date) {
  try {
    // 한국시간 기준으로 날짜 범위 조정
    const startDateTime = new Date(startDate);
    const endDateTime = new Date(endDate);
    
    // Supabase 쿼리용 KST 날짜 문자열 생성 (DB의 order_date 형식과 맞춤)
    const startDateKST = `${startDateTime.getFullYear()}-${String(startDateTime.getMonth() + 1).padStart(2, '0')}-${String(startDateTime.getDate()).padStart(2, '0')}T00:00:00+00:00`;
    const endDateKST = `${endDateTime.getFullYear()}-${String(endDateTime.getMonth() + 1).padStart(2, '0')}-${String(endDateTime.getDate()).padStart(2, '0')}T23:59:59+00:00`;
    
    // 배치로 모든 데이터 가져오기
    let allData: any[] = [];
    let hasMore = true;
    let from = 0;
    const batchSize = 1000;

    while (hasMore) {
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
        .gte('order_date', startDateKST)
        .lte('order_date', endDateKST)
        .order('order_date', { ascending: true })
        .range(from, from + batchSize - 1);

      if (error) {
        throw new Error(`DB 쿼리 오류: ${error.message}`);
      }

      if (data && data.length > 0) {
        allData = allData.concat(data);
        from += batchSize;
        
        if (data.length < batchSize) {
          hasMore = false;
        }
      } else {
        hasMore = false;
      }
    }
    
    return allData;
  } catch (error) {
    console.error('DB 데이터 조회 오류:', error);
    throw error;
  }
}

// 유효한 판매 데이터만 필터링하는 함수
function filterValidSalesData(data: any[]) {
  return data.filter(item => {
    // 기본 유효성 검사
    const isValid = item.order_number && 
      item.order_date && 
      item.product_name && 
      item.quantity > 0;
    
    if (!isValid) return false;
    
    // 취소/환불/미결제취소 상태인지 확인
    const isCancelledOrder = ['취소', '환불', '미결제취소', '반품', '구매취소', '주문취소'].includes(item.status);
    
    // 취소된 주문은 제외
    return !isCancelledOrder;
  });
}

// 공동구매 정산금액 가져오기
async function fetchGroupSettlementData(year: number) {
  try {
    const groupSalesDbId = 'e6121c39c37c4d349032829e5b796c2c';
    
    const response = await notionClient.databases.query({
      database_id: groupSalesDbId,
    });
    
    const monthlySettlement: Record<number, number> = {};
    
    // 1~12월 초기화
    for (let month = 1; month <= 12; month++) {
      monthlySettlement[month] = 0;
    }
    
    response.results.forEach((page: any) => {
      const properties = page.properties;
      
      // 일정(date) 속성에서 시작일 가져오기
      const scheduleProperty = findPropertyByType(properties, 'date', '일정', 'Schedule');
      const scheduleDateStr = getDateValue(properties, scheduleProperty);
      
      if (scheduleDateStr) {
        const scheduleDate = new Date(scheduleDateStr);
        const month = scheduleDate.getMonth() + 1;
        const itemYear = scheduleDate.getFullYear();
        
        // 해당 연도의 데이터만 처리
        if (itemYear === year && month >= 1 && month <= 12) {
          // 정산금액 가져오기
          const settlementProperty = findPropertyByType(properties, 'number', '정산금액', 'Settlement Amount');
          const settlementAmount = getNumberValue(properties, settlementProperty);
          
          if (settlementAmount > 0) {
            monthlySettlement[month] += settlementAmount;
          }
        }
      }
    });
    
    return monthlySettlement;
  } catch (error) {
    console.error('공동구매 정산금액 조회 오류:', error);
    return {};
  }
}

// 광고 매출 상세 정보 가져오기
async function fetchAdRevenueDetails(year: number, month: number) {
  try {
    const adRevenueDbId = 'd04c779e1ee84e6d9dd062823ebb4ff8';
    
    const response = await notionClient.databases.query({
      database_id: adRevenueDbId,
    });
    
    const adDetails: any[] = [];
    
    response.results.forEach((page: any) => {
      const properties = page.properties;
      
      // 정산입금일자 속성에서 날짜 가져오기
      const depositDateProperty = findPropertyByType(properties, 'date', '정산입금일자', 'Settlement Date');
      const depositDateStr = getDateValue(properties, depositDateProperty);
      
      if (depositDateStr) {
        const depositDate = new Date(depositDateStr);
        const itemMonth = depositDate.getMonth() + 1;
        const itemYear = depositDate.getFullYear();
        
        // 해당 연도와 월의 데이터만 처리
        if (itemYear === year && itemMonth === month) {
          // 이름 가져오기
          const nameProperty = findPropertyByType(properties, 'title', '이름', 'Name');
          const name = getTitleValue(properties, nameProperty);
          
          // 정산금액 가져오기
          const amountProperty = findPropertyByType(properties, 'number', '정산금액', 'Settlement Amount');
          const amount = getNumberValue(properties, amountProperty);
          
          if (amount > 0) {
            adDetails.push({
              name: name || '광고 수익',
              amount: amount
            });
          }
        }
      }
    });
    
    return adDetails;
  } catch (error) {
    console.error('광고 매출 상세 정보 조회 오류:', error);
    return [];
  }
}

// 공동구매 매출 상세 정보 가져오기
async function fetchGroupSalesDetails(year: number, month: number) {
  try {
    const groupSalesDbId = 'e6121c39c37c4d349032829e5b796c2c';
    
    const response = await notionClient.databases.query({
      database_id: groupSalesDbId,
    });
    
    const groupDetails: any[] = [];
    
    response.results.forEach((page: any) => {
      const properties = page.properties;
      
      // 일정(date) 속성에서 시작일 가져오기
      const scheduleProperty = findPropertyByType(properties, 'date', '일정', 'Schedule');
      const scheduleDateStr = getDateValue(properties, scheduleProperty);
      
      if (scheduleDateStr) {
        const scheduleDate = new Date(scheduleDateStr);
        const itemMonth = scheduleDate.getMonth() + 1;
        const itemYear = scheduleDate.getFullYear();
        
        // 해당 연도와 월의 데이터만 처리
        if (itemYear === year && itemMonth === month) {
          // 이름 가져오기
          const nameProperty = findPropertyByType(properties, 'title', '이름', 'Name');
          const name = getTitleValue(properties, nameProperty);
          
          // 매출액 가져오기
          const salesProperty = findPropertyByType(properties, 'number', '매출액', 'Sales Amount');
          const salesAmount = getNumberValue(properties, salesProperty);
          
          // 정산금액 가져오기
          const settlementProperty = findPropertyByType(properties, 'number', '정산금액', 'Settlement Amount');
          const settlementAmount = getNumberValue(properties, settlementProperty);
          
          if (salesAmount > 0) {
            groupDetails.push({
              name: name || '공동구매 매출',
              salesAmount: salesAmount,
              settlementAmount: settlementAmount
            });
          }
        }
      }
    });
    
    return groupDetails;
  } catch (error) {
    console.error('공동구매 매출 상세 정보 조회 오류:', error);
    return [];
  }
}

// 속성 타입별로 속성 찾기
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

// 날짜 속성 값 가져오기
function getDateValue(properties: any, propertyName: string | null): string {
  if (!propertyName || !properties[propertyName]) return '';
  return properties[propertyName].date?.start || '';
}

// 제목 속성 값 가져오기
function getTitleValue(properties: any, propertyName: string | null): string {
  if (!propertyName || !properties[propertyName]) return '';
  return properties[propertyName].title?.map((text: any) => text.text.content).join('') || '';
}

export async function GET(request: Request) {
  try {
    // URL에서 year와 month 쿼리 파라미터 추출
    const { searchParams } = new URL(request.url);
    const yearParam = searchParams.get('year');
    const monthParam = searchParams.get('month');
    
    const year = yearParam ? parseInt(yearParam) : undefined;
    const month = monthParam ? parseInt(monthParam) : undefined;
    
    // 월 파라미터가 있으면 특정 월의 상세 데이터 가져오기
    if (month && month >= 1 && month <= 12 && year) {
      const detailData = await fetchMonthlySalesData(year, month);
      
      // 해당 월의 공동구매 정산금액과 상세 정보 가져오기
      const groupSettlementData = await fetchGroupSettlementData(year);
      const settlementAmount = groupSettlementData[month] || 0;
      
      // 해당 월의 광고 매출 상세 정보 가져오기
      const adRevenueDetails = await fetchAdRevenueDetails(year, month);
      
      // 해당 월의 공동구매 매출 상세 정보 가져오기
      const groupSalesDetails = await fetchGroupSalesDetails(year, month);
      
      return NextResponse.json({
        success: true,
        data: detailData,
        settlementAmount: settlementAmount,
        adRevenueDetails: adRevenueDetails,
        groupSalesDetails: groupSalesDetails,
        year,
        month,
      });
    }
    
    // 연간 데이터 준비
    const currentYear = year || new Date().getFullYear();
    
    // 1. DB에서 스토어 판매 데이터 가져오기 (최근 1년)
    const endDate = new Date();
    const startDate = subMonths(endDate, 12);
    const allSalesData = await fetchSalesDataFromDBDirectly(startDate, endDate);
    const validSalesData = filterValidSalesData(allSalesData);
    
    // 2. 노션에서 공동구매 및 유료광고 데이터 가져오기
    const notionData = await fetchYearlyTotalSalesData(currentYear);
    
    // 3. 공동구매 정산금액 가져오기
    const groupSettlementData = await fetchGroupSettlementData(currentYear);
    
    // 월별 데이터를 저장할 객체 초기화
    const monthlyData: Record<number, {
      id: string,
      month: number,
      year: number,
      storeSales: number,
      adRevenue: number,
      groupSales: number,
      totalSales: number,
      expectedProfit: number,
      notes: string
    }> = {};

    // 1~12월 데이터 초기화
    for (let month = 1; month <= 12; month++) {
      monthlyData[month] = {
        id: `${currentYear}-${month}`,
        month,
        year: currentYear,
        storeSales: 0,
        adRevenue: 0, 
        groupSales: 0,
        totalSales: 0,
        expectedProfit: 0,
        notes: ''
      };
      
      // 노션 데이터에서 공동구매와 유료광고 데이터 가져와서 설정
      const notionMonth = notionData.find((item: any) => item.month === month);
      if (notionMonth) {
        monthlyData[month].adRevenue = notionMonth.adRevenue || 0;
        monthlyData[month].groupSales = notionMonth.groupSales || 0;
        monthlyData[month].notes = notionMonth.notes || '';
        
        // 광고 매출은 그대로 예상이익에 추가
        monthlyData[month].expectedProfit += monthlyData[month].adRevenue;
        
        // 공동구매 정산금액을 예상이익에 추가
        const settlementAmount = groupSettlementData[month] || 0;
        monthlyData[month].expectedProfit += settlementAmount;
      }
    }
    
    // 4. 매핑 서비스 초기화
    const mappingService = new MappingService();
    await mappingService.loadMappingData();
    
    // 5. DB 데이터를 월별로 집계 (스토어 매출 분석과 동일한 로직)
    let processedCount = 0;
    
    for (const item of validSalesData) {
      if (!item.order_date) continue;
      
      // 한국시간 기준으로 주문일시 처리 (스토어 매출 분석과 동일한 로직)
      const { toKoreanTime } = await import('@/lib/utils/dateUtils');
      const orderDate = toKoreanTime(item.order_date);
      const itemYear = orderDate.getFullYear();
      const itemMonth = orderDate.getMonth() + 1; // 0-11 -> 1-12
      
      // 조회 연도에 해당하는 데이터만 처리
      if (itemYear === currentYear && itemMonth >= 1 && itemMonth <= 12) {
        // 매핑 정보 가져오기
        const mappingInfo = mappingService.getMappedProductInfo(
          item.product_name,
          item.product_option,
          item.channel
        );

        // 매핑 정보가 있는 경우에만 매출 계산
        if (mappingInfo && mappingInfo.price > 0) {
          const quantity = item.quantity || 0;
          const mappedPrice = mappingInfo.price || 0;
          const mappedCost = mappingInfo.cost || 0;
          const commissionRate = mappingInfo.fee || 0;
          
          // 매출액 계산 (매핑된 가격 * 수량)
          const totalSales = mappedPrice * quantity;
          
          // 순이익 계산 (매출액 - 공급가)
          const netProfit = (mappedPrice - mappedCost) * quantity;
          
          // 수수료 금액 계산
          const commissionAmount = totalSales * (commissionRate / 100);
          
          // 영업이익 계산 (순이익 - 수수료)
          const operatingProfit = netProfit - commissionAmount;
          
          // 해당 월의 매출과 예상이익에 추가
          monthlyData[itemMonth].storeSales += totalSales;
          monthlyData[itemMonth].expectedProfit += operatingProfit;
          processedCount++;
        }
      }
    }
    
    // 6. 합계 계산
    const totals = {
      storeSales: 0,
      adRevenue: 0,
      groupSales: 0,
      totalSales: 0,
      expectedProfit: 0,
    };
    
    // 최종 데이터 배열 생성 및 합계 계산
    const finalMonthlyData = Object.values(monthlyData).map(item => {
      // 각 월의 스토어, 광고, 공동구매 매출 합산하여 총 매출 계산
      item.totalSales = item.storeSales + item.adRevenue + item.groupSales;
      
      // 전체 합계에 추가
      totals.storeSales += item.storeSales;
      totals.adRevenue += item.adRevenue;
      totals.groupSales += item.groupSales;
      totals.totalSales += item.totalSales;
      totals.expectedProfit += item.expectedProfit;
      
      return item;
    });
    
    return NextResponse.json({
      success: true,
      data: finalMonthlyData,
      totals,
      year: currentYear,
    });
  } catch (error: any) {
    console.error('통합매출 API 오류:', error);
    return NextResponse.json(
      { success: false, error: error.message || '통합매출 데이터를 가져오는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 