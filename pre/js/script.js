import { DateUtils } from './utils/dateUtils.js';
import { FormatUtils } from './utils/formatUtils.js';
import { AuthService } from './services/authService.js';
import { DataService } from './services/dataService.js';
import { Dashboard } from './components/dashboard.js';
import { MandalaChart } from './components/mandala.js';
import { TableManager } from './components/tables.js';
import { MappingService } from './services/mappingService.js';
import { OrderManager } from './components/order.js';
import { CashFlowManager } from './components/cashFlow.js';
import { TotalSales } from './components/totalSales.js';

class App {
    constructor() {
        // 탭 ID 상수 정의
        this.TAB_IDS = {
            DASHBOARD: 'dashboardTab',
            DETAIL_DATA: 'detailDataTab',
            MANDALA: 'mandalaTab',
            ADDITIONAL_INFO: 'additionalInfoTab',
            ORDER: 'orderTab',
            CASH_FLOW: 'cashFlowTab',
            TOTAL_SALES: 'totalSalesTab'
        };

        // 탭 ID 매핑 정의
        this.TAB_MAPPING = {
            'dashboard': this.TAB_IDS.DASHBOARD,
            'detailData': this.TAB_IDS.DETAIL_DATA,
            'mandala': this.TAB_IDS.MANDALA,
            'additionalInfo': this.TAB_IDS.ADDITIONAL_INFO,
            'order': this.TAB_IDS.ORDER,
            'cashFlow': this.TAB_IDS.CASH_FLOW,
            'totalSales': this.TAB_IDS.TOTAL_SALES
        };

        if (window.app) {
            window.app.destroy();
        }
        
        // 서비스 인스턴스 초기화
        this.dataService = null;
        this.authService = null;
        this.ice = null;
        this.dashboard = null;
        this.tableManager = null;
        
        this.waitForDependencies()
            .then(() => this.initialize())
            .catch(error => {
                console.error('초기화 실패:', error);
            });
        
        // 날짜 선택기 초기화
        this.initializeDatePicker();
        this.initializeDateButtons();
        this.initializeSidebar();
    }

    async waitForDependencies() {
        // Firebase 초기화 대기
        await this.waitForFirebase();
        // GAPI 초기화 대기
        await this.waitForGapi();
        console.log('모든 의존성 로드 완료');
    }

