/**
 * 날짜 관련 유틸리티 함수들
 */

/**
 * 기간에 따른 날짜 범위를 계산합니다.
 */
export function calculateDateRange(period: string): { startDate: Date | null; endDate: Date | null } {
  const today = new Date();
  let startDate: Date, endDate: Date;

  switch (period) {
    case 'today':
      startDate = new Date(today);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(today);
      endDate.setHours(23, 59, 59, 999);
      break;
    case 'yesterday':
      startDate = new Date(today);
      startDate.setDate(today.getDate() - 1);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(today);
      endDate.setDate(today.getDate() - 1);
      endDate.setHours(23, 59, 59, 999);
      break;
    case 'thisWeek':
      startDate = new Date(today);
      startDate.setDate(today.getDate() - today.getDay());
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(today);
      endDate.setHours(23, 59, 59, 999);
      break;
    case 'lastWeek':
      startDate = new Date(today);
      startDate.setDate(today.getDate() - today.getDay() - 7);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(today);
      endDate.setDate(today.getDate() - today.getDay() - 1);
      endDate.setHours(23, 59, 59, 999);
      break;
    case 'thisMonth':
      startDate = new Date(today.getFullYear(), today.getMonth(), 1);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(today);
      endDate.setHours(23, 59, 59, 999);
      break;
    case 'lastMonth':
      startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(today.getFullYear(), today.getMonth(), 0);
      endDate.setHours(23, 59, 59, 999);
      break;
    case 'last30Days':
      startDate = new Date(today);
      startDate.setDate(today.getDate() - 30);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(today);
      endDate.setHours(23, 59, 59, 999);
      break;
    case 'last90Days':
      startDate = new Date(today);
      startDate.setDate(today.getDate() - 90);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(today);
      endDate.setHours(23, 59, 59, 999);
      break;
    case 'thisYear':
      startDate = new Date(today.getFullYear(), 0, 1);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(today);
      endDate.setHours(23, 59, 59, 999);
      break;
    case 'lastYear':
      startDate = new Date(today.getFullYear() - 1, 0, 1);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(today.getFullYear() - 1, 11, 31);
      endDate.setHours(23, 59, 59, 999);
      break;
    default:
      return { startDate: null, endDate: null };
  }

  return { startDate, endDate };
}

/**
 * 날짜가 지정된 범위 내에 있는지 확인합니다.
 */
export function isWithinRange(date: Date | string, startDate: Date, endDate: Date): boolean {
  const compareDate = typeof date === 'string' ? new Date(date) : date;
  return compareDate >= startDate && compareDate <= endDate;
}

/**
 * 날짜를 'YYYY-MM-DD' 형식으로 포맷합니다.
 */
export function formatDate(date: Date): string {
  return date.toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
}

/**
 * 데이터를 날짜 범위로 필터링합니다.
 */
export function filterDataByDateRange<T extends { date?: string | Date; orderDate?: string | Date }>(
  data: T[],
  startDate: Date,
  endDate: Date
): T[] {
  if (!startDate || !endDate || !Array.isArray(data)) return [];

  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  return data.filter(item => {
    const itemDate = new Date(item.date || item.orderDate || new Date());
    return itemDate >= start && itemDate <= end;
  });
}

/**
 * 커스텀 날짜 범위인지 확인합니다.
 */
export function isCustomDateRange(startDate: Date | null, endDate: Date | null): boolean {
  return !!startDate && !!endDate && startDate.getTime() !== endDate.getTime();
}

/**
 * 비교 기간 텍스트를 생성합니다.
 */
export function getComparisonPeriodText(period: string, startDate: Date, endDate: Date): string {
  const formatDate = (date: Date) => `${date.getMonth() + 1}월 ${date.getDate()}일`;
  const formatMonth = (date: Date) => `${date.getFullYear()}년 ${date.getMonth() + 1}월`;

  switch (period) {
    case 'today':
      return '어제 대비';
    case 'yesterday':
      return '전일 대비';
    case 'this-week':
      return '지난 주 대비';
    case 'last-week':
      return '전주 대비';
    case 'this-month':
      return '지난 달 대비';
    case 'last-month':
      return '전월 대비';
    default:
      if (isCustomDateRange(startDate, endDate)) {
        const dayDiff = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        if (dayDiff <= 31) {
          return `${formatDate(startDate)} ~ ${formatDate(endDate)} 대비`;
        } else {
          return `${formatMonth(startDate)} ~ ${formatMonth(endDate)} 대비`;
        }
      }
      return '이전 기간 대비';
  }
} 