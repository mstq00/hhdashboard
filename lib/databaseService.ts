import { format, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from 'date-fns';
import { ko } from 'date-fns/locale';
import { toKoreanTime } from './utils/dateUtils';

// 매핑 정보 타입 정의
interface ProductMapping {
  mappedProductName: string;
  mappedOptionName: string;
}

interface MappingMap {
  [key: string]: ProductMapping;
}

// 상품 매핑 정보 가져오기
export async function fetchProductMappings(): Promise<MappingMap> {
  try {
    const response = await fetch('/api/analytics/product-mappings');

    if (!response.ok) {
      throw new Error(`매핑 API 호출 실패: ${response.status}`);
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || '매핑 정보 조회 실패');
    }

    return result.mappingMap || {};
  } catch (error) {
    console.error('상품 매핑 조회 오류:', error);
    return {};
  }
}

// 상품명과 옵션명 매핑 적용
function applyProductMappings(data: any[], mappingMap: MappingMap) {
  const result = data.map(item => {
    // 실제 데이터의 productName과 optionName을 사용해서 매핑 키 생성
    const key = `${item.productName}|${item.optionName || ''}`;
    const mapping = mappingMap[key];

    if (mapping) {
      return {
        ...item,
        productName: mapping.mappedProductName,
        optionName: mapping.mappedOptionName,
        isMapped: true,
        // 가격 정보도 함께 적용
        price: item.price,
        cost: item.cost,
        fee: item.fee,
        // 매핑 상태도 설정
        matchingStatus: '매핑완료'
      };
    }

    return {
      ...item,
      isMapped: false,
      matchingStatus: '미매핑'
    };
  });

  return result;
}

// DB에서 매출 데이터 가져오기 (API에서 이미 매핑된 데이터 사용)
export async function fetchSalesDataFromDB(startDate: Date, endDate: Date, channel?: string) {
  try {
    // 한국시간 기준으로 날짜만 전송 (시간 정보 제거)
    const startDateStr = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}-${String(startDate.getDate()).padStart(2, '0')}`;
    const endDateStr = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`;

    const params = new URLSearchParams({
      startDate: startDateStr,
      endDate: endDateStr,
      channel: channel || 'all'
    });

    const response = await fetch(`/api/analytics/sales-data?${params}`);

    if (!response.ok) {
      throw new Error(`API 호출 실패: ${response.status}`);
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || '데이터 조회 실패');
    }

    const data = result.data || [];



    return data;
  } catch (error) {
    console.error('DB 데이터 조회 오류:', error);
    throw error;
  }
}

// 최적화된 데이터 로드 (현재와 이전 기간을 한 번에)
export async function fetchOptimizedSalesDataFromDB(
  currentStart: Date,
  currentEnd: Date,
  previousStart: Date,
  previousEnd: Date
) {
  try {


    // 현재 기간과 이전 기간 데이터를 병렬로 가져오기
    const [currentPeriodData, previousPeriodData] = await Promise.all([
      fetchSalesDataFromDB(currentStart, currentEnd),
      fetchSalesDataFromDB(previousStart, previousEnd)
    ]);



    return {
      currentPeriodData,
      previousPeriodData
    };
  } catch (error) {
    console.error('최적화된 DB 데이터 로드 오류:', error);
    throw error;
  }
}

// 모든 매출 데이터 가져오기 (캐시용)
export async function fetchAllSalesDataFromDB() {
  try {
    // 최근 1년 데이터 가져오기
    const endDate = new Date();
    const startDate = subMonths(endDate, 12);

    return await fetchSalesDataFromDB(startDate, endDate);
  } catch (error) {
    console.error('전체 DB 데이터 로드 오류:', error);
    throw error;
  }
}

// 데이터 필터링 함수들 (기존 googleSheets.ts와 동일한 인터페이스)
export function filterDataByDateRange(data: any[], startDate: Date, endDate: Date) {
  // 한국시간 기준 경계로 엄격 필터링
  const start = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate(), 0, 0, 0);
  const end = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate(), 23, 59, 59, 999);

  return data.filter(item => {
    if (!item.orderDate) return false;
    const kstDate = toKoreanTime(item.orderDate);
    return kstDate >= start && kstDate <= end;
  });
}