    async waitForFirebase() {
        for (let i = 0; i < 100; i++) {
            if (window.firebase?.auth) {
                console.log('Firebase 초기화 확인됨');
                return;
            }
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        throw new Error('Firebase 초기화 시간 초과');
    }

    async waitForGapi() {
        for (let i = 0; i < 100; i++) {
            if (typeof gapi !== 'undefined') {
                console.log('GAPI 로드됨');
                return;
            }
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        throw new Error('GAPI 로드 시간 초과');
    }

    async initialize() {
        try {
            console.log('서비스 초기화 시작');
            
            // DataService 초기화
            this.dataService = new DataService();
            await this.dataService.initialize();
            
            // TableManager 초기화
            this.tableManager = new TableManager(this.dataService);
            
            // Dashboard 초기화 (TableManager 전달)
            this.dashboard = new Dashboard(this.dataService);
            this.dashboard.tableManager = this.tableManager;
            console.log('Dashboard 초기화됨:', !!this.dashboard);
            
            // AuthService 초기화
            this.authService = new AuthService();
            
            // 발주 관리자 초기화
            this.orderManager = new OrderManager();
            
            // 서비스 초기화 확인
            if (!this.dataService || !this.authService || 
                !this.dashboard || !this.tableManager) {
                throw new Error('서비스 초기화 실패');
            }
            
            // 이벤트 리스너 설정
            this.setupEventListeners();
            
            // 인증 상태 감지 설정
            this.authService.onAuthStateChanged(async (user) => {
                if (user) {
                    document.getElementById('loginContainer').style.display = 'none';
                    document.getElementById('contentContainer').style.display = 'block';
                    document.getElementById('userEmail').textContent = user.email;
                    await this.loadInitialData();
                } else {
                    document.getElementById('loginContainer').style.display = 'flex';
                    document.getElementById('contentContainer').style.display = 'none';
                    document.getElementById('userEmail').textContent = '';
                }
            });

            // TotalSales 초기화
            this.totalSales = new TotalSales(this.dataService);

        } catch (error) {
            console.error('초기화 중 오류:', error);
            throw error;
        }
    }

    async loadInitialData() {
        try {
            // 초기 데이터 로드
            await this.dataService.initializeMappings();
            const rawData = await this.dataService.loadData();
            const processedData = await this.dataService.processData(rawData);
            this.dataService.setCurrentData(processedData);
            
            // 대시보드 탭을 기본으로 활성화
            await this.switchTab(this.TAB_IDS.DASHBOARD);
            
            // 이번달 버튼 활성화 및 데이터 필터링
            const thisMonthButton = document.querySelector('[data-period="this-month"]');
            if (thisMonthButton) {
                this.updateDateButtonStates(thisMonthButton);
                await this.handleDateSelection('this-month');
            }
        } catch (error) {
            console.error('초기 데이터 로드 실패:', error);
        }
    }

    setupAuthStateListener() {
        this.authService.onAuthStateChanged((user) => {
            if (user) {
                document.getElementById('loginContainer').style.display = 'none';
                document.getElementById('contentContainer').style.display = 'block';
                this.loadInitialData();
            } else {
                document.getElementById('loginContainer').style.display = 'flex';
                document.getElementById('contentContainer').style.display = 'none';
            }
        });
    }

    destroy() {
        if (this.ice) {
            this.ice.destroyCharts();
        }
        
        // 모든 서비스 정리
        this.dataService = null;
        this.authService = null;
        this.dashboard = null;
        this.tableManager = null;
        this.ice = null;
        
        // 전역 참조 제거
        window.ice = null;
    }

    async onLogin() {
        try {
            document.getElementById('loginContainer').style.display = 'none';
            document.getElementById('contentContainer').style.display = 'block';
            
            const loadingIndicator = document.getElementById('loadingIndicator');
            if (loadingIndicator) loadingIndicator.style.display = 'block';
            
            const rawData = await this.dataService.loadData();
            
            if (!rawData || rawData.length === 0) {
                console.error('데이터를 불러오지 못했습니다.');
                return;
            }

            const processedData = await this.dataService.processDetailData(rawData);
            
            const thisMonthButton = document.querySelector('[data-period="this-month"]');
            if (thisMonthButton) {
                document.querySelectorAll('.date-selector').forEach(btn => {
                    btn.classList.remove('active');
                });
                thisMonthButton.classList.add('active');
                await this.handleDateSelection('this-month');
            }

            this.activateTab('dashboard');
            
            if (loadingIndicator) loadingIndicator.style.display = 'none';
        } catch (error) {
            console.error('데이터 로드 중 오류:', error);
            alert('데이터를 불러오는 중 오류가 발생했습니다.');
        }
    }

    async handleDateSelection(period, customStartDate = null, customEndDate = null) {
        try {
            localStorage.setItem('selectedPeriod', period);
            if (customStartDate) localStorage.setItem('customStartDate', customStartDate);
            if (customEndDate) localStorage.setItem('customEndDate', customEndDate);

            let filteredData;
            let startDate, endDate;

            if (period === 'custom' && customStartDate && customEndDate) {
                startDate = new Date(customStartDate);
                startDate.setHours(0, 0, 0, 0);
                endDate = new Date(customEndDate);
                endDate.setHours(23, 59, 59, 999);
                filteredData = await this.dataService.filterDataByDateRange(startDate, endDate);
            } else {
                const dateRange = DateUtils.calculateDateRange(period);
                startDate = dateRange.startDate;
                endDate = dateRange.endDate;
                filteredData = await this.dataService.filterDataByPeriod(period);
            }

            document.dispatchEvent(new CustomEvent('dateFilterChanged', {
                detail: {
                    data: filteredData,
                    period: period,
                    startDate: startDate,
                    endDate: endDate
                }
            }));

            return filteredData;
        } catch (error) {
            console.error('날짜 선택 처리 중 오류:', error);
            return [];
        }
    }

    async filterDataByPeriod(period, startDate, endDate) {
        try {
            console.log('기간별 데이터 필터링 시작:', period);
            
            const currentData = this.dataService.getCurrentData();
            if (!currentData || currentData.length === 0) {
                console.warn('처리된 데이터가 없습니다.');
                return [];
            }

            if (period === 'all') {
                return currentData;
            }

            if (!startDate || !endDate) {
                const now = new Date();
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                endDate = now;
            }

            const start = new Date(startDate);
            const end = new Date(endDate);

            start.setHours(0, 0, 0, 0);
            end.setHours(23, 59, 59, 999);

            console.log('필터링 기간:', {
                시작일: start.toLocaleString('ko-KR'),
                종료일: end.toLocaleString('ko-KR')
            });

            const filteredData = currentData.filter(item => {
                const itemDate = new Date(item.date || item.orderDate);
                const kstDate = new Date(itemDate.getTime() + (9 * 60 * 60 * 1000));
                return kstDate >= start && kstDate <= end;
            });

            return filteredData;

        } catch (error) {
            console.error('데이터 필터링 중 오류:', error);
            return [];
        }
    }

    calculateSalesData(data) {
        try {
            let totalSales = 0;
            let orderCount = 0;
            const uniqueCustomers = new Set();
            const validOrders = [];

            data.forEach(item => {
                if (CONFIG.SALES.ZERO_SALES_STATUSES.includes(item.orderStatus)) {
                    return;
                }

                validOrders.push(item);
                const quantity = parseInt(item.quantity) || 0;
                
                // 원본 데이터로만 매핑 검색
                const originalProduct = item.originalProduct || item.productName || '';
                const originalOption = item.originalOption || item.option || item.optionInfo || '';
                
                const mappingInfo = this.dataService.mappingService.getMappedProductInfo(
                    originalProduct,
                    originalOption,
                    item.channel || item.seller
                );

                const price = mappingInfo?.price || 0;
                const sales = quantity * price;

                totalSales += sales;
                orderCount++;
                if (item.customerName) {
                    uniqueCustomers.add(item.customerName);
                }
            });

            return {
                총매출: totalSales,
                구매건수: orderCount,
                구매자수: uniqueCustomers.size,
                계산된행수: validOrders.length,
                제외된행수: data.length - validOrders.length
            };
        } catch (error) {
            console.error('매출 데이터 계산 중 오류:', error);
            return { 총매출: 0, 구매건수: 0, 구매자수: 0, 계산된행수: 0, 제외된행수: 0 };
        }
    }

    setupEventListeners() {
        try {
            const tabButtons = document.querySelectorAll('.tab-button');
            tabButtons.forEach(button => {
                button.addEventListener('click', async (e) => {
                    const tabId = e.target.dataset.tab;
                    await this.switchTab(tabId);
                });
            });

            const loginForm = document.getElementById('loginForm');
            if (loginForm) {
                loginForm.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    await this.handleLogin();
                });
            }
        } catch (error) {
            console.error('이벤트 리스너 설정 중 오류:', error);
        }
    }

