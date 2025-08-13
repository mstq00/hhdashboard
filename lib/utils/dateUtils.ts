/**
 * 날짜 관련 유틸리티 함수들
 */

/**
 * 날짜를 한국시간으로 변환합니다.
 * DB의 order_date는 실제로는 KST이지만 +00:00으로 표시되어 있으므로 KST로 처리합니다.
 */
export function toKoreanTime(date: Date | string): Date {
  try {
    if (typeof date === 'string') {
      // 빈 문자열이나 null 체크
      if (!date || date.trim() === '') {
        console.warn('🔍 toKoreanTime: 빈 날짜 문자열 입력됨');
        return new Date();
      }

      // DB에 저장된 시간이 UTC(+00:00)인 경우 → KST(+9h)로 변환
      // 예: "2025-07-31T15:03:00+00:00" → KST "2025-08-01T00:03:00"
      if (date.includes('+00:00')) {
        const utc = new Date(date);
        if (isNaN(utc.getTime())) {
          console.warn('🔍 toKoreanTime: 잘못된 UTC(+00:00) 날짜 문자열:', date);
          return new Date();
        }
        return new Date(utc.getTime() + 9 * 60 * 60 * 1000);
      }
      // 이미 한국시간으로 저장된 경우 (예: "2025-07-01T00:02:40")
      else if (date.includes('T') && !date.includes('Z') && !date.includes('+')) {
        // 단순히 Date 객체로 변환 (서버가 한국 리전이므로 자동으로 KST로 해석됨)
        const result = new Date(date);
        
        // 유효한 날짜인지 확인
        if (isNaN(result.getTime())) {
          console.warn('🔍 toKoreanTime: 잘못된 KST 날짜 문자열:', date);
          return new Date();
        }
        return result;
      }
      // UTC 시간인 경우 (예: "2025-07-01T00:02:40.000Z")
      else if (date.includes('T') && date.includes('Z')) {
        const utcDate = new Date(date);
        if (isNaN(utcDate.getTime())) {
          console.warn('🔍 toKoreanTime: 잘못된 UTC 날짜 문자열:', date);
          return new Date();
        }
        const result = new Date(utcDate.getTime() + (9 * 60 * 60 * 1000));
        return result;
      } else {
        // 일반 날짜 문자열인 경우
        const result = new Date(date);
        if (isNaN(result.getTime())) {
          console.warn('🔍 toKoreanTime: 잘못된 일반 날짜 문자열:', date);
          return new Date();
        }
        return result;
      }
    } else {
      // Date 객체인 경우
      if (isNaN(date.getTime())) {
        console.warn('🔍 toKoreanTime: 잘못된 Date 객체');
        return new Date();
      }
      return date;
    }
  } catch (error) {
    console.error('🔍 toKoreanTime 함수 오류:', error, '입력값:', date);
    return new Date();
  }
}

/**
 * 기간에 따른 날짜 범위를 계산합니다. (한국시간 기준)
 */
export function calculateDateRange(period: string): { startDate: Date | null; endDate: Date | null } {
  const today = new Date(); // 시스템 시간 사용 (한국시간으로 가정)
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