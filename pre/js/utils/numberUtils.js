/**
 * 숫자를 한국어 형식의 통화로 포맷팅합니다.
 * @param {number} number - 포맷팅할 숫자
 * @returns {string} 포맷팅된 문자열
 */
export function formatNumber(number) {
    if (number === null || number === undefined || isNaN(number)) {
        return '0';
    }
    
    return new Intl.NumberFormat('ko-KR').format(number);
}

/**
 * 이전 값과 현재 값을 기반으로 성장률을 계산합니다.
 * @param {number} previousValue - 이전 값
 * @param {number} currentValue - 현재 값
 * @returns {string} 성장률 (소수점 첫째 자리까지)
 */
export function calculateGrowth(previousValue, currentValue) {
    if (!previousValue || previousValue === 0) {
        return '0.0';
    }
    
    const growth = ((currentValue - previousValue) / previousValue) * 100;
    return growth.toFixed(1);
}

/**
 * 숫자를 한국어 형식의 통화로 포맷팅합니다 (원화 기호 포함).
 * @param {number} number - 포맷팅할 숫자
 * @returns {string} 포맷팅된 문자열
 */
export function formatCurrency(number) {
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
 * @param {number} number - 포맷팅할 숫자
 * @returns {string} 포맷팅된 문자열
 */
export function formatUSD(number) {
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
 * @param {number} number - 포맷팅할 숫자 (예: 0.156)
 * @param {number} decimals - 소수점 자릿수 (기본값: 1)
 * @returns {string} 포맷팅된 문자열 (예: "15.6%")
 */
export function formatPercent(number, decimals = 1) {
    if (number === null || number === undefined || isNaN(number)) {
        return '0%';
    }
    
    return `${(number * 100).toFixed(decimals)}%`;
} 