    initializeDatePicker() {
        const dateRangePicker = document.getElementById('dateRangePicker');
        if (!dateRangePicker) {
            console.error('날짜 선택기를 찾을 수 없습니다');
            return;
        }

        // flatpickr 초기화
        this.datePicker = flatpickr(dateRangePicker, {
            mode: 'range',
            dateFormat: 'Y. m. d.',
            locale: 'ko',
            defaultDate: [new Date().setDate(1), new Date()],
            onChange: async (selectedDates) => {
                if (selectedDates.length === 2) {
                    const [start, end] = selectedDates;
                    await this.handleDateSelection('custom', start, end);
                }
            }
        });
    }

    initializeDateButtons() {
        const buttons = {
            'today': document.querySelector('[data-period="today"]'),
            'yesterday': document.querySelector('[data-period="yesterday"]'),
            'this-week': document.querySelector('[data-period="this-week"]'),
            'last-week': document.querySelector('[data-period="last-week"]'),
            'this-month': document.querySelector('[data-period="this-month"]'),
            'last-month': document.querySelector('[data-period="last-month"]'),
            'last-3-months': document.querySelector('[data-period="last-3-months"]'),
            'last-6-months': document.querySelector('[data-period="last-6-months"]'),
            'all': document.querySelector('[data-period="all"]')
        };

        // 저장된 기간 설정 복원
        const savedPeriod = localStorage.getItem('selectedPeriod') || 'this-month';

        Object.entries(buttons).forEach(([period, button]) => {
            if (button) {
                button.addEventListener('click', () => {
                    this.handleDateSelection(period);
                    this.updateDateButtonStates(button);
                });

                // 저장된 기간에 해당하는 버튼 활성화
                if (period === savedPeriod) {
                    this.updateDateButtonStates(button);
                }
            }
        });
    }