export function filterValidSalesData(data: any[]) {
  return data.filter(item => {
    // 기본 유효성 검사
    const isValid = item.orderNumber &&
      item.orderDate &&
      item.productName &&
      item.quantity > 0;

    if (!isValid) return false;

    // 취소/환불/미결제취소 상태인지 확인
    const isCancelledOrder = ['취소', '환불', '미결제취소', '반품', '구매취소', '주문취소'].includes(item.status);

    // 취소된 주문은 제외
    return !isCancelledOrder;
  });
}

// 상품별 매출 집계 (취소/환불/미결제취소 제외)
export function aggregateProductSales(data: any[]) {
  const productMap = new Map();

  data.forEach(item => {
    // 취소/환불/미결제취소 상태인지 확인
    const isCancelledOrder = ['취소', '환불', '미결제취소', '반품', '구매취소', '주문취소'].includes(item.status);

    // 취소된 주문은 제외
    if (isCancelledOrder) {
      return;
    }

    const key = `${item.productName}|${item.optionName}`;

    // totalSales 필드가 있으면 사용하고, 없으면 가격과 수량을 곱해서 계산
    const sales = item.totalSales !== undefined ? item.totalSales : (item.price || 0) * (item.quantity || 0);

    if (!productMap.has(key)) {
      productMap.set(key, {
        productName: item.productName,
        optionName: item.optionName,
        quantity: 0,
        sales: 0,
        cost: 0,
        commissionAmount: 0,
        netProfit: 0,
        operatingProfit: 0,
        orders: new Set(),
        matchingStatus: item.matchingStatus || '미매핑'
      });
    }

    const product = productMap.get(key);
    product.quantity += item.quantity || 0;
    product.sales += sales;
    product.cost += (item.cost || 0) * (item.quantity || 0);
    product.commissionAmount += (item.commissionAmount || 0);
    product.netProfit += (item.netProfit || 0);
    product.operatingProfit += (item.operatingProfit || 0);
    product.orders.add(item.orderNumber);

    // 매핑 상태 업데이트 (하나라도 매핑완료면 매핑완료로 설정)
    if (item.matchingStatus === '매핑완료') {
      product.matchingStatus = '매핑완료';
    }
  });

  return Array.from(productMap.values())
    .map(product => ({
      ...product,
      orders: Array.from(product.orders),
      orderCount: product.orders.size,
      marginRate: product.sales > 0 ? ((product.netProfit / product.sales) * 100).toFixed(1) : '0.0',
      operatingMarginRate: product.sales > 0 ? ((product.operatingProfit / product.sales) * 100).toFixed(1) : '0.0'
    }))
    .sort((a, b) => b.sales - a.sales); // 매출액 기준 내림차순 정렬
}

// 채널별 매출 집계 (취소/환불/미결제취소 제외)
export function aggregateChannelSales(data: any[]) {
  const channelMap = new Map();

  data.forEach(item => {
    // 취소/환불/미결제취소 상태인지 확인
    const isCancelledOrder = ['취소', '환불', '미결제취소', '반품', '구매취소', '주문취소'].includes(item.status);

    // 취소된 주문은 제외
    if (isCancelledOrder) {
      return;
    }

    const channel = item.channel;
    const sales = (item.price || 0) * (item.quantity || 0);

    if (!channelMap.has(channel)) {
      channelMap.set(channel, {
        channel,
        sales: 0,
        orderCount: 0, // 주문 건수 (상품 기준)
        orderCustomerMap: new Map() // 주문번호별 고객 정보
      });
    }

    const channelData = channelMap.get(channel);
    channelData.sales += sales;
    channelData.orderCount++; // 주문 건수 증가 (각 상품을 별도 건으로 계산)

    // 주문번호별 고객 정보 저장 (고객명 + 연락처로 고유 고객 식별)
    const customerKey = `${item.customerName || ''}##${item.customerID || ''}`;
    channelData.orderCustomerMap.set(item.orderNumber, customerKey);
  });

  return Array.from(channelMap.values()).map(channel => {
    // 구매자수 계산: 주문번호별 고객 정보에서 중복 제거
    const uniqueCustomers = new Set();
    channel.orderCustomerMap.forEach((customerKey) => {
      uniqueCustomers.add(customerKey);
    });

    return {
      ...channel,
      customers: Array.from(uniqueCustomers),
      customerCount: uniqueCustomers.size
    };
  });
}

