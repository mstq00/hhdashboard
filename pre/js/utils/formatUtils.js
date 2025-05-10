export class FormatUtils {
    static formatCurrency(amount) {
        if (typeof amount !== 'number') {
            amount = parseFloat(amount) || 0;
        }
        
        return new Intl.NumberFormat('ko-KR', {
            style: 'currency',
            currency: 'KRW',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    }

    static formatNumber(number) {
        if (typeof number !== 'number') {
            number = parseFloat(number) || 0;
        }
        
        return new Intl.NumberFormat('ko-KR', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(number);
    }

    static formatPercentage(value) {
        if (typeof value !== 'number') {
            value = parseFloat(value) || 0;
        }
        
        return new Intl.NumberFormat('ko-KR', {
            style: 'percent',
            minimumFractionDigits: 1,
            maximumFractionDigits: 1
        }).format(value / 100);
    }

    static formatDecimal(number, decimals = 2) {
        if (typeof number !== 'number') {
            number = parseFloat(number) || 0;
        }
        
        return new Intl.NumberFormat('ko-KR', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        }).format(number);
    }
} 