    updateDateButtonStates(activeButton) {
        // 모든 날짜 버튼 찾기
        const dateButtons = document.querySelectorAll('.date-selector');
        
        // 모든 버튼의 활성화 상태 제거
        dateButtons.forEach(button => {
            button.classList.remove('active');
        });
        
        // 클릭된 버튼 활성화
        if (activeButton) {
            activeButton.classList.add('active');
        }
    }

    async activateTab(tabId, data = null) {
        try {
            document.querySelectorAll('.tab-button').forEach(button => {
                button.classList.remove('active');
            });

            const selectedButton = document.querySelector(`.tab-button[data-tab="${tabId}"]`);
            if (selectedButton) {
                selectedButton.classList.add('active');
            }

            document.querySelectorAll('.tab-content').forEach(content => {
                content.style.display = 'none';
            });

            const tabMapping = {
                'dashboard': 'dashboardTab',
                'detailData': 'detailDataTab'
            };

            const contentId = tabMapping[tabId] || `${tabId}Tab`;
            const tabContent = document.getElementById(contentId);
            
            if (tabContent) {
                tabContent.style.display = 'block';
            } else {
                return;
            }

            const currentData = data || this.dataService.getCurrentData();

            switch (tabId) {
                case 'dashboard':
                    if (this.dashboard) {
                        await this.dashboard.updateDashboard(currentData);
                    }
                    break;

                case 'detailData':
                    if (this.tableManager) {
                        await this.tableManager.updateTables(currentData);
                    }
                    break;
            }
        } catch (error) {
            console.error('탭 활성화 중 오류:', error);
        }
    }

    async updateAdditionalInfo() {
        try {
            // 구독자 수 업데이트
            const subscriberNumber = document.getElementById('subscriber-number');
            const updateTime = document.getElementById('update-time');
            
            if (subscriberNumber && updateTime) {
                // 구독자 수 데이터 가져오기 (예시)
                const subscriberCount = await this.dataService.getSubscriberCount();
                subscriberNumber.textContent = FormatUtils.formatNumber(subscriberCount);
                updateTime.textContent = new Date().toLocaleString();
            }

            // 정보 테이블 업데이트
            const infoTable = document.getElementById('info-table');
            if (infoTable) {
                const infoData = await this.dataService.getAdditionalInfo();
                // 테이블 데이터 업데이트 로직
                this.updateInfoTable(infoData);
            }
        } catch (error) {
            console.error('추가 정보 업데이트 중 오류:', error);
        }
    }

    async updateAllTabs(data) {
        // 현재 활성화된 탭 찾기
        const activeTab = document.querySelector('.tab-button.active');
        if (activeTab) {
            const tabId = activeTab.dataset.tab;
            await this.activateTab(tabId, data);
        }
    }

