import { NextResponse } from 'next/server';
import { fetchYearlyTotalSalesData, fetchMonthlySalesData } from '@/lib/notion';
import { fetchAllSalesData, filterValidSalesData, filterDataByDateRange } from '@/lib/googleSheets';

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
      return NextResponse.json({
        success: true,
        data: detailData,
        year,
        month,
      });
    }
    
    // 연간 데이터 준비
    const currentYear = year || new Date().getFullYear();
    
    // 1. 구글 시트에서 스토어 판매 데이터 가져오기
    console.log('스토어 판매 데이터 가져오는 중...');
    const allSalesData = await fetchAllSalesData();
    const validSalesData = filterValidSalesData(allSalesData);
    
    // 2. 노션에서 공동구매 및 유료광고 데이터 가져오기
    console.log('노션 데이터 가져오는 중...');
    const notionData = await fetchYearlyTotalSalesData(currentYear);
    
    // 월별 데이터를 저장할 객체 초기화
    const monthlyData: Record<number, {
      id: string,
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
        id: `${currentYear}-${month}`,
        month,
        year: currentYear,
        storeSales: 0,
        adRevenue: 0, 
        groupSales: 0,
        totalSales: 0,
        notes: ''
      };
      
      // 노션 데이터에서 공동구매와 유료광고 데이터 가져와서 설정
      const notionMonth = notionData.find((item: any) => item.month === month);
      if (notionMonth) {
        monthlyData[month].adRevenue = notionMonth.adRevenue || 0;
        monthlyData[month].groupSales = notionMonth.groupSales || 0;
        monthlyData[month].notes = notionMonth.notes || '';
      }
    }
    
    // 3. 구글 시트 데이터를 월별로 집계
    for (const item of validSalesData) {
      if (!item.orderDate) continue;
      
      const orderDate = new Date(item.orderDate);
      const itemYear = orderDate.getFullYear();
      const itemMonth = orderDate.getMonth() + 1; // 0-11 -> 1-12
      
      // 조회 연도에 해당하는 데이터만 처리
      if (itemYear === currentYear && itemMonth >= 1 && itemMonth <= 12) {
        // 판매가 * 수량으로 매출액 계산
        const totalSales = (item.totalSales || (item.price * item.quantity)) || 0;
        
        // 해당 월의 매출에 추가
        monthlyData[itemMonth].storeSales += totalSales;
      }
    }
    
    // 4. 합계 계산
    const totals = {
      storeSales: 0,
      adRevenue: 0,
      groupSales: 0,
      totalSales: 0,
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