import { FormatUtils } from '../utils/formatUtils.js';
import { collection, getDocs, doc, serverTimestamp, deleteDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { NotionService } from '../services/notionService.js';
import { formatNumber, calculateGrowth } from '../utils/numberUtils.js';
import { DataService } from '../services/dataService.js';
import { TableManager } from './tables.js';  // 경로 수정

export class Dashboard {
    constructor(dataService) {
        this.dataService = dataService;
        this.currentPeriod = 'this-month';
        this.startDate = null;
        this.endDate = null;
        this.tableManager = null;
        this.initializeDateListeners();
        
        // 초기 로드 시 이번달 데이터로 대시보드 업데이트
        const today = new Date();
        this.startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        this.endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        
        // dateFilterChanged 이벤트 발생
        document.dispatchEvent(new CustomEvent('dateFilterChanged', {
            detail: {
                data: this.dataService.getCurrentData().filter(item => {
                    const itemDate = new Date(item.date || item.orderDate);
                    return itemDate >= this.startDate && itemDate <= this.endDate;
                }),
                period: 'this-month',
                startDate: this.startDate,
                endDate: this.endDate
            }
        }));

        this.currentChartPeriod = 'day';
        this.periodSalesChart = null;
        this.dayOfWeekSalesChart = null;
        this.initializeChartListeners();

        // 차트 색상 정의
        this.CHANNEL_COLORS = {
            '스마트스토어': 'rgba(169, 186, 147, 0.7)',
            '오늘의집': 'rgba(147, 165, 186, 0.7)',
            '유튜브쇼핑': 'rgba(195, 177, 171, 0.7)'
        };

        // 차트 초기화 추가
        this.initializeCharts();

        // 기간 버튼 이벤트 리스너 추가
        this.initializeChartPeriodButtons();

        // 탭 전환 이벤트 리스너
        document.querySelectorAll('.sidebar-menu-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const tabId = e.currentTarget.dataset.tab;
                this.switchTab(tabId);
                
                // 채널별 수수료 탭 초기화
                if (tabId === 'channelCommissionTab') {
                    this.initializeCommissionTab();
                }
            });
        });
    }

    initializeDateListeners() {
        document.addEventListener('dateFilterChanged', async (e) => {
            const { data, period, startDate, endDate } = e.detail;
            this.currentPeriod = period;
            
            // 날짜 객체로 변환하여 정확한 시간 설정
            this.startDate = new Date(startDate);
            this.startDate.setHours(0, 0, 0, 0);
            this.endDate = new Date(endDate);
            this.endDate.setHours(23, 59, 59, 999);
            
            // Datepicker 값 업데이트
            const dateRangePicker = document.getElementById('dateRangePicker');
            if (dateRangePicker) {
                const formattedStart = this.formatDateForInput(this.startDate);
                const formattedEnd = this.formatDateForInput(this.endDate);
                dateRangePicker.value = `${formattedStart} ~ ${formattedEnd}`;
            }
            
            // 대시보드 업데이트
            await this.updateDashboard(data, period, this.startDate, this.endDate);

            // 상세 데이터 테이블 업데이트
            const activeTab = document.querySelector('.tab-content.active');
            if (activeTab && activeTab.id === 'detailDataTab' && this.tableManager) {
                await this.tableManager.updateTables(data);
            }
        });
    }

    async updateDashboard(data, period, startDate, endDate) {
        try {
            if (!Array.isArray(data)) {
                console.error('대시보드 업데이트 실패: 잘못된 데이터 형식');
                return;
            }

            // 1. 현재 기간 데이터 계산
            const currentSalesData = this.calculateSalesData(data);
            
            // 2. 이전 기간 데이터 계산
            const previousSalesData = await this.getPreviousPeriodData(period, startDate, endDate);

            // 3. 증감율 계산
            const growthRates = this.calculateGrowthRates(
                {
                    totalSales: currentSalesData.총매출,
                    orderCount: currentSalesData.구매건수,
                    uniqueCustomers: currentSalesData.구매자수
                },
                {
                    totalSales: previousSalesData.총매출,
                    orderCount: previousSalesData.구매건수,
                    uniqueCustomers: previousSalesData.구매자수
                }
            );

            // 4. UI 업데이트
            this.updateDashboardUI(currentSalesData, growthRates, period);

            // 5. 차트 업데이트 - Promise.all을 사용하여 동시에 실행
            await Promise.all([
                this.updateDayOfWeekSalesChart(data),
                this.updatePeriodSalesChart(data)
            ]);

            // 6. 상세 매출 정보 업데이트
            this.updateDetailedSalesInfo(data);

            // 7. 판매처별 매출 업데이트
            this.updateChannelSales(data);

            // 8. 재구매 통계 업데이트 추가
            this.updateRepurchaseStats(data);

        } catch (error) {
            console.error('매출 데이터 계산 중 오류:', error);
        }
    }

    async getPreviousPeriodData(period, startDate, endDate) {
        try {
            if (!period) return [];

            let previousStart, previousEnd;
            const today = new Date();

            if (period === 'all' || period === 'all-time') {
                // 데이터에서 가장 오래된 날짜 찾기
                const currentData = this.dataService.getCurrentData();
                const oldestDate = new Date(Math.min(...currentData.map(d => new Date(d.date))));
                
                previousStart = oldestDate;
                previousEnd = today;
                previousEnd.setHours(23, 59, 59, 999);
            } else if (period === 'custom') {
                if (!startDate || !endDate) return [];
                
                const start = new Date(startDate);
                const end = new Date(endDate);
                const daysDiff = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
                
                previousStart = new Date(start);
                previousStart.setDate(start.getDate() - daysDiff);
                previousEnd = new Date(end);
                previousEnd.setDate(end.getDate() - daysDiff);
            } else {
                switch (period) {
                    case 'today':
                        previousStart = new Date(today);
                        previousStart.setDate(today.getDate() - 1);
                        previousStart.setHours(0, 0, 0, 0);
                        previousEnd = new Date(previousStart);
                        previousEnd.setHours(23, 59, 59, 999);
                        break;

                    case 'yesterday':
                        previousStart = new Date(today);
                        previousStart.setDate(today.getDate() - 2);
                        previousStart.setHours(0, 0, 0, 0);
                        previousEnd = new Date(previousStart);
                        previousEnd.setHours(23, 59, 59, 999);
                        break;

                    case 'this-week':
                        previousStart = new Date(today);
                        previousStart.setDate(today.getDate() - (today.getDay() === 0 ? 6 : today.getDay() - 1) - 7);
                        previousStart.setHours(0, 0, 0, 0);
                        previousEnd = new Date(previousStart);
                        previousEnd.setDate(previousStart.getDate() + 6);
                        previousEnd.setHours(23, 59, 59, 999);
                        break;

                    case 'last-week':
                        previousStart = new Date(today);
                        previousStart.setDate(today.getDate() - (today.getDay() === 0 ? 6 : today.getDay() - 1) - 14);
                        previousStart.setHours(0, 0, 0, 0);
                        previousEnd = new Date(previousStart);
                        previousEnd.setDate(previousStart.getDate() + 6);
                        previousEnd.setHours(23, 59, 59, 999);
                        break;

                    case 'this-month':
                        previousStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                        previousStart.setHours(0, 0, 0, 0);
                        previousEnd = new Date(today.getFullYear(), today.getMonth(), 0);
                        previousEnd.setHours(23, 59, 59, 999);
                        break;

                    case 'last-month':
                        previousStart = new Date(today.getFullYear(), today.getMonth() - 2, 1);
                        previousStart.setHours(0, 0, 0, 0);
                        previousEnd = new Date(today.getFullYear(), today.getMonth() - 1, 0);
                        previousEnd.setHours(23, 59, 59, 999);
                        break;

                    case 'last-3-months':
                        previousStart = new Date(today.getFullYear(), today.getMonth() - 6, 1);
                        previousStart.setHours(0, 0, 0, 0);
                        previousEnd = new Date(today.getFullYear(), today.getMonth() - 3, 0);
                        previousEnd.setHours(23, 59, 59, 999);
                        break;

                    case 'last-6-months':
                        previousStart = new Date(today.getFullYear(), today.getMonth() - 12, 1);
                        previousStart.setHours(0, 0, 0, 0);
                        previousEnd = new Date(today.getFullYear(), today.getMonth() - 6, 0);
                        previousEnd.setHours(23, 59, 59, 999);
                        break;
                }
            }

            // 현재 데이터 가져오기
            const currentData = this.dataService.getCurrentData();
            
            // 날짜 기준으로 필터링
            const previousData = currentData.filter(item => {
                const itemDate = new Date(item.date);
                return itemDate >= previousStart && itemDate <= previousEnd;
            });

            // 이전 기간 매출 데이터 계산
            const previousSalesData = this.calculateSalesData(previousData);

            return previousSalesData;

        } catch (error) {
            console.error('이전 기간 데이터 조회 중 오류:', error);
            return {
                총매출: 0,
                구매건수: 0,
                구매자수: 0
            };
        }
    }

    calculateGrowthRates(current, previous) {
        const calculateRate = (curr, prev) => {
            if (prev === 0) return curr > 0 ? 100 : 0;
            return ((curr - prev) / prev) * 100;
        };

        const rates = {
            totalSales: calculateRate(current.totalSales, previous.totalSales),
            orderCount: calculateRate(current.orderCount, previous.orderCount),
            uniqueCustomers: calculateRate(current.uniqueCustomers, previous.uniqueCustomers)
        };


        return rates;
    }

    updateDashboardUI(salesData, growthRates, period) {
        try {
            // 매출액 업데이트
            this.updateMetric('total-sales', salesData.총매출, growthRates.totalSales, this.formatCurrency);
            
            // 구매건수 업데이트
            this.updateMetric('order-count', salesData.구매건수, growthRates.orderCount, this.formatNumber);
            
            // 구매자수 업데이트
            this.updateMetric('customer-count', salesData.구매자수, growthRates.uniqueCustomers, this.formatNumber);

            // 증감율 표시 여부 설정
            const growthElements = document.querySelectorAll('.growth');
            const amountElements = document.querySelectorAll('.amount');
            const comparePeriodElements = document.querySelectorAll('.compare-period');
            
            growthElements.forEach(element => {
                if (element) element.style.display = period === 'all' ? 'none' : 'block';
            });
            
            amountElements.forEach(element => {
                if (element) element.style.display = period === 'all' ? 'none' : 'block';
            });

            // 비교 기간 텍스트 업데이트
            const comparePeriodText = this.getComparisonPeriodText(period, this.startDate, this.endDate);
            comparePeriodElements.forEach(element => {
                if (element) {
                    element.style.display = period === 'all' ? 'none' : 'block';
                    element.textContent = comparePeriodText;
                }
            });

        } catch (error) {
            console.error('대시보드 UI 업데이트 중 오류:', error);
        }
    }

    updateMetric(elementId, value, growthRate, formatFunction) {
        const valueElement = document.getElementById(elementId);
        const growthId = elementId === 'total-sales' ? 'sales-growth' :
                        elementId === 'order-count' ? 'order-growth' :
                        elementId === 'customer-count' ? 'customer-growth' :
                        `${elementId}-growth`;
        
        if (valueElement) {
            let formattedValue = formatFunction(value);
            if (elementId === 'order-count') formattedValue += '건';
            if (elementId === 'customer-count') formattedValue += '명';
            valueElement.textContent = formattedValue;
        }
        
        const growthElement = document.getElementById(growthId);
        const amountId = growthId.replace('growth', 'amount');
        const amountElement = document.getElementById(amountId);
        
        if (growthElement && amountElement) {
            // 증감값 계산
            const previousValue = value / (1 + (growthRate / 100));
            const difference = value - previousValue;
            
            // 증감율 포맷팅
            const formattedGrowth = growthRate > 0 ? `+${growthRate.toFixed(1)}%` : 
                                   growthRate < 0 ? `${growthRate.toFixed(1)}%` : '0%';
            
            // 증감값 포맷팅
            let formattedDiff = formatFunction(Math.abs(difference));
            if (difference < 0) formattedDiff = '-' + formattedDiff;
            if (elementId === 'order-count') formattedDiff += '건';
            if (elementId === 'customer-count') formattedDiff += '명';
            
            // 증감 클래스 설정
            const growthClass = growthRate > 0 ? 'positive' : 
                              growthRate < 0 ? 'negative' : '';
            
            growthElement.className = `growth ${growthClass}`;
            growthElement.textContent = formattedGrowth;
            amountElement.textContent = formattedDiff;
        }
    }

    calculateDifference(currentValue, growthRate) {
        return currentValue - (currentValue / (1 + (growthRate / 100)));
    }

    getComparisonPeriodText(period, startDate, endDate) {
        const formatDate = (date) => `${date.getMonth() + 1}월 ${date.getDate()}일`;
        const formatMonth = (date) => `${date.getFullYear()}년 ${date.getMonth() + 1}월`;
        
        const today = new Date();
        
        switch (period) {
            case 'today':
                const yesterday = new Date(today);
                yesterday.setDate(today.getDate() - 1);
                return `${formatDate(yesterday)} 대비`;
                
            case 'yesterday': {
                const twoDaysAgo = new Date(today);
                twoDaysAgo.setDate(today.getDate() - 2);
                return `${formatDate(twoDaysAgo)} 대비`;
            }
            
            case 'this-week': {
                const lastWeekEnd = new Date(startDate);
                lastWeekEnd.setDate(lastWeekEnd.getDate() - 1);
                const lastWeekStart = new Date(lastWeekEnd);
                lastWeekStart.setDate(lastWeekEnd.getDate() - 6);
                return `${formatDate(lastWeekStart)} ~ ${formatDate(lastWeekEnd)} 대비`;
            }
            
            case 'last-week': {
                const twoWeeksAgoEnd = new Date(startDate);
                twoWeeksAgoEnd.setDate(twoWeeksAgoEnd.getDate() - 1);
                const twoWeeksAgoStart = new Date(twoWeeksAgoEnd);
                twoWeeksAgoStart.setDate(twoWeeksAgoEnd.getDate() - 6);
                return `${formatDate(twoWeeksAgoStart)} ~ ${formatDate(twoWeeksAgoEnd)} 대비`;
            }
            
            case 'this-month': {
                const lastMonth = new Date(startDate);
                lastMonth.setMonth(lastMonth.getMonth() - 1);
                return `${formatMonth(lastMonth)} 대비`;
            }
            
            case 'last-month': {
                const twoMonthsAgo = new Date(startDate);
                twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 1);
                return `${formatMonth(twoMonthsAgo)} 대비`;
            }
            
            case 'last-3-months': {
                const threeMonthsAgo = new Date(startDate);
                threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
                const compareEnd = new Date(startDate);
                compareEnd.setDate(compareEnd.getDate() - 1);
                const compareStart = new Date(threeMonthsAgo);
                return `${formatDate(compareStart)} ~ ${formatDate(compareEnd)} 대비`;
            }
            
            case 'last-6-months': {
                const sixMonthsAgo = new Date(startDate);
                sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
                const compareEnd = new Date(startDate);
                compareEnd.setDate(compareEnd.getDate() - 1);
                const compareStart = new Date(sixMonthsAgo);
                return `${formatDate(compareStart)} ~ ${formatDate(compareEnd)} 대비`;
            }
            
            case 'custom': {
                const compareEnd = new Date(startDate);
                compareEnd.setDate(compareEnd.getDate() - 1);
                const compareStart = new Date(compareEnd);
                const daysDiff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
                compareStart.setDate(compareEnd.getDate() - daysDiff + 1);
                return `${formatDate(compareStart)} ~ ${formatDate(compareEnd)} 대비`;
            }
            
            default:
                return '';
        }
    }

    formatGrowthRate(rate) {
        // 증감률 포맷팅 (소수점 1자리까지)
        return `${rate > 0 ? '+' : ''}${rate.toFixed(1)}%`;
    }

    getGrowthClass(rate) {
        if (typeof rate !== 'number') return 'growth-neutral';
        return rate > 0 ? 'growth-positive' : 
               rate < 0 ? 'growth-negative' : 
               'growth-neutral';
    }

    calculateSalesData(data) {
        
        // 판매처 종류 확인
        const sellers = new Set(data.map(item => item.seller));
        
        // 오늘의집 관련 판매처 찾기
        const ohouseData = data.filter(item => 
            item.seller && ['오늘의집', '오늘의집2', 'ohouse', 'Ohouse'].includes(item.seller)
        );
        
        // 매출 합계 계산 (취소/반품 제외)
        const totalSales = data.reduce((sum, item) => {
            const isOhouse = item.seller && ['오늘의집', '오늘의집2', 'ohouse', 'Ohouse'].includes(item.seller);
            const isValidOrder = isOhouse || 
                !['취소', '미결제취소', '반품'].includes(item.orderStatus);
            
            if (isValidOrder) {
                return sum + (parseFloat(item.sales) || 0);
            }
            return sum;
        }, 0);
        
        // 구매 건수 계산 (취소/반품 제외한 모든 유효한 주문)
        const validOrders = data.filter(item => {
            const isOhouse = item.seller && ['오늘의집', '오늘의집2', 'ohouse', 'Ohouse'].includes(item.seller);
            const isValidOrder = isOhouse || 
                !['취소', '미결제취소', '반품'].includes(item.orderStatus);
            return isValidOrder;
        });
        
        const purchaseCount = validOrders.length;  // 유효한 모든 주문 건수
        
        // 구매자 수 계산 (구매자명-연락처 기준으로 중복 제거)
        const uniqueCustomers = new Set(
            validOrders
                .filter(item => item.customerName || item.customerContact)  // 구매자 정보가 있는 주문만 필터링
                .map(item => {
                    const name = item.customerName || '';
                    const contact = item.customerContact || '';
                    return `${name}-${contact}`;  // 구매자명-연락처 조합으로 유니크키 생성
                })
        ).size;

        // 채널별 매출 (취소/반품 제외)
        const salesByChannel = data.reduce((acc, item) => {
            const isOhouse = item.seller && ['오늘의집', '오늘의집2', 'ohouse', 'Ohouse'].includes(item.seller);
            const isValidOrder = isOhouse || 
                !['취소', '미결제취소', '반품'].includes(item.orderStatus);
            
            if (isValidOrder) {
                const channel = item.seller || '기타';
                acc[channel] = (acc[channel] || 0) + (parseFloat(item.sales) || 0);
            }
            return acc;
        }, {});
        

        return {
            총매출: totalSales,
            구매건수: purchaseCount,
            구매자수: uniqueCustomers,
            채널별매출: salesByChannel
        };
    }

    async updateProductSalesTable(data) {
        const productSales = {};
        const salesData = {
            totalSales: 0,
            orderCount: 0,
            uniqueCustomers: new Set()
        };
        
        data.forEach(row => {
            if (row.seller === '스마트스토어' && CONFIG.SALES.ZERO_SALES_STATUSES.includes(row.orderStatus)) {
                return;
            }

            // 원본 옵션 정확하게 가져오기
            const originalOption = row.optionName || row.optionInfo || row.option || '';
            const mappedProduct = this.dataService.mappingService.getMappedProductInfo(row.productName, originalOption) || { 
                product: row.productName, 
                option: originalOption, 
                price: row.originalSales / row.quantity 
            };
            const sales = mappedProduct.price * row.quantity;

            salesData.totalSales += sales;
            salesData.orderCount++;

            const customerId = row.buyerId || row.buyerEmail || row.buyerContact;
            if (customerId) {
                salesData.uniqueCustomers.add(customerId);
            }
        });

        return {
            totalSales: salesData.totalSales,
            orderCount: salesData.orderCount,
            uniqueCustomers: salesData.uniqueCustomers.size
        };
    }

    formatCurrency(value) {
        return new Intl.NumberFormat('ko-KR', { 
            style: 'currency', 
            currency: 'KRW' 
        }).format(value);
    }

    formatNumber(number) {
        return new Intl.NumberFormat('ko-KR').format(number);
    }

    // Date 객체를 YYYY. MM. DD 형식의 문자열로 변환
    formatDateForInput(date) {
        if (!date) {
            console.warn('Null date provided to formatDateForInput');
            return '';
        }
        
        try {
            const d = new Date(date);
            if (isNaN(d.getTime())) {
                console.warn('Invalid date provided to formatDateForInput:', date);
                return '';
            }
            
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${year}. ${month}. ${day}`;
        } catch (error) {
            console.error('Error formatting date:', error);
            return '';
        }
    }

    initializeChartListeners() {
        document.querySelectorAll('.period-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const period = e.target.dataset.period;
                document.querySelectorAll('.period-btn').forEach(btn => {
                    btn.classList.remove('active');
                });
                e.target.classList.add('active');
                
                switch(period) {
                    case 'daily':
                        this.currentChartPeriod = 'daily';
                        break;
                    case 'weekly':
                        this.currentChartPeriod = 'weekly';
                        break;
                    case 'monthly':
                        this.currentChartPeriod = 'monthly';
                        break;
                }
                
                // 현재 데이터로 차트 다시 그리기
                this.updatePeriodSalesChart(this.dataService.getCurrentData());
            });
        });
    }

    updateCharts(data) {
        this.updatePeriodSalesChart(data);
        this.updateDailyChart(data);
    }

    async updatePeriodSalesChart(data) {
        try {
            const canvas = document.getElementById('periodSalesChart');
            if (!canvas) return;
            
            // 1. 차트 초기화
            this.updateChartPeriodLabel();
            
            // 차트 컨텍스트 받기
            const ctx = canvas.getContext('2d');
            
            // 기존 차트 파괴
            if (this.periodChart) {
                this.periodChart.destroy();
            }

            // 2. 기간 필터링
            const startDate = this.getDateWithoutTime(this.startDate);
            const endDate = this.getDateWithoutTime(this.endDate);
                
            const filteredData = data.filter(item => {
                const date = new Date(item.date);
                const itemDate = this.getDateWithoutTime(date);
                    return itemDate >= startDate && itemDate <= endDate;
                });
            
            // 3. 차트 데이터 구조 초기화
            const salesData = {};
            
            // 주문 중복 처리를 위한 Set
            const processedOrders = new Set();

            // 4. 날짜별 데이터 초기화 및 집계
            filteredData.forEach(item => {
                const date = new Date(item.date);
                let dateKey;

                switch (this.currentChartPeriod) {
                    case 'weekly':
                        const monday = new Date(date);
                        monday.setDate(date.getDate() - (date.getDay() === 0 ? 6 : date.getDay() - 1));
                        dateKey = this.formatDateKey(monday);
                        break;
                    case 'monthly':
                        // 월별 그룹화: YYYY-MM-01 형태로 각 월의 1일로 표준화
                        dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`;
                        break;
                    default: // daily
                        dateKey = this.formatDateKey(date);
                }

                if (!salesData[dateKey]) {
                    salesData[dateKey] = {
                        date: dateKey,
                        sales: {
                            '스마트스토어': 0,
                            '오늘의집': 0,
                            '유튜브쇼핑': 0,
                            '쿠팡': 0
                        },
                        orders: 0
                    };
                }

                const channel = item.seller || item.channel;
                
                // 유효한 채널인 경우만 처리
                if (channel && ['스마트스토어', '오늘의집', '유튜브쇼핑', '쿠팡'].includes(channel)) {
                    // 주문번호 기준으로 중복 제거
                    const orderKey = `${dateKey}-${item.orderNumber}-${channel}`;
                    if (!processedOrders.has(orderKey) && !['취소', '미결제취소', '반품'].includes(item.orderStatus)) {
                        processedOrders.add(orderKey);
                    
                    const mappingInfo = this.dataService.mappingService.getMappedProductInfo(
                            item.originalProduct || item.productName || '',
                            item.originalOption || '',
                        channel
                    );

                    if (mappingInfo) {
                            const price = mappingInfo.price || 0;
                            const quantity = parseInt(item.quantity) || 0;
                            const sales = price * quantity;

                            // NaN 체크
                            if (!isNaN(sales) && sales > 0) {
                        salesData[dateKey].sales[channel] += sales;
                                salesData[dateKey].orders += 1;
                            }
                        }
                    }
                }
            });

            // 5. 차트 데이터 준비
            const sortedDates = Object.keys(salesData).sort();
            const datasets = [
                {
                    label: '스마트스토어',
                    data: sortedDates.map(date => salesData[date].sales['스마트스토어']),
                    backgroundColor: this.CHANNEL_COLORS['스마트스토어'],
                    stack: 'stack1'
                },
                {
                    label: '오늘의집',
                    data: sortedDates.map(date => salesData[date].sales['오늘의집']),
                    backgroundColor: this.CHANNEL_COLORS['오늘의집'],
                    stack: 'stack1'
                },
                {
                    label: '유튜브쇼핑',
                    data: sortedDates.map(date => salesData[date].sales['유튜브쇼핑']),
                    backgroundColor: this.CHANNEL_COLORS['유튜브쇼핑'],
                    stack: 'stack1'
                },
                {
                    label: '구매건수',
                    type: 'line',
                    data: sortedDates.map(date => salesData[date].orders),
                    borderColor: '#666',
                    borderWidth: 2,
                    pointRadius: 4,
                    fill: false,
                    yAxisID: 'y1'
                }
            ];

            // 6. 새로운 차트 생성
            this.periodSalesChart = new Chart(canvas, {
                type: 'bar',
                data: {
                    labels: this.formatPeriodLabels(sortedDates, this.currentChartPeriod),
                    datasets: datasets
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            type: 'linear',
                            position: 'left',
                        },
                        y1: {
                            type: 'linear',
                            position: 'right',
                            grid: {
                                drawOnChartArea: false  // 오른쪽 y축의 그리드 라인 제거
                            }
                        }
                    },
                    plugins: {
                        legend: {
                            position: 'top',
                            align: 'center',
                            labels: {
                                usePointStyle: true,
                                padding: 20
                            }
                        },
                        tooltip: {
                            mode: 'index',  // 같은 x축 값의 모든 데이터를 하나의 툴팁으로 표시
                            intersect: false,  // 정확한 교차점이 아니어도 가까운 데이터 표시
                            callbacks: {
                                title: function(tooltipItems) {
                                    return tooltipItems[0].label;
                                },
                                afterBody: function(tooltipItems) {
                                    const result = [];
                                    
                                    // 매출 데이터 표시
                                    const salesItems = tooltipItems.filter(item => item.dataset.type !== 'line');
                                    salesItems.forEach(item => {
                                        result.push(`${item.dataset.label}: ₩${(item.raw/10000).toFixed(0)}만`);
                                    });
                                    
                                    // 총 매출 합계 표시
                                    const totalSales = salesItems.reduce((sum, item) => sum + item.raw, 0);
                                    result.push(`총 매출: ₩${(totalSales/10000).toFixed(0)}만`);
                                    
                                    // 구매건수 표시
                                    const orderItem = tooltipItems.find(item => item.dataset.type === 'line');
                                    if (orderItem) {
                                        result.push(`구매건수: ${orderItem.raw}건`);
                                    }
                                    
                                    return result;
                                },
                                label: function(context) {
                                    return null;  // label 콜백은 사용하지 않음
                                }
                            }
                        }
                    }
                }
            });

        } catch (error) {
            console.error('기간별 매출 차트 업데이트 중 오류:', error);
        }
    }

    async updateDayOfWeekSalesChart(data) {
        try {
            const canvas = document.getElementById('dayOfWeekSalesChart');
            if (!canvas || !data || !data.length) {
                return;
            }

            // 요일별 데이터 초기화
            const dayOfWeekData = {
                sales: Array(7).fill(0),
                orders: Array(7).fill(0),
                channels: {
                    '스마트스토어': Array(7).fill(0),
                    '오늘의집': Array(7).fill(0),
                    '유튜브쇼핑': Array(7).fill(0)
                }
            };

            // 데이터 집계
            data.forEach(item => {
                const date = new Date(item.date);
                let dayIndex = date.getDay();
                dayIndex = dayIndex === 0 ? 6 : dayIndex - 1;  // 월요일이 0이 되도록 조정

                const channel = item.seller;
                const quantity = parseInt(item.quantity) || 0;
                const originalProduct = item.originalProduct || item.productName || '';
                const originalOption = item.originalOption || '';
                
                const mappingInfo = this.dataService.mappingService.getMappedProductInfo(
                    originalProduct,
                    originalOption,
                    channel
                );

                let price = 0;
                if (mappingInfo && !['취소', '미결제취소', '반품'].includes(item.orderStatus)) {
                    price = mappingInfo.price;
                }

                const sales = quantity * price;

                if (channel && ['스마트스토어', '오늘의집', '유튜브쇼핑'].includes(channel)) {
                    dayOfWeekData.sales[dayIndex] += sales;
                    dayOfWeekData.orders[dayIndex]++;
                    dayOfWeekData.channels[channel][dayIndex] += sales;
                }
            });

            // 데이터가 모두 0인지 확인
            const hasData = dayOfWeekData.sales.some(value => value > 0);
            if (!hasData) {
                return;
            }

            const dayNames = ['월', '화', '수', '목', '금', '토', '일'];
            const channels = ['스마트스토어', '오늘의집', '유튜브쇼핑'];
            
            // 채널별 데이터셋
            const salesDatasets = channels.map(channel => ({
                label: channel,
                type: 'bar',
                data: dayOfWeekData.channels[channel],
                backgroundColor: this.CHANNEL_COLORS[channel],
                borderColor: this.CHANNEL_COLORS[channel].replace('0.7', '1'),
                borderWidth: 1,
                stack: 'sales'
            }));

            // 구매건수 데이터셋
            const orderDataset = {
                label: '구매건수',
                type: 'line',
                data: dayOfWeekData.orders,
                borderColor: '#666',
                borderWidth: 2,
                pointRadius: 4,
                fill: false,
                yAxisID: 'y1'
            };

            // 요일별 총 매출 계산
            const totalSalesByDay = dayOfWeekData.sales;

            const config = {
                type: 'bar',
                data: {
                    labels: dayNames,
                    datasets: [...salesDatasets, orderDataset]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            type: 'linear',
                            position: 'left',
                        },
                        y1: {
                            type: 'linear',
                            position: 'right',
                            grid: {
                                drawOnChartArea: false
                            }
                        }
                    },
                    plugins: {
                        tooltip: {
                            mode: 'index',  // 같은 x축 값의 모든 데이터를 하나의 툴팁으로 표시
                            intersect: false,  // 정확한 교차점이 아니어도 가까운 데이터 표시
                            callbacks: {
                                title: function(tooltipItems) {
                                    return dayNames[tooltipItems[0].dataIndex] + '요일';
                                },
                                afterBody: function(tooltipItems) {
                                    const result = [];
                                    
                                    // 매출 데이터 표시
                                    const salesItems = tooltipItems.filter(item => item.dataset.type !== 'line');
                                    salesItems.forEach(item => {
                                        result.push(`${item.dataset.label}: ₩${(item.raw/10000).toFixed(0)}만`);
                                    });
                                    
                                    // 총 매출 합계 표시
                                    const totalSales = salesItems.reduce((sum, item) => sum + item.raw, 0);
                                    result.push(`총 매출: ₩${(totalSales/10000).toFixed(0)}만`);
                                    
                                    // 구매건수 표시
                                    const orderItem = tooltipItems.find(item => item.dataset.type === 'line');
                                    if (orderItem) {
                                        result.push(`구매건수: ${orderItem.raw}건`);
                                    }
                                    
                                    return result;
                                },
                                label: function(context) {
                                    return null;  // label 콜백은 사용하지 않음
                                }
                            }
                        },
                        legend: {
                            position: 'top',
                            align: 'center',
                            labels: {
                                usePointStyle: true,
                                padding: 20
                            }
                        }
                    }
                }
            };

            if (this.dayOfWeekSalesChart) {
                this.dayOfWeekSalesChart.destroy();
            }
            this.dayOfWeekSalesChart = new Chart(canvas, config);

            // 요일별 평균 매출 계산 및 표시
            const avgSales = totalSalesByDay.reduce((sum, sales) => sum + sales, 0) / 7;
        } catch (error) {
            console.error('요일별 매출 차트 업데이트 중 오류:', error);
        }
    }

    formatDateForChart(date) {
        return `${date.getMonth() + 1}/${date.getDate()}`;
    }

    formatCurrency(value) {
        return new Intl.NumberFormat('ko-KR', {
            style: 'currency',
            currency: 'KRW',
            maximumFractionDigits: 0
        }).format(value);
    }

    groupDataByDay(data) {
        const dailyTotals = new Array(7).fill(0);
        
        data.forEach(item => {
            const date = this.getDateWithoutTime(item.date || item.orderDate);
            let dayOfWeek = date.getDay();
            dayOfWeek = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
            
            const sales = parseFloat(item.매출 || 0);
            dailyTotals[dayOfWeek] += sales;
        });
        
        return dailyTotals;
    }

    // 판매처별 데이터 그룹화
    groupDataByChannel(data) {
        const channelTotals = new Map();
        
        data.forEach(item => {
            const channel = item.channel || item.seller || '기타';
            const quantity = parseInt(item.quantity) || 0;
            
            const originalProduct = item.originalProduct || item.productName || '';
            const originalOption = item.originalOption || '';
            
            const mappingInfo = this.dataService.mappingService.getMappedProductInfo(
                originalProduct,
                originalOption,
                channel
            );

            if (mappingInfo && !['취소', '미결제취소', '반품'].includes(item.orderStatus)) {
                const sales = quantity * mappingInfo.price;
                
                if (!channelTotals.has(channel)) {
                    channelTotals.set(channel, 0);
                }
                channelTotals.set(channel, channelTotals.get(channel) + sales);
            }
        });
        
        // 매출액 기준으로 내림차순 정렬
        const sortedData = new Map([...channelTotals.entries()]
            .sort((a, b) => b[1] - a[1]));
        
        return {
            labels: Array.from(sortedData.keys()),
            values: Array.from(sortedData.values())
        };
    }

    groupDataByPeriod(data, period) {
        const groupedData = {};
        
        const startDate = this.getDateWithoutTime(this.startDate);
        const endDate = this.getDateWithoutTime(this.endDate);
        
        data.forEach(item => {
            const date = this.getDateWithoutTime(item.date || item.orderDate);
            // 날짜 비교 시 시간 제외
            if (date < startDate || date > endDate) return;
            
            let key;
            switch(period) {
                case 'day':
                    key = this.formatDateForChart(date);
                    break;
                case 'week': {
                    const dayOfWeek = date.getDay();
                    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
                    const weekStart = new Date(date);
                    weekStart.setDate(date.getDate() + mondayOffset);
                    const weekEnd = new Date(weekStart);
                    weekEnd.setDate(weekStart.getDate() + 6);
                    key = `${this.formatDateForChart(weekStart)} ~ ${this.formatDateForChart(weekEnd)}`;
                    break;
                }
                case 'month':
                    key = `${date.getFullYear()}년 ${date.getMonth() + 1}월`;
                    break;
            }
            
            if (!groupedData[key]) {
                groupedData[key] = 0;
            }
            
            const sales = parseFloat(item.매출 || 0);
            groupedData[key] += sales;
        });
        
        // 날짜순으로 정렬
        const sortedData = new Map([...groupedData.entries()].sort((a, b) => {
            const dateA = this.getDateFromString(a[0].split('~')[0].trim());
            const dateB = this.getDateFromString(b[0].split('~')[0].trim());
            return dateA - dateB;
        }));
        
        return {
            labels: Array.from(sortedData.keys()),
            values: Array.from(sortedData.values())
        };
    }

    formatDateForChart(date) {
        return `${date.getMonth() + 1}/${date.getDate()}`;
    }

    getChartTitle() {
        switch(this.currentChartPeriod) {
            case 'day':
                return '일별 매출';
            case 'week':
                return '주별 매출';
            case 'month':
                return '월별 매출';
            default:
                return '기간별 매출';
        }
    }

    formatNumber(value) {
        return new Intl.NumberFormat('ko-KR').format(value);
    }

    // 날짜만 비교하기 위한 유틸리티 함수 추가
    getDateWithoutTime(date) {
        const d = new Date(date);
        return new Date(d.getFullYear(), d.getMonth(), d.getDate());
    }

    // 날짜 문자열을 Date 객체로 변환하는 유틸리티 함수
    getDateFromString(dateStr) {
        const parts = dateStr.match(/(\d+)월 (\d+)일/);
        if (parts) {
            const currentYear = new Date().getFullYear();
            return new Date(currentYear, parseInt(parts[1]) - 1, parseInt(parts[2]));
        }
        return new Date(dateStr);
    }

    updateTopChannels(data) {
        const channelSales = {};
        let totalSales = 0;
        
        data.forEach(item => {
            const channel = item.판매처 || '기타';
            const sales = parseFloat(item.매출 || 0);
            
            channelSales[channel] = (channelSales[channel] || 0) + sales;
            totalSales += sales;
        });
        
        const sortedChannels = Object.entries(channelSales)
            .sort(([, a], [, b]) => b - a)
            .map(([channel, sales]) => ({
                channel,
                sales,
                ratio: (sales / totalSales * 100).toFixed(2)
            }));
        
        const container = document.getElementById('top-channels');
        if (container) {
            container.innerHTML = sortedChannels.map(({ channel, sales, ratio }) => `
                <div class="stat-item">
                    <div class="stat-title">${channel}</div>
                    <div class="stat-value">${this.formatCurrency(sales)}</div>
                    <div class="stat-sub">${ratio}%</div>
                </div>
            `).join('');
        }
    }

    updateTopProducts(data) {
        const productSales = {};
        
        data.forEach(item => {
            const quantity = parseInt(item.quantity) || 0;
            
            // 원본 데이터만 정확하게 추출
            const originalProduct = item.originalProduct || item.productName || '';
            const originalOption = item.originalOption || '';
            
            const mappingInfo = this.dataService.mappingService.getMappedProductInfo(
                originalProduct,
                originalOption,
                item.channel || item.seller
            );

            // 매핑된 정보가 있을 때만 매핑된 값과 가격 사용
            let displayProduct = originalProduct;
            let price = 0;
            if (mappingInfo) {
                displayProduct = mappingInfo.productName;
                // 취소/반품 주문은 매출 0으로 처리
                price = ['취소', '미결제취소', '반품'].includes(item.orderStatus) ? 0 : mappingInfo.price;
            }

            const sales = quantity * price;
            
            // 취소/반품이 아닌 경우에만 매출과 수량에 포함
            if (!['취소', '미결제취소', '반품'].includes(item.orderStatus)) {
                if (!productSales[displayProduct]) {
                    productSales[displayProduct] = {
                        sales: 0,
                        quantity: 0
                    };
                }
                
                productSales[displayProduct].sales += sales;
                productSales[displayProduct].quantity += quantity;
            }
        });
        
        const sortedProducts = Object.values(productSales)
            .sort((a, b) => b.sales - a.sales)
            .slice(0, 5)
            .map(({ product, sales, quantity }) => ({
                product,
                sales,
                quantity
            }));
        
        const container = document.getElementById('top-products');
        if (container) {
            container.innerHTML = sortedProducts.map(({ product, sales, quantity }) => `
                <div class="stat-item">
                    <div class="stat-title">${product}</div>
                    <div class="stat-value">${this.formatCurrency(sales)}</div>
                    <div class="stat-sub">${quantity}개</div>
                </div>
            `).join('');
        }
    }

    getChannelColor(channel) {
        const channelColors = {
            '스마트스토어': 'rgba(81, 194, 106, 0.8)',
            '오늘의집': 'rgba(83, 163, 194, 0.8)',
            '유튜브쇼핑': 'rgba(184, 59, 48, 0.8)'
        };
        return channelColors[channel] || 'rgba(201, 203, 207, 0.8)';
    }

    // 비교 기간 포맷팅 함수
    formatComparePeriod(startDate, endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        return `${start.getMonth() + 1}월 ${start.getDate()}일 ~ ${end.getMonth() + 1}월 ${end.getDate()}일과 비교`;
    }

    formatPeriodLabels(dates, period) {
        return dates.map(date => {
            const d = new Date(date);
            const kstDate = new Date(d.getTime() + (9 * 60 * 60 * 1000));
            
            switch (period) {
                case 'monthly':
                    return `${kstDate.getFullYear()}년 ${kstDate.getMonth() + 1}월`;
                case 'weekly':
                    return `${kstDate.getMonth() + 1}월 ${kstDate.getDate()}일`;
                case 'daily':
                default:
                    return `${kstDate.getMonth() + 1}/${kstDate.getDate()}`;
            }
        });
    }

    // 차트 초기화 함수 추가
    initializeCharts() {
        const periodChartCanvas = document.getElementById('periodSalesChart');
        const dayOfWeekCanvas = document.getElementById('dayOfWeekSalesChart');

        if (periodChartCanvas && !this.periodSalesChart) {
            this.periodSalesChart = new Chart(periodChartCanvas, {
                type: 'bar',
                data: {
                    labels: [],
                    datasets: []
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false
                }
            });
        }

        if (dayOfWeekCanvas && !this.dayOfWeekSalesChart) {
            this.dayOfWeekSalesChart = new Chart(dayOfWeekCanvas, {
                type: 'bar',
                data: {
                    labels: [],
                    datasets: []
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false
                }
            });
        }
    }

    formatDateKey(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    initializeChartPeriodButtons() {
        document.querySelectorAll('.period-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                // 활성 버튼 스타일 변경
                document.querySelectorAll('.period-btn').forEach(btn => {
                    btn.classList.remove('active');
                });
                e.target.classList.add('active');
                
                // 차트 기간 업데이트
                this.currentChartPeriod = e.target.dataset.period;
                
                // 현재 데이터로 차트 다시 그리기
                const currentData = this.dataService.getCurrentData();
                if (currentData) {
                    this.updatePeriodSalesChart(currentData);
                }
            });
        });
    }

    async handleDateSelection(period, customStartDate = null, customEndDate = null) {
        try {
            if (period === 'all') {
                // 전체 기간 선택 시 2023년 6월 26일부터 오늘까지로 설정
                this.startDate = new Date('2023-06-26');
                this.startDate.setHours(0, 0, 0, 0);
                this.endDate = new Date();
                this.endDate.setHours(23, 59, 59, 999);
                
                // DatePicker 업데이트
                const datePicker = document.getElementById('dateRangePicker')._flatpickr;
                if (datePicker) {
                    datePicker.setDate([this.startDate, this.endDate]);
                }
            } else {
                // 기존 다른 기간 선택 로직
                const dates = this.calculateDateRange(period, customStartDate, customEndDate);
                this.startDate = dates.startDate;
                this.endDate = dates.endDate;
            }
            
            this.currentPeriod = period;
            
            // 데이터 업데이트
            await this.updateDashboard();
            
        } catch (error) {
            console.error('날짜 선택 처리 중 오류:', error);
        }
    }

    async updateDetailedSalesInfo(data) {
        try {
            // 기존 더보기 버튼 제거
            const existingShowMoreContainer = document.querySelector('.show-more-container');
            if (existingShowMoreContainer) {
                existingShowMoreContainer.remove();
            }

            const productSales = {};
            let totalSales = 0;
            let totalProfit = 0;
            let totalOperatingProfit = 0;

            // 채널별 수수료 데이터 가져오기
            const commissionSnapshot = await getDocs(collection(window.firebase.db, 'channelCommissions'));
            const commissionData = {};
            commissionSnapshot.forEach(doc => {
                const data = doc.data();
                const key = `${data.productName}|${data.option || ''}`;
                commissionData[key] = data.commissionRates;
            });
            
            data.forEach(row => {
                const mappingInfo = this.dataService.mappingService.getMappedProductInfo(
                    row.originalProduct || row.productName,
                    row.originalOption || '',
                    row.channel || row.seller
                );
                
                if (!mappingInfo || ['취소', '미결제취소', '반품'].includes(row.orderStatus)) {
                    return;
                }

                const quantity = parseInt(row.quantity) || 0;
                const sales = mappingInfo.price * quantity;
                const cost = mappingInfo.cost * quantity;
                const profit = sales - cost;

                // 채널별 수수료 계산
                const commissionKey = `${mappingInfo.productName}|${mappingInfo.option || ''}`;
                const commissionRates = commissionData[commissionKey];
                let commission = 0;

                if (commissionRates) {
                    const channel = row.channel || row.seller;
                    let commissionRate = 0;

                    if (channel === '스마트스토어') {
                        commissionRate = commissionRates.smartstore;
                    } else if (channel === '오늘의집') {
                        commissionRate = commissionRates.ohouse;
                    } else if (channel === '유튜브쇼핑') {
                        commissionRate = commissionRates.ytshopping;
                    }

                    commission = (sales * commissionRate) / 100;
                }

                // 영업이익 = 순이익 - 수수료
                const operatingProfit = profit - commission;

                const key = `${mappingInfo.productName}|${mappingInfo.option || ''}`;
                if (!productSales[key]) {
                    productSales[key] = {
                        product: mappingInfo.productName,
                        option: mappingInfo.option || '',
                        quantity: 0,
                        sales: 0,
                        profit: 0,
                        commission: 0,
                        operatingProfit: 0
                    };
                }

                productSales[key].quantity += quantity;
                productSales[key].sales += sales;
                productSales[key].profit += profit;
                productSales[key].commission += commission;
                productSales[key].operatingProfit += operatingProfit;

                totalSales += sales;
                totalProfit += profit;
                totalOperatingProfit += operatingProfit;
            });

            // 상품별 매출 테이블 업데이트
            const tbody = document.getElementById('productSalesBody');
            if (tbody) {
                const tableElement = tbody.closest('table');
                if (!tableElement.classList.contains('sales-table')) {
                    tableElement.className = 'sales-table';
                }
                
                const sortedProducts = Object.values(productSales)
                    .sort((a, b) => b.sales - a.sales);

                const initialDisplayCount = 15;
                let isCurrentlyExpanded = false;

                const rows = sortedProducts.map((item, index) => {
                    const marginRate = ((item.profit / item.sales) * 100).toFixed(1);
                    const operatingMarginRate = ((item.operatingProfit / item.sales) * 100).toFixed(1);
                    
                    return `
                        <tr class="product-row ${index >= initialDisplayCount ? 'hidden' : ''}">
                            <td class="text-center">${index + 1}</td>
                            <td>${item.product}</td>
                            <td>${item.option || '-'}</td>
                            <td class="text-right">${this.formatNumber(item.quantity)}개</td>
                            <td class="text-right">${this.formatCurrency(item.sales)}</td>
                            <td class="text-right">${this.formatCurrency(item.profit)} (${marginRate}%)</td>
                            <td class="text-right">${this.formatCurrency(item.operatingProfit)} (${operatingMarginRate}%)</td>
                        </tr>
                    `;
                });

                const totalRow = `
                    <tr class="total-row">
                        <td colspan="4"><strong>합계</strong></td>
                        <td class="text-right"><strong>${this.formatCurrency(totalSales)}</strong></td>
                        <td class="text-right"><strong>${this.formatCurrency(totalProfit)} (${((totalProfit / totalSales) * 100).toFixed(1)}%)</strong></td>
                        <td class="text-right"><strong>${this.formatCurrency(totalOperatingProfit)} (${((totalOperatingProfit / totalSales) * 100).toFixed(1)}%)</strong></td>
                    </tr>
                `;

                tbody.innerHTML = rows.join('') + totalRow;

                // 더보기 버튼 추가
                if (sortedProducts.length > initialDisplayCount) {
                    const showMoreContainer = document.createElement('div');
                    showMoreContainer.className = 'show-more-container';
                    showMoreContainer.innerHTML = `
                        <button class="show-more-button" data-expanded="false">
                            더보기 (${initialDisplayCount}/${sortedProducts.length})
                        </button>
                    `;
                    
                    // 기존 더보기 버튼이 있다면 제거
                    const existingShowMore = tableElement.parentNode.querySelector('.show-more-container');
                    if (existingShowMore) {
                        existingShowMore.remove();
                    }
                    
                    tableElement.parentNode.insertBefore(showMoreContainer, tableElement.nextSibling);

                    // 더보기 버튼 이벤트 리스너 추가
                    const showMoreButton = showMoreContainer.querySelector('.show-more-button');
                    showMoreButton.addEventListener('click', () => {
                        const isExpanded = showMoreButton.getAttribute('data-expanded') === 'true';
                        const rows = tbody.querySelectorAll('.product-row');
                        
                        rows.forEach((row, index) => {
                            if (index >= initialDisplayCount) {
                                row.classList.toggle('hidden', isExpanded);
                            }
                        });
                        
                        showMoreButton.setAttribute('data-expanded', (!isExpanded).toString());
                        showMoreButton.textContent = isExpanded ? 
                            `더보기 (${initialDisplayCount}/${sortedProducts.length})` : 
                            '접기';
                    });
                }
            }
        } catch (error) {
            console.error('상품별 매출 정보 업데이트 중 오류:', error);
        }
    }

    updateChannelSales(data) {
        const channelData = this.groupDataByChannel(data);
        const totalSales = channelData.values.reduce((sum, value) => sum + value, 0);
        
        const channelSalesBody = document.getElementById('channelSalesBody');
        if (!channelSalesBody) return;

        const rows = channelData.labels.map((channel, index) => {
            const sales = channelData.values[index];
            const percentage = ((sales / totalSales) * 100).toFixed(1);
            return `
                <tr>
                    <td>${channel}</td>
                    <td class="text-right">${this.formatCurrency(sales)}</td>
                    <td class="text-right">${percentage}%</td>
                </tr>
            `;
        });

        // 합계 행 추가
        const totalRow = `
            <tr class="total-row">
                <td><strong>합계</strong></td>
                <td class="text-right"><strong>${this.formatCurrency(totalSales)}</strong></td>
                <td class="text-right"><strong>100%</strong></td>
            </tr>
        `;

        channelSalesBody.innerHTML = rows.join('') + totalRow;
    }

    // 채널별 수수료 탭 초기화
    initializeCommissionTab() {
        const container = document.getElementById('channelCommissionTab');
        container.innerHTML = `
            <div class="commission-management">
                <div class="commission-controls" style="text-align: left;">
                    <button id="editCommissions" class="btn">수정</button>
                    <button id="saveCommissions" class="btn" style="display: none;">저장</button>
                    <button id="addCommissionRow" class="btn" style="display: none;">새 상품 추가</button>
                </div>
                <div class="commission-table-container">
                    <table id="commissionTable">
                        <thead>
                            <tr>
                                <th>상품명</th>
                                <th>옵션</th>
                                <th>스마트스토어 (%)</th>
                                <th>오늘의집 (%)</th>
                                <th>유튜브쇼핑 (%)</th>
                                <th class="action-column">작업</th>
                            </tr>
                        </thead>
                        <tbody id="commissionTableBody"></tbody>
                    </table>
                </div>
                <div class="commission-bottom-controls">
                    <button id="editCommissionsBottom" class="btn">수정</button>
                    <button id="saveCommissionsBottom" class="btn" style="display: none;">저장</button>
                    <button id="addCommissionRowBottom" class="btn" style="display: none;">새 상품 추가</button>
                </div>
            </div>
        `;
        
        this.initializeCommissionListeners();
        this.loadCommissionData();
    }

    // 수수료 데이터 행 생성
    createCommissionRow(data = null, isEditing = false) {
        const row = document.createElement('tr');
        if (isEditing) {
            row.innerHTML = `
                <td><input type="text" class="commission-input product-name" value="${data?.productName || ''}" required></td>
                <td><input type="text" class="commission-input option" value="${data?.option || ''}" ></td>
                <td><input type="number" class="commission-input smartstore" value="${data?.commissionRates?.smartstore || '0'}" min="0" max="100" step="0.1"></td>
                <td><input type="number" class="commission-input ohouse" value="${data?.commissionRates?.ohouse || '0'}" min="0" max="100" step="0.1"></td>
                <td><input type="number" class="commission-input ytshopping" value="${data?.commissionRates?.ytshopping || '0'}" min="0" max="100" step="0.1"></td>
                <td class="action-column">
                    <button class="delete-row-btn">삭제</button>
                </td>
            `;
        } else {
            row.innerHTML = `
                <td>${data?.productName || ''}</td>
                <td>${data?.option || ''}</td>
                <td>${data?.commissionRates?.smartstore || '0'}%</td>
                <td>${data?.commissionRates?.ohouse || '0'}%</td>
                <td>${data?.commissionRates?.ytshopping || '0'}%</td>
                <td class="action-column"></td>
            `;
        }
        return row;
    }

    // 수수료 데이터 로드
    async loadCommissionData() {
        try {
            const commissionSnapshot = await getDocs(collection(window.firebase.db, 'channelCommissions'));
            const tbody = document.getElementById('commissionTableBody');
            tbody.innerHTML = '';

            commissionSnapshot.forEach(doc => {
                const data = doc.data();
                const row = this.createCommissionRow(data, false);
                row.dataset.id = doc.id;
                tbody.appendChild(row);
            });
        } catch (error) {
            console.error('수수료 데이터 로드 중 오류:', error);
        }
    }

    // 수수료 관리 이벤트 리스너 초기화
    initializeCommissionListeners() {
        const editBtn = document.getElementById('editCommissions');
        const saveBtn = document.getElementById('saveCommissions');
        const addBtn = document.getElementById('addCommissionRow');
        const editBtnBottom = document.getElementById('editCommissionsBottom');
        const saveBtnBottom = document.getElementById('saveCommissionsBottom');
        const addBtnBottom = document.getElementById('addCommissionRowBottom');
        const tbody = document.getElementById('commissionTableBody');

        const toggleEditMode = async (isEditing) => {
            if (!isEditing) {
                // 저장 로직
                try {
                    const rows = tbody.getElementsByTagName('tr');
                    const batch = window.firebase.firestore.batch();
                    
                    Array.from(rows).forEach(row => {
                        const inputs = row.querySelectorAll('input');
                        const data = {
                            productName: inputs[0].value,
                            option: inputs[1].value,
                            commissionRates: {
                                smartstore: parseFloat(inputs[2].value) || 0,
                                ohouse: parseFloat(inputs[3].value) || 0,
                                ytshopping: parseFloat(inputs[4].value) || 0
                            },
                            updatedAt: serverTimestamp()
                        };

                        const docId = row.dataset.id || doc(collection(window.firebase.db, 'channelCommissions')).id;
                        const docRef = doc(window.firebase.db, 'channelCommissions', docId);
                        batch.set(docRef, data);
                    });

                    await batch.commit();
                    alert('수수료 정보가 저장되었습니다.');
                    
                    // 저장 후 데이터 다시 로드
                    await this.loadCommissionData();
                } catch (error) {
                    console.error('수수료 정보 저장 중 오류:', error);
                    alert('저장 중 오류가 발생했습니다.');
                    return;
                }
            }

            editBtn.style.display = isEditing ? 'none' : 'inline-block';
            saveBtn.style.display = isEditing ? 'inline-block' : 'none';
            addBtn.style.display = isEditing ? 'inline-block' : 'none';
            editBtnBottom.style.display = isEditing ? 'none' : 'inline-block';
            saveBtnBottom.style.display = isEditing ? 'inline-block' : 'none';
            addBtnBottom.style.display = isEditing ? 'inline-block' : 'none';

            if (isEditing) {
                // 수정 모드로 전환
                const rows = tbody.getElementsByTagName('tr');
                Array.from(rows).forEach(row => {
                    const data = {
                        productName: row.cells[0].textContent,
                        option: row.cells[1].textContent,
                        commissionRates: {
                            smartstore: parseFloat(row.cells[2].textContent),
                            ohouse: parseFloat(row.cells[3].textContent),
                            ytshopping: parseFloat(row.cells[4].textContent)
                        }
                    };
                    const newRow = this.createCommissionRow(data, true);
                    newRow.dataset.id = row.dataset.id;
                    row.replaceWith(newRow);
                });
            }
        };

        editBtn.addEventListener('click', () => toggleEditMode(true));
        editBtnBottom.addEventListener('click', () => toggleEditMode(true));
        saveBtn.addEventListener('click', () => toggleEditMode(false));
        saveBtnBottom.addEventListener('click', () => toggleEditMode(false));

        const addNewRow = () => {
            const newRow = this.createCommissionRow(null, true);
            tbody.appendChild(newRow);
        };

        addBtn.addEventListener('click', addNewRow);
        addBtnBottom.addEventListener('click', addNewRow);

        // 삭제 버튼 이벤트 리스너
        tbody.addEventListener('click', async (e) => {
            if (e.target.classList.contains('delete-row-btn')) {
                const row = e.target.closest('tr');
                const productName = row.querySelector('.product-name')?.value || row.cells[0].textContent;
                
                if (confirm(`"${productName}" 상품의 수수료 정보를 삭제하시겠습니까?`)) {
                    if (row.dataset.id) {
                        try {
                            await deleteDoc(doc(window.firebase.db, 'channelCommissions', row.dataset.id));
                            alert('삭제되었습니다.');
                        } catch (error) {
                            console.error('삭제 중 오류:', error);
                            alert('삭제 중 오류가 발생했습니다.');
                            return;
                        }
                    }
                    row.remove();
                }
            }
        });
    }

    switchTab(tabId) {
        // 모든 탭 컨텐츠와 메뉴 아이템의 active 클래스 제거
        document.querySelectorAll('.tab-content, .sidebar-menu-item').forEach(el => {
            el.classList.remove('active');
        });
        
        // 선택된 탭과 메뉴 아이템에 active 클래스 추가
        document.getElementById(tabId)?.classList.add('active');
        document.querySelector(`.sidebar-menu-item[data-tab="${tabId}"]`)?.classList.add('active');
    }

    // 월별 매출 현황 업데이트 함수
    updateMonthlySalesTable(data) {
        const tbody = document.getElementById('monthlySalesBody');
        if (!tbody) return;

        // 테이블에 클래스 적용
        const table = tbody.closest('table');
        table.className = 'monthly-sales-table';

        // 월별 데이터 정리
        const monthlyData = {};
        data.forEach(item => {
            if (!['취소', '미결제취소', '반품'].includes(item.orderStatus)) {
                const date = new Date(item.orderDate);
                const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                
                if (!monthlyData[monthKey]) {
                    monthlyData[monthKey] = {
                        storeSales: 0,
                        adRevenue: 0,
                        groupSales: 0
                    };
                }

                // 매출 유형에 따라 분류
                const mappingInfo = this.dataService.mappingService.getMappedProductInfo(
                    item.originalProduct || item.productName,
                    item.originalOption || '',
                    item.channel || item.seller
                );

                if (mappingInfo) {
                    const sales = parseInt(item.quantity) * mappingInfo.price;
                    if (item.isGroupPurchase) {
                        monthlyData[monthKey].groupSales += sales;
                    } else {
                        monthlyData[monthKey].storeSales += sales;
                    }
                }
            }
        });

        // 테이블 행 생성
        const rows = Object.entries(monthlyData)
            .sort(([a], [b]) => b.localeCompare(a))
            .map(([month, data]) => {
                const total = data.storeSales + data.adRevenue + data.groupSales;
                const [year, monthNum] = month.split('-');
                
                return `
                    <tr>
                        <td>
                            <span class="expand-btn">+</span>
                            ${monthNum}월
                        </td>
                        <td class="text-right">${this.formatCurrency(data.storeSales)}</td>
                        <td class="text-right">${this.formatCurrency(data.adRevenue)}</td>
                        <td class="text-right">${this.formatCurrency(data.groupSales)}</td>
                        <td class="text-right">${this.formatCurrency(total)}</td>
                    </tr>
                    <tr class="detail-row" style="display: none;">
                        <td colspan="5">
                            <div class="sales-detail">
                                <div class="store-sales-detail">
                                    <h4>스토어 매출 상세</h4>
                                    ${this.generateStoreSalesDetail(data.storeSales)}
                                </div>
                                ${data.groupSales > 0 ? `
                                    <div class="group-sales-detail">
                                        <h4>공동구매 매출 상세</h4>
                                        ${this.generateGroupSalesDetail(data.groupSales)}
                                    </div>
                                ` : ''}
                            </div>
                        </td>
                    </tr>
                `;
            });

        tbody.innerHTML = rows.join('');
        this.initializeExpandButtons();
    }

    // 확장/축소 버튼 초기화
    initializeExpandButtons() {
        document.querySelectorAll('.expand-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const detailRow = e.target.closest('tr').nextElementSibling;
                const isExpanded = detailRow.style.display !== 'none';
                
                e.target.textContent = isExpanded ? '+' : '-';
                detailRow.style.display = isExpanded ? 'none' : 'table-row';
            });
        });
    }

    // 스토어 매출 상세 HTML 생성
    generateStoreSalesDetail(storeSales) {
        return `
            <div class="monthly-sales-detail">
                <h4>스토어 매출 상세</h4>
                <div class="sales-detail-grid">
                    <div class="sales-detail-item">
                        <div class="store-name">스마트스토어</div>
                        <div class="store-amount">${this.formatCurrency(storeSales * 0.7)}</div>
                    </div>
                    <div class="sales-detail-item">
                        <div class="store-name">오늘의집</div>
                        <div class="store-amount">${this.formatCurrency(storeSales * 0.2)}</div>
                    </div>
                    <div class="sales-detail-item">
                        <div class="store-name">유튜브쇼핑</div>
                        <div class="store-amount">${this.formatCurrency(storeSales * 0.1)}</div>
                    </div>
                </div>
            </div>
        `;
    }

    // 공동구매 매출 상세 HTML 생성
    generateGroupSalesDetail(groupSales) {
        return `
            <div class="monthly-sales-detail">
                <h4>공동구매 매출 상세</h4>
                <div class="sales-detail-grid">
                    <div class="sales-detail-item">
                        <div class="group-sales-title">총 매출액</div>
                        <div class="group-sales-amount">${this.formatCurrency(groupSales)}</div>
                    </div>
                </div>
            </div>
        `;
    }

    initializeChartControls() {
        const container = document.getElementById('periodSalesChart').parentElement;
        
        // 기간별 매출 분석 버튼 컨테이너 추가
        const periodButtonsContainer = document.createElement('div');
        periodButtonsContainer.className = 'period-btn-container';
        periodButtonsContainer.innerHTML = `
            <button class="period-btn active" data-period="daily">일별</button>
            <button class="period-btn" data-period="weekly">주별</button>
            <button class="period-btn" data-period="monthly">월별</button>
        `;
        
        // 차트 위에 버튼 컨테이너 삽입
        container.insertBefore(periodButtonsContainer, container.firstChild);
        
        // 버튼 이벤트 리스너 추가
        document.querySelectorAll('.period-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                // 활성 버튼 스타일 변경
                document.querySelectorAll('.period-btn').forEach(btn => {
                    btn.classList.remove('active');
                });
                e.target.classList.add('active');
                
                // 기간 설정
                const period = e.target.dataset.period;
                this.currentChartPeriod = period;
                
                // 현재 데이터로 차트 다시 그리기
                this.updatePeriodSalesChart(this.dataService.getCurrentData());
            });
        });
    }

    // 발주 탭 초기화
    initializeOrderTab() {
        const orderContainer = document.querySelector('#orderTab .order-dashboard');
        if (!orderContainer) return;

        // 상단 컨트롤 섹션 추가
        orderContainer.innerHTML = `
            <div class="date-selector-container">
                <div class="button-container">
                    <button class="date-selector" data-period="today">오늘</button>
                    <button class="date-selector" data-period="this-week">이번 주</button>
                    <button class="date-selector" data-period="this-month">이번 달</button>
                    <button class="date-selector" data-period="custom">직접설정</button>
                </div>
                <input type="text" id="orderDateRangePicker" class="date-range-picker" style="display: none;" placeholder="날짜 선택" readonly>
            </div>
            <div class="order-summary">
                <div class="order-stats">
                    <div class="order-stat-box">
                        <h3>발주 현황</h3>
                        <div class="order-stat-value" id="order-status">0건</div>
                    </div>
                    <div class="order-stat-box">
                        <h3>발주액</h3>
                        <div class="order-stat-value" id="order-amount">0원</div>
                    </div>
                </div>
            </div>
            <div class="order-cards-container">
                <div id="orderTableContainer" class="order-table-container"></div>
            </div>
        `;

        // 날짜 선택기 이벤트 리스너
        document.querySelectorAll('#orderTab .date-selector').forEach(button => {
            button.addEventListener('click', (e) => {
                const period = e.target.dataset.period;
                const datePicker = document.getElementById('orderDateRangePicker');
                
                // 모든 버튼의 active 클래스 제거
                document.querySelectorAll('#orderTab .date-selector').forEach(btn => {
                    btn.classList.remove('active');
                });
                
                // 클릭된 버튼에 active 클래스 추가
                e.target.classList.add('active');

                // 직접설정 버튼 클릭 시 date picker 표시
                datePicker.style.display = period === 'custom' ? 'block' : 'none';

                if (period !== 'custom') {
                    this.handleOrderDateSelection(period);
                }
            });
        });

        // Flatpickr 초기화
        this.initializeOrderDatePicker();
    }

    calculateRepurchaseStats(data) {
        const customerPurchases = new Map();
        
        // 유효한 주문만 필터링
        const validOrders = data.filter(item => 
            !['취소', '반품', '미결제취소'].includes(item.orderStatus)
        );

        // 주문번호별로 그룹화
        const orderGroups = new Map();
        validOrders.forEach(item => {
            const orderNumber = item.orderNumber;
            if (!orderGroups.has(orderNumber)) {
                orderGroups.set(orderNumber, {
                    customerName: item.customerName,
                    customerContact: item.customerContact,
                    date: item.date || item.orderDate,
                    amount: 0
                });
            }
            
            const order = orderGroups.get(orderNumber);
            const quantity = parseInt(item.quantity) || 0;
            const mappingInfo = this.dataService.mappingService.getMappedProductInfo(
                item.originalProduct || item.productName,
                item.originalOption || '',
                item.channel || item.seller
            );

            if (mappingInfo) {
                order.amount += quantity * mappingInfo.price;
            }
        });

        // 고객별 주문 정보 수집
        orderGroups.forEach((order, orderNumber) => {
            const { customerName, customerContact, date, amount } = order;
            if (!customerName || !customerContact) return;
            
            const customerId = `${customerName}-${customerContact}`;
            if (!customerPurchases.has(customerId)) {
                customerPurchases.set(customerId, {
                    name: customerName,
                    contact: customerContact,
                    orders: [],
                    totalAmount: 0
                });
            }
            
            const customer = customerPurchases.get(customerId);
            customer.orders.push({ date, amount });
            customer.totalAmount += amount;
        });

        // 구매 횟수별로 고객 분류
        const stats = {
            firstTime: { count: 0, customers: [] },
            repeat: { count: 0, customers: [] },
            threeOrMore: { count: 0, customers: [] },
            fiveOrMore: { count: 0, customers: [] }
        };

        customerPurchases.forEach((customer) => {
            const purchaseCount = customer.orders.length;
            customer.purchaseCount = purchaseCount;

            if (purchaseCount === 1) {
                stats.firstTime.count++;
                stats.firstTime.customers.push(customer);
            } else if (purchaseCount >= 5) {
                stats.fiveOrMore.count++;
                stats.fiveOrMore.customers.push(customer);
            } else if (purchaseCount >= 3) {
                stats.threeOrMore.count++;
                stats.threeOrMore.customers.push(customer);
            } else if (purchaseCount === 2) {
                stats.repeat.count++;
                stats.repeat.customers.push(customer);
            }
        });

        return stats;
    }

    updateRepurchaseStats(data) {
        try {
            const repurchaseStats = this.calculateRepurchaseStats(data);
            const tbody = document.getElementById('repurchaseStatsBody');
            if (!tbody) return;

            const totalCustomers = repurchaseStats.firstTime.count + repurchaseStats.repeat.count + 
                                 repurchaseStats.threeOrMore.count + repurchaseStats.fiveOrMore.count;

            tbody.innerHTML = '';

            // 카테고리별 데이터 생성
            const categories = [
                { 
                    label: '첫 구매', 
                    count: repurchaseStats.firstTime.count,
                    customers: repurchaseStats.firstTime.customers
                },
                { 
                    label: '재구매', 
                    count: repurchaseStats.repeat.count,
                    customers: repurchaseStats.repeat.customers
                },
                { 
                    label: '3회~4회', 
                    count: repurchaseStats.threeOrMore.count,
                    customers: repurchaseStats.threeOrMore.customers
                },
                { 
                    label: '5회 이상', 
                    count: repurchaseStats.fiveOrMore.count,
                    customers: repurchaseStats.fiveOrMore.customers
                }
            ];

            // 각 카테고리별 행 생성
            categories.forEach(category => {
                const percentage = totalCustomers > 0 ? 
                    ((category.count / totalCustomers) * 100).toFixed(1) : '0.0';

                // 메인 행 추가
                const mainRow = document.createElement('tr');
                mainRow.className = 'main-row';
                mainRow.innerHTML = `
                    <td>
                        <button type="button" class="toggle-details-btn" aria-label="상세 정보 토글">
                            <i class="fas fa-plus"></i>
                        </button>
                        <span>${category.label}</span>
                    </td>
                    <td class="text-right">${category.count}명</td>
                    <td class="text-right">${percentage}%</td>
                `;

                // 상세 행 추가
                const detailRow = document.createElement('tr');
                detailRow.className = 'detail-row';
                detailRow.style.display = 'none';
                detailRow.innerHTML = `
                    <td colspan="3">
                        <div class="customer-details-container">
                            <div class="sort-controls">
                                <div class="sort-buttons">
                                    <button class="sort-btn" data-sort="amount">
                                        구매금액순
                                        <i class="fas fa-sort"></i>
                                    </button>
                                    <button class="sort-btn" data-sort="date">
                                        최근구매순
                                        <i class="fas fa-sort"></i>
                                    </button>
                                </div>
                            </div>
                            <div class="customer-list"></div>
                        </div>
                    </td>
                `;

                tbody.appendChild(mainRow);
                tbody.appendChild(detailRow);

                // 토글 버튼 클릭 이벤트 추가
                const toggleBtn = mainRow.querySelector('.toggle-details-btn');
                toggleBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const icon = toggleBtn.querySelector('i');
                    const isExpanded = detailRow.style.display !== 'none';
                    
                    // 다른 모든 행 닫기
                    tbody.querySelectorAll('.detail-row').forEach(row => {
                        if (row !== detailRow) {
                            row.style.display = 'none';
                            const btn = row.previousElementSibling.querySelector('.toggle-details-btn i');
                            if (btn) btn.className = 'fas fa-plus';
                        }
                    });

                    // 현재 행 토글
                    if (isExpanded) {
                        detailRow.style.display = 'none';
                        icon.className = 'fas fa-plus';
                    } else {
                        detailRow.style.display = 'table-row';
                        icon.className = 'fas fa-minus';
                        
                        // 고객 상세 정보 표시
                        const customerList = detailRow.querySelector('.customer-list');
                        this.displayCustomerDetails(customerList, category.customers);
                    }
                });
            });

            // 전체 행 추가
            const totalRow = document.createElement('tr');
            totalRow.className = 'total-row';
            const repurchaseCount = repurchaseStats.repeat.count + 
                                  repurchaseStats.threeOrMore.count + 
                                  repurchaseStats.fiveOrMore.count;
            const repurchaseRate = totalCustomers > 0 ? 
                ((repurchaseCount / totalCustomers) * 100).toFixed(1) : '0.0';

            totalRow.innerHTML = `
                <td>전체</td>
                <td class="text-right">${totalCustomers}명</td>
                <td class="text-right">재구매율: ${repurchaseRate}%</td>
            `;
            tbody.appendChild(totalRow);
        } catch (error) {
            console.error('재구매 통계 업데이트 중 오류:', error);
        }
    }

    // 고객 상세 정보 표시 함수
    displayCustomerDetails(container, customers) {
        if (!container || !customers) return;

        const formatDate = (dateStr) => {
            const date = new Date(dateStr);
            return `${String(date.getFullYear()).slice(-2)}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;
        };

        container.innerHTML = customers.map(customer => {
            // 구매일자 정렬 (오래된 순)
            const sortedOrders = [...customer.orders].sort((a, b) => 
                new Date(a.date) - new Date(b.date)
            );

            return `
                <div class="customer-detail-item">
                    <div class="customer-info">
                        <div class="customer-header">
                            <span class="customer-name">${customer.name}</span>
                            <span class="customer-contact">(${customer.contact || ''})</span>
                        </div>
                        <div class="customer-total">₩${this.formatNumber(customer.totalAmount)}</div>
                    </div>
                    <div class="purchase-info">
                        <span class="purchase-count">${customer.orders.length}회 구매</span>
                        <span class="purchase-dates">${sortedOrders.map(order => formatDate(order.date)).join(', ')}</span>
                    </div>
                </div>
            `;
        }).join('');

        // 정렬 버튼 이벤트 리스너
        const sortButtons = container.parentElement.querySelectorAll('.sort-btn');
        sortButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.stopPropagation();
                const sortType = button.dataset.sort;
                const currentSort = button.dataset.currentSort || 'none';
                
                // 정렬 방향 결정
                let newSort = 'asc';
                if (currentSort === 'asc') newSort = 'desc';
                if (currentSort === 'desc') newSort = 'asc';
                
                // 다른 버튼의 정렬 상태 초기화
                sortButtons.forEach(btn => {
                    btn.dataset.currentSort = '';
                    btn.querySelector('i').className = 'fas fa-sort';
                });
                
                // 현재 버튼 상태 업데이트
                button.dataset.currentSort = newSort;
                button.querySelector('i').className = `fas fa-sort-${newSort === 'asc' ? 'up' : 'down'}`;
                
                // 고객 목록 정렬
                const sortedCustomers = [...customers].sort((a, b) => {
                    if (sortType === 'amount') {
                        return newSort === 'asc' ? 
                            a.totalAmount - b.totalAmount : 
                            b.totalAmount - a.totalAmount;
                    } else if (sortType === 'date') {
                        const aDate = new Date(a.orders[0].date);
                        const bDate = new Date(b.orders[0].date);
                        return newSort === 'asc' ? 
                            aDate - bDate : 
                            bDate - aDate;
                    }
                    return 0;
                });
                
                this.displayCustomerDetails(container, sortedCustomers);
            });
        });
    }

    async updateSalesData(data) {
        console.log('상품별 매출 계산 시작');
        const salesByProduct = {};
        
        data.forEach(item => {
            if (item.seller === '오늘의집') {
                console.log('오늘의집 상품 처리:', {
                    productName: item.productName,
                    option: item.optionName || item.optionInfo || item.option || '',
                    quantity: item.quantity,
                    sales: item.sales,
                    orderStatus: item.orderStatus
                });
            }
            
            const quantity = parseInt(item.quantity) || 0;
            const originalOption = item.optionName || item.optionInfo || item.option || '';
            const mappedProduct = this.dataService.mappingService.getMappedProductInfo(item.productName, originalOption) || {
                product: item.productName,
                option: originalOption,
                price: item.originalSales / quantity,
                cost: 0
            };

            const mappedKey = `${mappedProduct.product}-${mappedProduct.option}`;
            
            if (!salesByProduct[mappedKey]) {
                salesByProduct[mappedKey] = {
                    quantity: 0,
                    sales: 0,
                    cost: mappedProduct.cost || 0
                };
            }
            
            let sales = mappedProduct.price * quantity;
            if (item.seller === '스마트스토어' && CONFIG.SALES.ZERO_SALES_STATUSES.includes(item.orderStatus)) {
                sales = 0;
            }
            
            salesByProduct[mappedKey].quantity += quantity;
            salesByProduct[mappedKey].sales += sales;
        });

        console.log('최종 상품별 매출:', salesByProduct);

        const tbody = document.querySelector('#sales-by-product tbody');
        if (!tbody) return;

        Object.entries(salesByProduct)
            .sort(([, a], [, b]) => b.sales - a.sales)
            .forEach(([productName, data]) => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${productName}</td>
                    <td class="text-right">${this.formatNumber(data.quantity)}</td>
                    <td class="text-right">${this.formatCurrency(data.sales)}</td>
                    <td class="text-right">${this.formatCurrency(data.cost * data.quantity)}</td>
                    <td class="text-right">${this.formatCurrency(data.sales - (data.cost * data.quantity))}</td>
                `;
                tbody.appendChild(row);
            });
    }
} 

