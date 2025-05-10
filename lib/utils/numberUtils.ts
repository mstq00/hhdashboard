/**
 * 숫자 관련 유틸리티 함수들
 */

/**
 * 숫자를 한국어 형식으로 포맷팅합니다.
 * 예: 10000 -> 10,000
 */
export function formatNumber(number: number | null | undefined): string {
  if (number === null || number === undefined || isNaN(number)) {
    return '0';
  }
  
  return new Intl.NumberFormat('ko-KR').format(number);
}

/**
 * 이전 값과 현재 값을 기반으로 성장률을 계산합니다.
 * 예: previous=100, current=110 -> 10 (%)
 */
export function calculateGrowth(previousValue: number, currentValue: number): number {
  if (!previousValue || previousValue === 0) {
    return 0;
  }
  
  return ((currentValue - previousValue) / previousValue) * 100;
}

/**
 * 숫자를 한국어 형식의 통화로 포맷팅합니다 (원화 기호 포함).
 * 예: 10000 -> ₩10,000
 */
export function formatCurrency(number: number | null | undefined): string {
  if (number === null || number === undefined || isNaN(number)) {
    return '₩0';
  }
  
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW',
    maximumFractionDigits: 0
  }).format(number);
}

/**
 * 숫자를 미국 달러 형식의 통화로 포맷팅합니다.
 */
export function formatUSD(number: number | null | undefined): string {
  if (number === null || number === undefined || isNaN(number)) {
    return '$0';
  }
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2
  }).format(number);
}

/**
 * 퍼센트 값을 포맷팅합니다.
 */
export function formatPercent(number: number | null | undefined, decimals = 1): string {
  if (number === null || number === undefined || isNaN(number)) {
    return '0%';
  }
  
  return `${(number * 100).toFixed(decimals)}%`;
}

/**
 * 성장률에 따른 CSS 클래스를 반환합니다.
 * 양수인 경우 녹색, 음수인 경우 빨간색, 0인 경우 회색을 반환합니다.
 */
export function getGrowthClass(rate: number): string {
  if (rate > 0) return 'text-emerald-600';
  if (rate < 0) return 'text-red-600';
  return 'text-gray-500';
} 