    async updateTabContent(tabId, data) {
        try {
            const mappedId = this.TAB_MAPPING[tabId] || tabId;

            switch (mappedId) {
                case this.TAB_IDS.DASHBOARD:
                    if (this.dashboard) {
                        await this.dashboard.updateDashboard(data);
                    }
                    break;
                case this.TAB_IDS.DETAIL_DATA:
                    if (this.tableManager) {
                        await this.tableManager.updateTables(data);
                    }
                    break;
                case this.TAB_IDS.ORDER:
                    if (this.orderManager) {
                        await this.orderManager.initialize();
                    }
                    break;
            }
        } catch (error) {
            console.error(`탭 컨텐츠 업데이트 중 오류:`, error);
        }
    }

    initDetailDataSort() {
        const table = document.querySelector('#detailDataTable');
        if (!table) return;

        table.querySelectorAll('th').forEach(header => {
            const sortButton = header.querySelector('.sort-button');
            if (sortButton) {
                sortButton.addEventListener('click', () => {
                    const column = sortButton.getAttribute('data-sort');
                    this.sortDetailData(column);
                });
            }
        });
    }

    sortDetailData(column) {
        const data = this.dataService.getProcessedData();
        const sortedData = [...data].sort((a, b) => {
            if (column === 'date') {
                return new Date(a.date) - new Date(b.date);
            }
            if (column === 'quantity' || column === 'originalSales') {
                return (a[column] || 0) - (b[column] || 0);
            }
            return (a[column] || '').localeCompare(b[column] || '');
        });
        this.updateDetailDataTab(sortedData);
    }

    initDetailDataFilters() {
        const filterInputs = document.querySelectorAll('.detail-data-filter');
        filterInputs.forEach(input => {
            input.addEventListener('input', () => {
                this.filterDetailData();
            });
        });
    }

    filterDetailData() {
        const data = this.dataService.getProcessedData();
        const filters = {};
        
        document.querySelectorAll('.detail-data-filter').forEach(input => {
            const column = input.getAttribute('data-filter');
            const value = input.value.toLowerCase();
            if (value) {
                filters[column] = value;
            }
        });

        const filteredData = data.filter(item => {
            return Object.entries(filters).every(([column, value]) => {
                return String(item[column] || '').toLowerCase().includes(value);
            });
        });

        this.updateDetailDataTab(filteredData);
    }

    initExportButton() {
        const exportButton = document.getElementById('exportDetailData');
        if (exportButton) {
            exportButton.addEventListener('click', () => {
                this.exportDetailData();
            });
        }
    }

