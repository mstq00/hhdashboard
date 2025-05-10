import { NextResponse } from 'next/server';
import * as googleSheets from '@/lib/googleSheets';

/**
 * 판매 데이터를 가져오는 API 엔드포인트
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const fromDate = searchParams.get('fromDate');
    const toDate = searchParams.get('toDate');
    const periodType = searchParams.get('periodType') || 'daily';
    const clearCache = searchParams.get('clearCache') === 'true';
    const showLogs = searchParams.get('showLogs') === 'true'; 
    
    // 로그 출력 함수 - 로그 제어용
    const log = (message: string, ...args: any[]) => {
      if (showLogs) {
        console.log(message, ...args);
      }
    };
    
    // 캐시 초기화 요청 처리
    if (clearCache) {
      const result = googleSheets.clearCache();
      return NextResponse.json({
        success: true,
        message: '캐시가 초기화되었습니다.',
        timestamp: new Date().toISOString()
      });
    }
    
    log('요청된 날짜 범위:', { fromDate, toDate, periodType });
    
    // 날짜 범위가 없으면 기본적으로 이번 달로 설정
    let startDate: Date;
    let endDate: Date;
    
    // periodType에 따라 적절한 날짜 범위 설정
    const now = new Date();
    // 한국 시간으로 변환 (UTC+9)
    const koreaTime = new Date(now);
    koreaTime.setHours(koreaTime.getHours() + 9);
    const today = new Date(koreaTime.getFullYear(), koreaTime.getMonth(), koreaTime.getDate());
    
    // this-month가 선택된 경우 무조건 이번달 1일~오늘로 설정
    if (periodType === 'this-month') {
      // 이번달: 이번달 1일부터 오늘까지
      startDate = new Date(today.getFullYear(), today.getMonth(), 1);
      endDate = new Date(today);
      // 시간을 23:59:59로 설정하여 오늘 하루 전체를 포함
      endDate.setHours(23, 59, 59, 999);
      log('이번달 설정됨:', startDate.toISOString(), '~', endDate.toISOString());
    } 
    else if (fromDate && toDate) {
      // ISO 문자열로부터 Date 객체 생성 (UTC)
      startDate = new Date(fromDate);
      endDate = new Date(toDate);
      
      // 날짜 로깅
      log('필터링할 날짜 범위 (UTC):', startDate.toISOString(), '~', endDate.toISOString());
    } else {
      // 기본: 이번 달의 데이터
      startDate = new Date(today.getFullYear(), today.getMonth(), 1); // 이번 달 1일
      endDate = new Date(today);
      // 시간을 23:59:59로 설정하여 오늘 하루 전체를 포함
      endDate.setHours(23, 59, 59, 999);
    }
    
    try {
      // 판매 데이터 가져오기 (캐싱 적용됨)
      const salesData = await googleSheets.fetchAllSalesData();
      
      // 데이터가 없는 경우 빈 응답 반환 (데모 데이터 사용 안함)
      if (!salesData || salesData.length === 0) {
        log('판매 데이터가 없습니다. 빈 데이터 반환');
        return NextResponse.json({
          ...getEmptyResponseData(periodType),
          debug: {
            error: false,
            message: '판매 데이터가 없음',
            timestamp: new Date().toISOString()
          }
        });
      }
      
      // 유효한 주문 상태만 필터링
      const validSalesData = googleSheets.filterValidSalesData(salesData);
      log(`유효한 주문 상태의 데이터: ${validSalesData.length}/${salesData.length}`);
      
      // 날짜 필터링을 통해 현재 기간에 해당하는 데이터만 추출
      let currentPeriodData = googleSheets.filterDataByDateRange(validSalesData, startDate, endDate);
      log('현재 기간 데이터 수:', currentPeriodData.length);
      
      // 이전 기간 계산 - 기간별 비교 로직 강화
      let previousPeriodStartDate: Date;
      let previousPeriodEndDate: Date;
      
      // 기간 유형에 따라 이전 기간 설정
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);
      
      // URL에서 periodType 파라미터 확인
      const requestPeriodType = searchParams.get('periodType') || 'custom';
      
      // 기간 유형에 따라 비교 기간 결정
      if (fromDate && toDate) {
        // 날짜 파싱
        const startDateObj = new Date(fromDate);
        const endDateObj = new Date(toDate);
        
        // 년, 월, 일만 추출
        const startYear = startDateObj.getFullYear();
        const startMonth = startDateObj.getMonth();
        const startDay = startDateObj.getDate();
        
        const endYear = endDateObj.getFullYear();
        const endMonth = endDateObj.getMonth();
        const endDay = endDateObj.getDate();
        
        // 기간 유형에 따라 다른 비교 로직 적용
        if (requestPeriodType === 'today') {
          // 오늘은 어제와 비교
          previousPeriodStartDate = new Date(today);
          previousPeriodStartDate.setDate(today.getDate() - 1);
          previousPeriodEndDate = new Date(previousPeriodStartDate);
        } 
        else if (requestPeriodType === 'yesterday') {
          // 어제는 그저께와 비교
          previousPeriodStartDate = new Date(today);
          previousPeriodStartDate.setDate(today.getDate() - 2);
          previousPeriodEndDate = new Date(previousPeriodStartDate);
        }
        else if (requestPeriodType === 'this-week') {
          // 이번 주는 지난 주와 비교 (일~토 기준)
          const dayOfWeek = today.getDay(); // 0: 일요일, 6: 토요일
          const daysToSubtract = dayOfWeek === 0 ? 7 : dayOfWeek; // 일요일이면 7일 전, 아니면 현재 요일만큼
          
          // 이번 주 일요일
          const thisWeekSunday = new Date(today);
          thisWeekSunday.setDate(today.getDate() - daysToSubtract + 1);
          
          // 지난 주 일요일과 토요일
          previousPeriodStartDate = new Date(thisWeekSunday);
          previousPeriodStartDate.setDate(thisWeekSunday.getDate() - 7);
          previousPeriodEndDate = new Date(previousPeriodStartDate);
          previousPeriodEndDate.setDate(previousPeriodStartDate.getDate() + 6);
        }
        else if (requestPeriodType === 'last-week') {
          // 지난 주는 저저번 주와 비교
          const dayOfWeek = today.getDay();
          const daysToLastWeekSunday = dayOfWeek === 0 ? 14 : dayOfWeek + 7;
          
          // 지난 주 일요일
          const lastWeekSunday = new Date(today);
          lastWeekSunday.setDate(today.getDate() - daysToLastWeekSunday + 1);
          
          // 저저번 주 일요일과 토요일
          previousPeriodStartDate = new Date(lastWeekSunday);
          previousPeriodStartDate.setDate(lastWeekSunday.getDate() - 7);
          previousPeriodEndDate = new Date(previousPeriodStartDate);
          previousPeriodEndDate.setDate(previousPeriodStartDate.getDate() + 6);
        }
        else if (requestPeriodType === 'this-month') {
          // 이번 달은 무조건 지난 달 전체와 비교
          // 필터 날짜 설정과 관계없이 현재 날짜 기준 이번달로 강제 설정
          
          // 이번달 1일~오늘 (현재 기간)
          startDate = new Date(today.getFullYear(), today.getMonth(), 1);
          startDate.setHours(0, 0, 0, 0);
          endDate = new Date(today);
          // 시간을 23:59:59로 설정하여 오늘 하루 전체를 포함
          endDate.setHours(23, 59, 59, 999);
          
          // 지난달 1일~말일 (비교 기간)
          previousPeriodStartDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
          previousPeriodStartDate.setHours(0, 0, 0, 0);
          previousPeriodEndDate = new Date(today.getFullYear(), today.getMonth(), 0);
          previousPeriodEndDate.setHours(23, 59, 59, 999);
          
          log('[중요] 이번달 기간 강제 설정됨');
          log('이번달 비교 - 현재 기간:', startDate.toISOString(), '~', endDate.toISOString());
          log('이번달 비교 - 이전 기간:', previousPeriodStartDate.toISOString(), '~', previousPeriodEndDate.toISOString());
          
          // 날짜 변경으로 인해 현재 데이터 다시 필터링
          const currentPeriodDataUpdated = googleSheets.filterDataByDateRange(validSalesData, startDate, endDate);
          if (currentPeriodDataUpdated.length !== currentPeriodData.length) {
            log(`날짜 범위 변경으로 현재 기간 데이터 업데이트: ${currentPeriodData.length} → ${currentPeriodDataUpdated.length}`);
            currentPeriodData = currentPeriodDataUpdated;
          }
        }
        else if (requestPeriodType === 'last-month') {
          // 지난 달은 저저번 달과 비교 (1일부터 말일까지)
          previousPeriodStartDate = new Date(today.getFullYear(), today.getMonth() - 2, 1);
          previousPeriodEndDate = new Date(today.getFullYear(), today.getMonth() - 1, 0); // 저저번달 말일
        }
        else if (requestPeriodType === 'last-3-months') {
          // 최근 3개월은 그 이전 3개월과 비교
          previousPeriodStartDate = new Date(today.getFullYear(), today.getMonth() - 5, 1);
          previousPeriodEndDate = new Date(today.getFullYear(), today.getMonth() - 2, 0);
        }
        else if (requestPeriodType === 'last-6-months') {
          // 최근 6개월은 그 이전 6개월과 비교
          previousPeriodStartDate = new Date(today.getFullYear(), today.getMonth() - 11, 1);
          previousPeriodEndDate = new Date(today.getFullYear(), today.getMonth() - 5, 0);
        }
        else if (requestPeriodType === 'all-time' || requestPeriodType === 'all') {
          // 전체 기간은 비교하지 않음 (이전 기간을 같게 설정하여 성장률이 0이 되도록)
          previousPeriodStartDate = new Date(startDate);
          previousPeriodEndDate = new Date(endDate);
        }
        else {
          // 커스텀 기간 또는 기타 케이스: 동일한 길이의 이전 기간
          const periodDays = Math.ceil((endDateObj.getTime() - startDateObj.getTime()) / (1000 * 60 * 60 * 24));
          previousPeriodEndDate = new Date(startDateObj);
          previousPeriodEndDate.setDate(startDateObj.getDate() - 1);
          previousPeriodStartDate = new Date(previousPeriodEndDate);
          previousPeriodStartDate.setDate(previousPeriodEndDate.getDate() - periodDays);
        }
      } else {
        // 날짜 파라미터가 없는 경우 기본 동작 (현재 기준 동일 길이 이전 기간)
        const periodDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        previousPeriodEndDate = new Date(startDate);
        previousPeriodEndDate.setDate(previousPeriodEndDate.getDate() - 1);
        previousPeriodStartDate = new Date(previousPeriodEndDate);
        previousPeriodStartDate.setDate(previousPeriodStartDate.getDate() - periodDays);
      }
      
      // 이전 기간 시간 설정 (시작일은 00:00:00, 종료일은 23:59:59)
      previousPeriodStartDate.setHours(0, 0, 0, 0);
      previousPeriodEndDate.setHours(23, 59, 59, 999);
      
      log('비교 기간 날짜 범위:', previousPeriodStartDate.toISOString(), '~', previousPeriodEndDate.toISOString());
      
      // 이전 기간 데이터 필터링
      const previousPeriodData = googleSheets.filterDataByDateRange(validSalesData, previousPeriodStartDate, previousPeriodEndDate);
      log('이전 기간 데이터 수:', previousPeriodData.length);
      
      // 상품별 매출 데이터
      const productSalesData = googleSheets.aggregateProductSales(currentPeriodData);
      
      // 채널별 매출 데이터
      const channelSalesData = googleSheets.aggregateChannelSales(currentPeriodData);
      
      // 기간별 매출 데이터
      log(`기간별 매출 데이터 생성 중, 기간 유형: ${periodType}`);
      const periodSalesData = googleSheets.generatePeriodSalesData(currentPeriodData, periodType as any);
      
      // 요일별 매출 데이터
      const dayOfWeekSalesData = googleSheets.generateDayOfWeekSalesData(currentPeriodData);
      
      // 재구매 통계
      const repurchaseStats = googleSheets.calculateRepurchaseStats(validSalesData);
      
      // 현재 기간 매출액 계산
      const totalSales = currentPeriodData.reduce((sum, item) => {
        // totalSales 필드가 있으면 해당 값을 사용하고, 없으면 price * quantity 계산
        const itemSales = item.totalSales !== undefined 
          ? item.totalSales 
          : (item.price * item.quantity);
        return sum + itemSales;
      }, 0);
      
      // 이전 기간 매출액 계산
      const previousSales = previousPeriodData.reduce((sum, item) => {
        // totalSales 필드가 있으면 해당 값을 사용하고, 없으면 price * quantity 계산
        const itemSales = item.totalSales !== undefined 
          ? item.totalSales 
          : (item.price * item.quantity);
        return sum + itemSales;
      }, 0);
      
      // 주문 및 고객 수 계산
      const counts = googleSheets.calculateOrderAndCustomerCounts(currentPeriodData);
      const orderCount = counts.totalOrders;
      const customerCount = counts.totalCustomers;
      
      const previousCounts = googleSheets.calculateOrderAndCustomerCounts(previousPeriodData);
      const previousOrderCount = previousCounts.totalOrders;
      const previousCustomerCount = previousCounts.totalCustomers;
      
      // 성장률 계산
      const salesGrowth = previousSales > 0 ? Math.round(((totalSales - previousSales) / previousSales) * 100) : 0;
      const orderGrowth = previousOrderCount > 0 ? Math.round(((orderCount - previousOrderCount) / previousOrderCount) * 100) : 0;
      const customerGrowth = previousCustomerCount > 0 ? Math.round(((customerCount - previousCustomerCount) / previousCustomerCount) * 100) : 0;
      
      // 응답 데이터 구성
      const responseData = {
        totalSales,
        previousSales,
        salesGrowth,
        orderCount,
        previousOrderCount,
        orderGrowth,
        customerCount,
        previousCustomerCount,
        customerGrowth,
        productSalesData,
        channelSalesData,
        periodSalesData,
        dayOfWeekSalesData,
        repurchaseStats,
        periodType,
        summaryData: {
          sales: totalSales,
          salesGrowth,
          salesPrevious: previousSales,
          orderCount,
          orderGrowth,
          orderPrevious: previousOrderCount,
          customerCount,
          customerGrowth,
          customerPrevious: previousCustomerCount
        },
        debug: {
          dataTimestamp: new Date().toISOString(),
          totalDataCount: salesData.length,
          filteredDataCount: currentPeriodData.length,
          dateRange: {
            start: startDate.toISOString(),
            end: endDate.toISOString()
          }
        }
      };
      
      return NextResponse.json(responseData);
    } catch (error: any) {
      console.error('데이터 처리 중 오류 발생:', error.message);
      
      // 오류 발생 시 빈 응답 반환 (데모 데이터 사용 안함)
      return NextResponse.json({
        ...getEmptyResponseData(periodType),
        debug: {
          error: true,
          message: error.message,
          errorType: error.name,
          timestamp: new Date().toISOString()
        }
      });
    }
  } catch (error: any) {
    console.error('API 처리 중 치명적인 오류 발생:', error);
    
    // 치명적 오류 발생 시 빈 응답 반환 (데모 데이터 사용 안함)
    return NextResponse.json({
      ...getEmptyResponseData('daily'),
      debug: {
        error: true,
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      }
    });
  }
}

/**
 * 임시 데모 데이터를 생성하는 함수
 */