// 기간별 매출 데이터 생성 (취소/환불/미결제취소 제외)
export function generatePeriodSalesData(data: any[], periodType: 'daily' | 'weekly' | 'monthly') {
  const periodMap = new Map();
  const channelMap = new Map();

  // 디버깅: 데이터 개수와 채널별 분포 확인
  const channelCounts = data.reduce((acc, item) => {
    acc[item.channel] = (acc[item.channel] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // 7월 26일 데이터만 필터링하여 확인
  const july26Data = data.filter(item => {
    if (typeof item.orderDate === 'string') {
      return item.orderDate.startsWith('2025-07-26');
    }
    return false;
  });

  const july26ChannelCounts = july26Data.reduce((acc, item) => {
    acc[item.channel] = (acc[item.channel] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);



  // 채널별로 데이터 그룹화
  data.forEach(item => {
    // 취소/환불/미결제취소 상태인지 확인
    const isCancelledOrder = ['취소', '환불', '미결제취소', '반품', '구매취소', '주문취소'].includes(item.status);

    // 취소된 주문은 제외
    if (isCancelledOrder) {
      return;
    }

    if (!item.orderDate) return;

    // 한국시간 기준으로 날짜 처리
    const dateObj = toKoreanTime(item.orderDate);
    let periodKey: string;

    switch (periodType) {
      case 'daily':
        periodKey = format(dateObj, 'yyyy-MM-dd');
        break;
      case 'weekly':
        periodKey = format(dateObj, 'yyyy-\'W\'ww');
        break;
      case 'monthly':
        periodKey = format(dateObj, 'yyyy-MM');
        break;
      default:
        periodKey = format(dateObj, 'yyyy-MM-dd');
    }

    const sales = (item.totalSales || (item.price || 0) * (item.quantity || 0));
    const channel = item.channel || 'unknown';

    // 기간별 데이터 초기화
    if (!periodMap.has(periodKey)) {
      let startDate = '';
      let endDate = '';

      if (periodType === 'daily') {
        startDate = format(dateObj, 'MM/dd');
        endDate = format(dateObj, 'MM/dd');
      } else if (periodType === 'weekly') {
        startDate = format(startOfWeek(dateObj, { weekStartsOn: 1 }), 'MM/dd');
        endDate = format(endOfWeek(dateObj, { weekStartsOn: 1 }), 'MM/dd');
      } else if (periodType === 'monthly') {
        startDate = format(startOfMonth(dateObj), 'MM/dd');
        endDate = format(endOfMonth(dateObj), 'MM/dd');
      }

      periodMap.set(periodKey, {
        period: periodKey,
        startDate,
        endDate,
        smartstore: 0,
        ohouse: 0,
        ytshopping: 0,
        coupang: 0,
        total: 0
      });
    }

    // 채널별 매출 누적
    const periodData = periodMap.get(periodKey);
    if (periodData.hasOwnProperty(channel)) {
      periodData[channel] += sales;


    }
    periodData.total += sales;
  });

  // 날짜순으로 정렬
  const sortedData = Array.from(periodMap.values()).sort((a, b) => {
    return a.period.localeCompare(b.period);
  });



  return sortedData;
}

// 요일별 매출 데이터 생성 (취소/환불/미결제취소 제외)
export function generateDayOfWeekSalesData(data: any[]) {
  const dayMap = new Map();

  // 요일 순서 정의 (월요일부터 일요일까지)
  const dayOrder = ['월요일', '화요일', '수요일', '목요일', '금요일', '토요일', '일요일'];

  data.forEach(item => {
    // 취소/환불/미결제취소 상태인지 확인
    const isCancelledOrder = ['취소', '환불', '미결제취소', '반품', '구매취소', '주문취소'].includes(item.status);

    // 취소된 주문은 제외
    if (isCancelledOrder) {
      return;
    }

    if (!item.orderDate) return;

    // 한국시간 기준으로 날짜 처리
    const date = toKoreanTime(item.orderDate);
    const dayOfWeek = format(date, 'EEEE', { locale: ko });
    const sales = (item.totalSales || (item.price || 0) * (item.quantity || 0));
    const channel = item.channel || 'unknown';

    if (!dayMap.has(dayOfWeek)) {
      dayMap.set(dayOfWeek, {
        dayName: dayOfWeek,
        smartstore: 0,
        ohouse: 0,
        ytshopping: 0,
        coupang: 0,
        total: 0
      });
    }

    // 채널별 매출 누적
    const dayData = dayMap.get(dayOfWeek);
    if (dayData.hasOwnProperty(channel)) {
      dayData[channel] += sales;
    }
    dayData.total += sales;
  });

  // 요일 순서대로 정렬
  const sortedData = dayOrder
    .map(dayName => dayMap.get(dayName))
    .filter(Boolean);



  return sortedData;
}

// 주문 및 고객 수 계산 (취소/환불/미결제취소 제외)
export function calculateOrderAndCustomerCounts(data: any[]) {
  let validOrderCount = 0; // 유효한 주문 건수 (상품 기준)
  const orderCustomerMap = new Map(); // 주문번호별 고객 정보
  let totalSales = 0;

  data.forEach(item => {
    // 취소/환불/미결제취소 상태인지 확인
    const isCancelledOrder = ['취소', '환불', '미결제취소', '반품', '구매취소', '주문취소'].includes(item.status);

    // 취소된 주문은 제외
    if (isCancelledOrder) {
      return;
    }

    // 유효한 주문 건수 증가 (각 상품을 별도 건으로 계산)
    validOrderCount++;

    // 주문번호별 고객 정보 저장 (고객명 + 연락처로 고유 고객 식별)
    const customerKey = `${item.customerName || ''}##${item.customerID || ''}`;
    orderCustomerMap.set(item.orderNumber, customerKey);

    totalSales += (item.price || 0) * (item.quantity || 0);
  });

  // 구매자수 계산: 주문번호별 고객 정보에서 중복 제거
  const uniqueCustomers = new Set();
  orderCustomerMap.forEach((customerKey) => {
    uniqueCustomers.add(customerKey);
  });

  return {
    orderCount: validOrderCount, // 구매건수: 유효한 주문 건수 (상품 기준)
    customerCount: uniqueCustomers.size, // 구매자수: 중복 제거된 고객 수
    totalSales
  };
}

// 재구매 통계 계산 (취소/환불/미결제취소 제외)
export function calculateRepurchaseStats(data: any[]) {
  const customerOrders = new Map();

  // 고객별 주문 횟수 계산
  data.forEach(item => {
    // 취소/환불/미결제취소 상태인지 확인
    const isCancelledOrder = ['취소', '환불', '미결제취소', '반품', '구매취소', '주문취소'].includes(item.status);

    // 취소된 주문은 제외
    if (isCancelledOrder) {
      return;
    }

    if (!item.customerName) return;

    if (!customerOrders.has(item.customerName)) {
      customerOrders.set(item.customerName, new Set());
    }
    customerOrders.get(item.customerName).add(item.orderNumber);
  });

  // 주문 횟수별 고객 수 계산
  const orderCountMap = new Map();
  customerOrders.forEach((orders, customer) => {
    const orderCount = orders.size;
    if (!orderCountMap.has(orderCount)) {
      orderCountMap.set(orderCount, 0);
    }
    orderCountMap.set(orderCount, orderCountMap.get(orderCount) + 1);
  });

  const totalCustomers = customerOrders.size;
  const stats = [];

  orderCountMap.forEach((customerCount, orderCount) => {
    stats.push({
      type: orderCount === 1 ? '1회 구매' :
        orderCount === 2 ? '2회 구매' :
          `${orderCount}회 이상 구매`,
      customerCount,
      percentage: (customerCount / totalCustomers * 100).toFixed(1)
    });
  });

  return stats.sort((a, b) => {
    const aCount = parseInt(a.type.match(/\d+/)?.[0] || '0');
    const bCount = parseInt(b.type.match(/\d+/)?.[0] || '0');
    return aCount - bCount;
  });
}