    exportDetailData() {
        const data = this.dataService.getProcessedData();
        const csv = this.convertToCSV(data);
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `detail_data_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
    }

    convertToCSV(data) {
        const headers = ['날짜', '판매처', '주문번호', '상품명', '옵션', '수량', '매출', '주문상태', '구매자명', '연락처', '배송지', '택배사', '운송장번호', '메모'];
        const rows = data.map(item => [
            item.date,
            item.seller || '',
            item.orderNumber || '',
            item.mappingStatus === 'mapped' ? item.productName : item.originalProduct,
            item.mappingStatus === 'mapped' ? item.option : (item.optionInfo || item.optionName || ''),
            item.quantity,
            item.price,
            item.orderStatus || '',
            item.customerName || '',
            item.customerContact || '',
            item.shippingAddress || '',
            item.deliveryCompany || '',
            item.trackingNumber || '',
            item.memo || ''
        ]);
        return [headers, ...rows].map(row => row.join(',')).join('\n');
    }

    async activateThisMonth() {
        const thisMonthButton = document.querySelector('[data-period="this-month"]');
        if (thisMonthButton) {
            document.querySelectorAll('.date-selector').forEach(btn => {
                btn.classList.remove('active');
            });
            thisMonthButton.classList.add('active');
            await this.handleDateSelection('this-month');
        }
    }

    initializeTabs() {
        const tabs = document.querySelectorAll('.tab-button');
        tabs.forEach(tab => {
            tab.addEventListener('click', async (e) => {
                const tabId = e.target.getAttribute('data-tab');
                await this.switchTab(tabId);
            });
        });
    }

    async switchTab(tabId) {
        try {
            const mappedId = this.TAB_MAPPING[tabId] || tabId;

            // 모든 탭 컨텐츠 숨기기
            document.querySelectorAll('.tab-content').forEach(content => {
                content.style.display = 'none';
            });

            // 모든 탭 버튼 비활성화
            document.querySelectorAll('.sidebar-menu-item').forEach(button => {
                button.classList.remove('active');
            });

            // 선택된 탭 버튼 활성화
            const selectedButton = document.querySelector(`[data-tab="${mappedId}"]`);
            if (selectedButton) {
                selectedButton.classList.add('active');
            }

            // 선택된 탭 컨텐츠 표시
            const selectedContent = document.getElementById(mappedId);
            if (selectedContent) {
                selectedContent.style.display = 'block';

                // 상세 데이터 탭이 선택된 경우
                if (mappedId === this.TAB_IDS.DETAIL_DATA) {
                    console.log('상세 데이터 탭 선택됨');
                    // 데이터 로드
                    const data = await this.dataService.loadDetailData();
                    const processedData = await this.dataService.processData(data);
                    this.dataService.setCurrentData(processedData);
                    
                    // 테이블 업데이트
                    if (this.tableManager) {
                        console.log('테이블 업데이트 시작');
                        await this.tableManager.updateTables(processedData);
                    } else {
                        console.error('TableManager가 초기화되지 않았습니다.');
                    }
                }
                
                // 발주 탭이 선택된 경우
                if (mappedId === this.TAB_IDS.ORDER && this.orderManager) {
                    await this.orderManager.initialize();
                }
                
                // 자금 관리 탭이 선택된 경우
                if (mappedId === this.TAB_IDS.CASH_FLOW && window.cashFlowManager) {
                    await window.cashFlowManager.initialize();
                }

                // 매출 현황 탭이 선택된 경우
                if (mappedId === this.TAB_IDS.TOTAL_SALES && this.totalSales) {
                    await this.totalSales.updateSalesData();
                }
            }

            // localStorage에서 저장된 기간 설정 가져오기
            const savedPeriod = localStorage.getItem('selectedPeriod') || 'this-month';
            const customStartDate = localStorage.getItem('customStartDate');
            const customEndDate = localStorage.getItem('customEndDate');

            // 저장된 기간으로 버튼 상태 업데이트
            this.updateDateButtonStates(document.querySelector(`[data-period="${savedPeriod}"]`));

            // 저장된 기간으로 데이터 필터링
            if (savedPeriod === 'custom' && customStartDate && customEndDate) {
                await this.handleDateSelection(savedPeriod, customStartDate, customEndDate);
            } else {
                await this.handleDateSelection(savedPeriod);
            }

        } catch (error) {
            console.error('탭 전환 중 오류 발생:', error);
        }
    }

    initializeSidebar() {
        const menuItems = document.querySelectorAll('.sidebar-menu-item');
        menuItems.forEach(item => {
            item.addEventListener('click', () => {
                // 기존 활성 메뉴 제거
                menuItems.forEach(mi => mi.classList.remove('active'));
                // 클릭된 메뉴 활성화
                item.classList.add('active');

                // 탭 전환
                const tabId = item.getAttribute('data-tab');
                this.switchTab(tabId);
            });
        });

        // 모바일 메뉴 토글
        const menuToggle = document.querySelector('.mobile-menu-toggle');
        const sidebar = document.querySelector('.sidebar');
        if (menuToggle && sidebar) {
            menuToggle.addEventListener('click', () => {
                sidebar.classList.toggle('active');
            });
        }
    }
}

// App 인스턴스 생성 및 초기화
let appInitialized = false;

document.addEventListener('DOMContentLoaded', () => {
    if (appInitialized) return;
    
    try {
        if (window.app) {
            window.app.destroy();
        }
        window.app = new App();
        appInitialized = true;
    } catch (error) {
        console.error('App 초기화 중 오류:', error);
    }
});

window.App = App;

const cashFlowManager = new CashFlowManager();

// 탭 전환 로직에 자금관리 탭 추가
function switchTab(tabName) {
    // 기존 탭 숨기기
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.style.display = 'none';
    });
    
    // 선택된 탭 보이기
    document.getElementById(`${tabName}Container`).style.display = 'block';
}