function getDemoSalesData() {
  const demoProducts = [
    { productName: '헤이두 올인원 세탁세제', option: '3L', quantity: 56, sales: 1680000, netProfit: 672000, marginRate: 40, operatingProfit: 504000, operatingMarginRate: 30 },
    { productName: '헤이두 주방 세제', option: '1L', quantity: 43, sales: 860000, netProfit: 387000, marginRate: 45, operatingProfit: 301000, operatingMarginRate: 35 },
    { productName: '헤이두 섬유유연제', option: '2L', quantity: 38, sales: 760000, netProfit: 304000, marginRate: 40, operatingProfit: 228000, operatingMarginRate: 30 },
  ];
  
  const demoChannels = [
    { channel: 'smartstore', channelName: '스마트스토어', sales: 800000, percentage: 40 },
    { channel: 'ohouse', channelName: '오늘의집', sales: 600000, percentage: 30 },
    { channel: 'YTshopping', channelName: '유튜브쇼핑', sales: 400000, percentage: 20 },
    { channel: 'coupang', channelName: '쿠팡', sales: 200000, percentage: 10 },
  ];
  
  // 현재 년도와 월 기준으로 데모 데이터 생성
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const day = now.getDate();
  
  // 이번 달 일자들로 데모 데이터 생성
  const demoPeriodData = [];
  const daysInMonth = new Date(year, month, 0).getDate();
  const startDay = Math.max(1, day - 5); // 최근 5일 또는 1일부터
  
  for (let i = startDay; i <= day; i++) {
    // 날짜를 YYYY-MM-DD 형식으로 포맷팅
    const formattedDate = `${year}-${month.toString().padStart(2, '0')}-${i.toString().padStart(2, '0')}`;
    demoPeriodData.push({
      period: formattedDate,
      smartstore: Math.floor(Math.random() * 100000) + 100000,
      ohouse: Math.floor(Math.random() * 80000) + 80000,
      YTshopping: Math.floor(Math.random() * 60000) + 60000,
      coupang: Math.floor(Math.random() * 40000) + 40000
    });
  }
  
  const demoDayOfWeekData = [
    { day: 0, dayName: '일', smartstore: 180000, ohouse: 120000, YTshopping: 80000, coupang: 40000 },
    { day: 1, dayName: '월', smartstore: 120000, ohouse: 80000, YTshopping: 60000, coupang: 30000 },
    { day: 2, dayName: '화', smartstore: 140000, ohouse: 90000, YTshopping: 70000, coupang: 35000 },
    { day: 3, dayName: '수', smartstore: 150000, ohouse: 100000, YTshopping: 75000, coupang: 38000 },
    { day: 4, dayName: '목', smartstore: 160000, ohouse: 110000, YTshopping: 80000, coupang: 40000 },
    { day: 5, dayName: '금', smartstore: 200000, ohouse: 140000, YTshopping: 90000, coupang: 45000 },
    { day: 6, dayName: '토', smartstore: 220000, ohouse: 150000, YTshopping: 100000, coupang: 50000 },
  ];
  
  const demoRepurchaseStats = {
    oneTimeBuyers: 120,
    oneTimePercentage: 66.7,
    twoTimeBuyers: 40,
    twoTimePercentage: 22.2,
    threeOrMoreBuyers: 20,
    threeOrMorePercentage: 11.1,
    totalCustomers: 180
  };
  
  return {
    productSalesData: demoProducts,
    channelSalesData: demoChannels,
    periodSalesData: demoPeriodData,
    dayOfWeekSalesData: demoDayOfWeekData,
    repurchaseStats: demoRepurchaseStats,
    summaryData: {
      sales: 2000000,
      salesGrowth: 15.2,
      salesPrevious: 1736980,
      orderCount: 235,
      orderGrowth: 8.5,
      orderPrevious: 217,
      customerCount: 180,
      customerGrowth: 5.8,
      customerPrevious: 170,
    }
  };
}

// 빈 데이터 응답 생성 함수 추가
function getEmptyResponseData(periodTypeVal: string = 'daily') {
  return {
    totalSales: 0,
    previousSales: 0,
    salesGrowth: 0,
    orderCount: 0,
    previousOrderCount: 0,
    orderGrowth: 0,
    customerCount: 0,
    previousCustomerCount: 0,
    customerGrowth: 0,
    productSalesData: [],
    channelSalesData: [],
    periodSalesData: [],
    dayOfWeekSalesData: [],
    repurchaseStats: {
      oneTimeBuyers: 0,
      oneTimePercentage: 0,
      twoTimeBuyers: 0,
      twoTimePercentage: 0,
      threeOrMoreBuyers: 0,
      threeOrMorePercentage: 0,
      totalCustomers: 0
    },
    periodType: periodTypeVal,
    summaryData: {
      sales: 0,
      salesGrowth: 0,
      salesPrevious: 0,
      orderCount: 0,
      orderGrowth: 0,
      orderPrevious: 0,
      customerCount: 0,
      customerGrowth: 0,
      customerPrevious: 0
    }
  };
} 