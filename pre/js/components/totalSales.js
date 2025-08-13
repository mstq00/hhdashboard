import { NotionService } from '../services/notionService.js';

export class TotalSales {
    constructor(dataService) {
        this.dataService = dataService;
        this.currentYear = '2025';
        this.monthlySalesChart = null;
        this.adNotionService = new NotionService('d04c779e1ee84e6d9dd062823ebb4ff8');
        this.groupNotionService = new NotionService('e6121c39c37c4d349032829e5b796c2c');
        this.initializeYearSelector();
        this.initializeChart();
    }

    initializeYearSelector() {
        const yearButtons = document.querySelectorAll('.year-btn');
        yearButtons.forEach(button => {
            button.addEventListener('click', async (e) => {
                yearButtons.forEach(btn => btn.classList.remove('active'));
                e.target.classList.add('active');
                this.currentYear = e.target.dataset.year;
                await this.updateSalesData();
            });
        });
    }

    
    initializeChart() {
        const ctx = document.getElementById('monthlySalesChart').getContext('2d');
        this.monthlySalesChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'],
                datasets: [
                    {
                        label: '스토어 매출',
                        backgroundColor: 'rgba(169, 186, 147, 0.7)',
                        data: []
                    },
                    {
                        label: '유료광고 수익',
                        backgroundColor: 'rgba(147, 165, 186, 0.7)',
                        data: []
                    },
                    {
                        label: '공동구매 매출',
                        backgroundColor: 'rgba(195, 177, 171, 0.7)',
                        data: []
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        stacked: true
                    },
                    y: {
                        stacked: true,
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return value.toLocaleString() + '원';
                            }
                        }
                    }
                },
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `${context.dataset.label}: ${context.raw.toLocaleString()}원`;
                            }
                        }
                    }
                }
            }
        });
    }

    async updateSalesData() {
        try {
            const monthlySales = await this.calculateMonthlySales();
            this.updateTable(monthlySales);
            this.updateChart(monthlySales);
        } catch (error) {
            console.error('매출 데이터 업데이트 중 오류:', error);
        }
    }

    async calculateMonthlySales() {
        const monthlySales = Array(12).fill().map(() => ({
            storeSales: 0,
            adSales: 0,
            groupSales: 0
        }));

        try {
            // 스토어 매출 계산 - 스토어 분석과 동일한 로직 적용
            const storeData = this.dataService.getCurrentData();
            
            // 월별 중복 주문 처리를 위한 Set
            const processedOrdersByMonth = Array(12).fill().map(() => new Set());
            
            storeData.forEach(item => {
                const date = new Date(item.date);
                if (date.getFullYear().toString() === this.currentYear) {
                    const month = date.getMonth();
                    
                    // 채널 필터링
                    if (['스마트스토어', '오늘의집', '유튜브쇼핑', '쿠팡'].includes(item.channel)) {
                        // 중복 주문 필터링
                        const orderKey = `${item.orderNumber}-${item.channel}`;
                        if (!processedOrdersByMonth[month].has(orderKey) && 
                            !['취소', '미결제취소', '반품'].includes(item.orderStatus)) {
                            
                            processedOrdersByMonth[month].add(orderKey);
                            
                    const quantity = parseInt(item.quantity) || 0;
                    
                    // 스토어 분석과 동일한 매핑 로직 적용
                    const originalProduct = item.originalProduct || item.productName || '';
                    const originalOption = item.originalOption || '';
                    const mappingInfo = this.dataService.mappingService.getMappedProductInfo(
                        originalProduct,
                        originalOption,
                        item.channel || item.seller
                    );

                    let price = 0;
                    if (mappingInfo) {
                                price = mappingInfo.price || 0;
                    }

                    const sales = quantity * price;
                    
                            // NaN 체크
                            if (!isNaN(sales) && sales > 0) {
                        monthlySales[month].storeSales += sales;
                            }
                        }
                    }
                }
            });

            // 유료광고 수익 계산
            const adData = await this.adNotionService.fetchDatabase();
            adData.forEach(item => {
                if (item.properties?.['정산입금일자']?.date?.start) {
                    const date = new Date(item.properties['정산입금일자'].date.start);
                    if (date.getFullYear().toString() === this.currentYear) {
                        const amount = item.properties['정산금액']?.number || 0;
                        if (!isNaN(amount) && amount > 0) {
                            monthlySales[date.getMonth()].adSales += amount;
                        }
                    }
                }
            });

            // 공동구매 매출 계산
            const groupData = await this.groupNotionService.fetchDatabase();
            groupData.forEach(item => {
                if (item.properties?.['일정']?.date?.end) {
                    const endDate = new Date(item.properties['일정'].date.end);
                    if (endDate.getFullYear().toString() === this.currentYear) {
                        const amount = item.properties['매출액']?.number || 0;
                        if (!isNaN(amount) && amount > 0) {
                            monthlySales[endDate.getMonth()].groupSales += amount;
                        }
                    }
                }
            });

            // 디버깅을 위한 로그
            console.log('Monthly Sales Data:', {
                storeData: storeData.length,
                monthlySales,
                year: this.currentYear,
                processedOrdersByMonth: processedOrdersByMonth.map(set => set.size)
            });

            return monthlySales;
        } catch (error) {
            console.error('월별 매출 계산 중 오류:', error);
            throw error;
        }
    }

    updateTable(monthlySales) {
        const tbody = document.getElementById('monthlySalesBody');
        tbody.innerHTML = '';

        let totalStoreSales = 0;
        let totalAdSales = 0;
        let totalGroupSales = 0;

        monthlySales.forEach((data, index) => {
            // 메인 행
            const mainRow = document.createElement('tr');
            mainRow.classList.add('main-row');
            const total = data.storeSales + data.adSales + data.groupSales;
            
            mainRow.innerHTML = `
                <td class="month-cell">
                    <span class="expand-btn">+</span>
                    ${index + 1}월
                </td>
                <td>${data.storeSales.toLocaleString()}원</td>
                <td>${data.adSales.toLocaleString()}원</td>
                <td>${data.groupSales.toLocaleString()}원</td>
                <td>${total.toLocaleString()}원</td>
            `;

            // 상세 정보 행
            const detailRow = document.createElement('tr');
            detailRow.classList.add('detail-row');
            detailRow.style.display = 'none';
            
            // 상세 정보 셀
            const detailCell = document.createElement('td');
            detailCell.colSpan = 5;
            detailCell.innerHTML = `
                <div class="sales-details">
                    <div class="detail-section">
                        <h4>스토어 매출 상세</h4>
                        <div class="sales-detail-grid">
                            <div class="sales-detail-item">
                                <div class="store-name">스마트스토어</div>
                                <div class="store-amount">${this.formatCurrency(data.storeSales * 0.7)}</div>
                            </div>
                            <div class="sales-detail-item">
                                <div class="store-name">오늘의집</div>
                                <div class="store-amount">${this.formatCurrency(data.storeSales * 0.2)}</div>
                            </div>
                            <div class="sales-detail-item">
                                <div class="store-name">유튜브쇼핑</div>
                                <div class="store-amount">${this.formatCurrency(data.storeSales * 0.1)}</div>
                            </div>
                        </div>
                    </div>
                    
                    ${data.adSales > 0 ? `
                        <div class="detail-section">
                            <h4>유료광고 수익 상세</h4>
                            <div class="sales-detail-grid">
                                <div class="sales-detail-item">
                                    <div class="store-name">유료광고 수익 상세</div>
                                    <div class="store-amount">${this.formatCurrency(data.adSales)}</div>
                                </div>
                            </div>
                        </div>
                    ` : ''}
                    
                    ${data.groupSales > 0 ? `
                        <div class="detail-section">
                            <h4>공동구매 매출 상세</h4>
                            <div class="sales-detail-grid">
                                <div class="sales-detail-item">
                                    <div class="store-name">공동구매 매출 상세</div>
                                    <div class="store-amount">${this.formatCurrency(data.groupSales)}</div>
                                </div>
                            </div>
                        </div>
                    ` : ''}
                </div>
            `;
            detailRow.appendChild(detailCell);

            // 이벤트 리스너 추가
            mainRow.querySelector('.expand-btn').addEventListener('click', async (e) => {
                const btn = e.target;
                const isExpanded = btn.textContent === '-';
                btn.textContent = isExpanded ? '+' : '-';
                detailRow.style.display = isExpanded ? 'none' : 'table-row';

                if (!isExpanded && !detailRow.dataset.loaded) {
                    await this.loadDetailData(index + 1, detailRow);
                    detailRow.dataset.loaded = 'true';
                }
            });

            tbody.appendChild(mainRow);
            tbody.appendChild(detailRow);

            totalStoreSales += data.storeSales;
            totalAdSales += data.adSales;
            totalGroupSales += data.groupSales;
        });

        // 합계 업데이트
        document.getElementById('totalStoreSales').textContent = `${totalStoreSales.toLocaleString()}원`;
        document.getElementById('totalAdSales').textContent = `${totalAdSales.toLocaleString()}원`;
        document.getElementById('totalGroupSales').textContent = `${totalGroupSales.toLocaleString()}원`;
        document.getElementById('grandTotal').textContent = 
            `${(totalStoreSales + totalAdSales + totalGroupSales).toLocaleString()}원`;
    }

    async fetchMonthlyDetail(month) {
        try {
            // 스토어 매출 계산
            const storeData = this.dataService.getCurrentData();
            
            // 채널에 해당하는 데이터만 필터링
            const validChannels = ['스마트스토어', '오늘의집', '유튜브쇼핑', '쿠팡'];
            const currentYearData = storeData.filter(item => {
                const date = new Date(item.date);
                return date.getFullYear().toString() === this.currentYear &&
                    date.getMonth() === month - 1 &&
                    validChannels.includes(item.channel || '');
            });

            // 중복 주문 제거 (같은 주문번호는 한 번만 카운트)
            const processedOrders = new Set();
            let storeSales = 0;

            currentYearData.forEach(item => {
                const orderKey = `${item.orderNumber}-${item.channel}`;
                if (!processedOrders.has(orderKey) && !['취소', '미결제취소', '반품'].includes(item.orderStatus)) {
                    processedOrders.add(orderKey);
                    
                const quantity = parseInt(item.quantity) || 0;
                const mappingInfo = this.dataService.mappingService.getMappedProductInfo(
                    item.originalProduct || item.productName || '',
                    item.originalOption || '',
                    item.channel || item.seller
                );
                    
                    const price = mappingInfo ? (mappingInfo.price || 0) : 0;
                    const sales = quantity * price;
                    
                    // NaN 체크
                    if (!isNaN(sales) && sales > 0) {
                        storeSales += sales;
                    }
                }
            });

            // 광고 수익과 공동구매 매출 데이터 로드
            const adData = await this.loadMonthlyAdData(month);
            const groupData = await this.loadMonthlyGroupData(month);

            // 광고 수익 합계 계산
            const adSales = adData.reduce((total, item) => {
                const amount = item.정산금액 || 0;
                return !isNaN(amount) ? total + amount : total;
            }, 0);
            
            // 공동구매 매출 합계 계산
            const groupSales = groupData.reduce((total, item) => {
                const amount = item.매출액 || 0;
                return !isNaN(amount) ? total + amount : total;
            }, 0);

            // 디버깅 로그
            console.log(`${month}월 상세 데이터:`, {
                storeData: currentYearData.length,
                uniqueOrders: processedOrders.size,
                storeSales,
                adSales,
                groupSales
            });

            return {
                storeSales,
                adSales,
                groupSales
            };
        } catch (error) {
            console.error('월별 상세 데이터 조회 중 오류:', error);
            throw error;
        }
    }

    async loadDetailData(month, detailRow) {
        const detailCell = detailRow.querySelector('td[colspan="5"]');
        if (!detailCell) return;

        // 먼저 로딩 상태 표시
        detailCell.innerHTML = `
            <div class="sales-details">
                <div class="loading-message">데이터 로딩 중...</div>
            </div>
        `;

        try {
            // 채널별 매출 데이터 가져오기
            const channelSales = await this.calculateChannelSales(month);
            
            // 스토어 매출 표시 - 채널별로 데이터가 있는 경우만 표시
            let storeRows = '';
            let hasChannelData = false;
            
            Object.entries(channelSales).forEach(([channel, sales]) => {
                if (sales > 0) {
                    hasChannelData = true;
                    storeRows += `
                        <tr>
                            <td>${channel}</td>
                            <td>${this.formatCurrency(sales)}</td>
                        </tr>
                    `;
                }
            });
            
            // 채널별 매출 상세 HTML
            const storeDetailHtml = hasChannelData ? `
                <div class="detail-section">
                    <h4>스토어 매출 상세</h4>
                    <table class="channel-sales-table">
                        <thead>
                            <tr>
                                <th>채널</th>
                                <th>금액</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${storeRows}
                        </tbody>
                    </table>
                </div>
            ` : `
                <div class="detail-section">
                    <h4>스토어 매출 상세</h4>
                    <p>해당 월에 스토어 매출이 없습니다.</p>
                </div>
            `;
            
            // 유료광고 및 공동구매 데이터 가져오기
            const monthlyDetail = await this.fetchMonthlyDetail(month);
            
            // 광고 수익 상세
            const adDetailHtml = monthlyDetail.adSales > 0 ? `
                <div class="detail-section">
                    <h4>유료광고 수익 상세</h4>
                    <p>총 유료광고 수익: ${this.formatCurrency(monthlyDetail.adSales)}</p>
                </div>
            ` : '';
            
            // 공동구매 매출 상세
            const groupDetailHtml = monthlyDetail.groupSales > 0 ? `
                <div class="detail-section">
                    <h4>공동구매 매출 상세</h4>
                    <p>총 공동구매 매출: ${this.formatCurrency(monthlyDetail.groupSales)}</p>
                </div>
            ` : '';
            
            // 모든 데이터가 준비된 후에 표시
            detailCell.innerHTML = `
                <div class="sales-details">
                    ${storeDetailHtml}
                    ${adDetailHtml}
                    ${groupDetailHtml}
                </div>
            `;
        } catch (error) {
            console.error('상세 데이터 로드 중 오류:', error);
            detailCell.innerHTML = `
                <div class="sales-details">
                    <div class="error-message">데이터 로드 중 오류가 발생했습니다.</div>
                </div>
            `;
        }
    }

    calculateChannelSales(month) {
        const channelSales = {
            '스마트스토어': 0,
            '오늘의집': 0,
            '유튜브쇼핑': 0,
            '쿠팡': 0
        };

        // 데이터 중복 처리를 위한 Set
        const processedOrders = new Set();

        const storeData = this.dataService.getCurrentData();
        storeData.forEach(item => {
            const date = new Date(item.date);
            if (date.getFullYear().toString() === this.currentYear && 
                date.getMonth() === month - 1 && 
                ['스마트스토어', '오늘의집', '유튜브쇼핑', '쿠팡'].includes(item.channel)) {
                
                // 중복 주문 건 필터링 (주문번호 기준)
                const orderKey = `${item.orderNumber}-${item.channel}`;
                if (!processedOrders.has(orderKey)) {
                    processedOrders.add(orderKey);
                    
                const channel = item.channel || item.seller;
                const mappingInfo = this.dataService.mappingService.getMappedProductInfo(
                        item.originalProduct || item.productName || '',
                        item.originalOption || '',
                    channel
                );

                if (mappingInfo && !['취소', '미결제취소', '반품'].includes(item.orderStatus)) {
                        const quantity = parseInt(item.quantity) || 0;
                        const price = mappingInfo.price || 0; // 매핑 정보가 없으면 0으로 처리
                        const sales = quantity * price;
                        
                        // NaN 체크
                        if (!isNaN(sales) && sales > 0) {
                        channelSales[channel] += sales;
                        }
                    }
                }
            }
        });

        // 디버깅
        console.log('Channel Sales Data:', {
            month,
            channelSales,
            totalRecords: storeData.length,
            uniqueOrders: processedOrders.size
        });

        return channelSales;
    }

    async loadMonthlyAdData(month) {
        try {
            const adData = await this.adNotionService.fetchDatabase();
            return adData
                .filter(item => {
                    // null 체크 추가
                    const dateProperty = item.properties?.['정산입금일자']?.date?.start;
                    if (!dateProperty) return false;
                    
                    const date = new Date(dateProperty);
                    return date.getFullYear().toString() === this.currentYear && 
                           date.getMonth() === month - 1;
                })
                .map(item => ({
                    이름: item.properties?.['이름']?.title?.[0]?.plain_text || '이름 없음',
                    정산금액: item.properties?.['정산금액']?.number || 0,
                    정산입금일자: item.properties?.['정산입금일자']?.date?.start || ''
                }));
        } catch (error) {
            console.error('광고 수익 데이터 로드 중 오류:', error);
            return [];
        }
    }

    async loadMonthlyGroupData(month) {
        try {
            const groupData = await this.groupNotionService.fetchDatabase();
            return groupData
                .filter(item => {
                    // null 체크 추가
                    const dateProperty = item.properties?.['일정']?.date?.end;
                    if (!dateProperty) return false;
                    
                    const endDate = new Date(dateProperty);
                    return endDate.getFullYear().toString() === this.currentYear && 
                           endDate.getMonth() === month - 1;
                })
                .map(item => ({
                    이름: item.properties?.['이름']?.title?.[0]?.plain_text || '이름 없음',
                    매출액: item.properties?.['매출액']?.number || 0,
                    정산금액: item.properties?.['정산금액']?.number || 0
                }));
        } catch (error) {
            console.error('공동구매 데이터 로드 중 오류:', error);
            return [];
        }
    }

    updateChart(monthlySales) {
        const storeSalesData = monthlySales.map(data => data.storeSales);
        const adSalesData = monthlySales.map(data => data.adSales);
        const groupSalesData = monthlySales.map(data => data.groupSales);

        this.monthlySalesChart.data.datasets[0].data = storeSalesData;
        this.monthlySalesChart.data.datasets[1].data = adSalesData;
        this.monthlySalesChart.data.datasets[2].data = groupSalesData;
        this.monthlySalesChart.update();
    }

    formatCurrency(amount) {
        if (typeof amount === 'number') {
            return amount.toLocaleString('ko-KR') + '원';
        }
        return '0원';
    }
} 