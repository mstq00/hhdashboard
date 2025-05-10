export class DateUtils {
    static calculateDateRange(period) {
        const today = new Date();
        let startDate, endDate;

        switch (period) {
            case 'today':
                startDate = endDate = new Date(today.setHours(0, 0, 0, 0));
                break;
            case 'yesterday':
                startDate = endDate = new Date(today.setDate(today.getDate() - 1));
                startDate.setHours(0, 0, 0, 0);
                endDate.setHours(23, 59, 59, 999);
                break;
            case 'this-week':
                // 이번 주 월요일 구하기
                startDate = new Date(today);
                startDate.setDate(today.getDate() - (today.getDay() === 0 ? 6 : today.getDay() - 1));
                startDate.setHours(0, 0, 0, 0);
                // 이번 주 일요일 구하기
                endDate = new Date(startDate);
                endDate.setDate(startDate.getDate() + 6);
                endDate.setHours(23, 59, 59, 999);
                break;
            case 'last-week':
                // 지난 주 월요일 구하기
                startDate = new Date(today);
                startDate.setDate(today.getDate() - (today.getDay() === 0 ? 6 : today.getDay() - 1) - 7);
                startDate.setHours(0, 0, 0, 0);
                // 지난 주 일요일 구하기
                endDate = new Date(startDate);
                endDate.setDate(startDate.getDate() + 6);
                endDate.setHours(23, 59, 59, 999);
                break;
            case 'this-month':
                startDate = new Date(today.getFullYear(), today.getMonth(), 1);
                startDate.setHours(0, 0, 0, 0);
                endDate = new Date(today);
                endDate.setHours(23, 59, 59, 999);
                break;
            case 'last-month':
                startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                startDate.setHours(0, 0, 0, 0);
                endDate = new Date(today.getFullYear(), today.getMonth(), 0);
                endDate.setHours(23, 59, 59, 999);
                break;
            case 'last-3-months':
                startDate = new Date(today.getFullYear(), today.getMonth() - 2, 1);
                startDate.setHours(0, 0, 0, 0);
                endDate = new Date(today);
                endDate.setHours(23, 59, 59, 999);
                break;
            case 'last-6-months':
                startDate = new Date(today.getFullYear(), today.getMonth() - 5, 1);
                startDate.setHours(0, 0, 0, 0);
                endDate = new Date(today);
                endDate.setHours(23, 59, 59, 999);
                break;
            case 'all':
                return { startDate: null, endDate: null };
            default:
                startDate = new Date(today.getFullYear(), today.getMonth(), 1);
                startDate.setHours(0, 0, 0, 0);
                endDate = new Date(today);
                endDate.setHours(23, 59, 59, 999);
        }

        return { startDate, endDate };
    }

    static isWithinRange(date, startDate, endDate) {
        const targetDate = new Date(date);
        return targetDate >= startDate && targetDate <= endDate;
    }

    static formatDate(date) {
        return date.toLocaleString('ko-KR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
    }

    static filterDataByDateRange(data, startDate, endDate) {
        if (!startDate || !endDate || !Array.isArray(data)) return [];

        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        return data.filter(item => {
            const itemDate = new Date(item.date);
            return itemDate >= start && itemDate <= end;
        });
    }

    static isCustomDateRange(startDate, endDate) {
        return startDate && endDate && startDate !== endDate;
    }
} 