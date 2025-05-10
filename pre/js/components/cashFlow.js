import { NotionService } from '../services/notionService.js';
import Chart from 'https://cdn.jsdelivr.net/npm/chart.js/auto/auto.mjs';

export class CashFlowManager {
    constructor() {
        this.notionService = new NotionService('d04c779e1ee84e6d9dd062823ebb4ff8');
        this.container = document.getElementById('cashFlowContainer');
        this.charts = {};
        this.initialize();
    }

    async initialize() {
        try {
            this.container.innerHTML = '<div class="loading">데이터를 불러오는 중...</div>';
            
            const response = await this.notionService.fetchDatabase();
            console.log('Notion API 응답:', response); // 응답 데이터 확인용 로그

            // response가 undefined이거나 results 속성이 없는 경우 처리
            if (!response || !Array.isArray(response)) {
                throw new Error('유효하지 않은 데이터 형식');
            }

            const processedData = this.processNotionData(response);
            this.renderDashboard(processedData);
        } catch (error) {
            console.error('자금관리 데이터 초기화 중 오류:', error);
            this.container.innerHTML = `
                <div class="error-message">
                    데이터를 불러오는데 실패했습니다.<br>
                    <small>${error.message}</small>
                </div>
            `;
        }
    }

    processNotionData(data) {
        try {
            if (!Array.isArray(data)) {
                console.error('유효하지 않은 데이터 형식:', data);
                return [];
            }

            return data.map(page => {
                if (!page || !page.properties) {
                    console.warn('유효하지 않은 페이지 데이터:', page);
                    return null;
                }

                const props = page.properties;
                return {
                    id: page.id,
                    날짜: props.날짜?.date?.start || '',
                    항목: props.항목?.title?.[0]?.plain_text || '',
                    금액: props.금액?.number || 0,
                    합계: props.합계?.number || 0,
                    구분: props.카테고리?.select?.name || '',
                    거래원천: props.거래원천?.select?.name || '',
                    수입비용: props['수입/비용']?.select?.name || '',
                    receipt: props.Receipt?.files || [],
                    created_time: props['Created time']?.created_time || '',
                    발주제품송금: props.발주제품송금?.checkbox || false,
                    비고: props.비고?.rich_text?.[0]?.plain_text || ''
                };
            }).filter(item => item !== null);
        } catch (error) {
            console.error('데이터 처리 중 오류:', error);
            return [];
        }
    }

    renderDashboard(data) {
        const container = document.createElement('div');
        container.className = 'cash-flow-container';

        // 요약 정보
        const summaryData = this.calculateSummary(data);
        const summarySection = this.createSummarySection(summaryData);
        container.appendChild(summarySection);

        // 차트 섹션
        const chartSection = this.createChartSection(data);
        container.appendChild(chartSection);

        // 거래 내역 목록
        const transactionList = this.createTransactionList(data);
        container.appendChild(transactionList);

        this.container.innerHTML = '';
        this.container.appendChild(container);

        // 차트 렌더링
        this.renderCharts(data);
    }

    calculateSummary(data) {
        const summary = data.reduce((acc, item) => {
            const amount = item.원화계산총금 || 0;
            const type = item.수입비용 || '기타';
            const category = item.거래구분 || '기타';
            
            // 수입/지출 합계
            if (type === '수입') {
                acc.totalIncome += amount;
            } else if (type === '지출') {
                acc.totalExpense += amount;
            }
            
            // 카테고리별 집계
            if (!acc.categoryTotals[category]) {
                acc.categoryTotals[category] = 0;
            }
            acc.categoryTotals[category] += amount;

            // 월별 집계
            const month = item.날짜.substring(0, 7);
            if (!acc.monthlyTotals[month]) {
                acc.monthlyTotals[month] = { income: 0, expense: 0 };
            }
            if (type === '수입') {
                acc.monthlyTotals[month].income += amount;
            } else {
                acc.monthlyTotals[month].expense += amount;
            }
            
            return acc;
        }, {
            totalIncome: 0,
            totalExpense: 0,
            categoryTotals: {},
            monthlyTotals: {}
        });

        summary.balance = summary.totalIncome - summary.totalExpense;
        return summary;
    }

    createSummarySection(summaryData) {
        const section = document.createElement('div');
        section.className = 'cash-flow-summary';
        
        section.innerHTML = `
            <div class="cash-flow-box income">
                <h3>총 수입</h3>
                <div class="cash-flow-amount">₩${Math.round(summaryData.totalIncome).toLocaleString()}</div>
            </div>
            <div class="cash-flow-box expense">
                <h3>총 지출</h3>
                <div class="cash-flow-amount">₩${Math.abs(Math.round(summaryData.totalExpense)).toLocaleString()}</div>
            </div>
            <div class="cash-flow-box balance">
                <h3>잔액</h3>
                <div class="cash-flow-amount ${summaryData.balance >= 0 ? 'positive' : 'negative'}">
                    ₩${Math.round(summaryData.balance).toLocaleString()}
                </div>
            </div>
        `;
        
        return section;
    }

    createChartSection(data) {
        const section = document.createElement('div');
        section.className = 'cash-flow-charts';
        
        section.innerHTML = `
            <div class="cash-flow-chart-box">
                <h3>월별 수입/지출 추이</h3>
                <canvas id="monthlyTrendChart"></canvas>
            </div>
            <div class="cash-flow-chart-box">
                <h3>거래구분별 분포</h3>
                <canvas id="categoryPieChart"></canvas>
            </div>
        `;
        
        return section;
    }

    renderCharts(data) {
        this.renderMonthlyTrendChart(data);
        this.renderCategoryPieChart(data);
    }

    renderMonthlyTrendChart(data) {
        const ctx = document.getElementById('monthlyTrendChart');
        if (this.charts.monthlyTrend) {
            this.charts.monthlyTrend.destroy();
        }

        const monthlyData = this.calculateMonthlyTotals(data);
        
        this.charts.monthlyTrend = new Chart(ctx, {
            type: 'line',
            data: {
                labels: monthlyData.labels,
                datasets: [
                    {
                        label: '수입',
                        data: monthlyData.income,
                        borderColor: '#4CAF50',
                        backgroundColor: 'rgba(76, 175, 80, 0.1)',
                        fill: true
                    },
                    {
                        label: '지출',
                        data: monthlyData.expense,
                        borderColor: '#F44336',
                        backgroundColor: 'rgba(244, 67, 54, 0.1)',
                        fill: true
                    }
                ]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: '월별 현금흐름'
                    }
                }
            }
        });
    }

    renderCategoryPieChart(data) {
        const ctx = document.getElementById('categoryPieChart');
        if (this.charts.categoryPie) {
            this.charts.categoryPie.destroy();
        }

        const categoryData = this.calculateCategoryTotals(data);
        
        this.charts.categoryPie = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: categoryData.labels,
                datasets: [{
                    data: categoryData.values,
                    backgroundColor: [
                        '#4CAF50', '#2196F3', '#F44336', '#FFC107', 
                        '#9C27B0', '#FF5722', '#795548', '#607D8B'
                    ]
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'right'
                    }
                }
            }
        });
    }

    calculateMonthlyTotals(data) {
        const monthlyTotals = {};
        
        data.forEach(item => {
            const month = item.날짜.substring(0, 7);
            if (!monthlyTotals[month]) {
                monthlyTotals[month] = { income: 0, expense: 0 };
            }
            
            if (item.수입비용 === '수입') {
                monthlyTotals[month].income += item.원화계산총금;
            } else {
                monthlyTotals[month].expense += item.원화계산총금;
            }
        });

        const sortedMonths = Object.keys(monthlyTotals).sort();
        
        return {
            labels: sortedMonths,
            income: sortedMonths.map(month => monthlyTotals[month].income),
            expense: sortedMonths.map(month => monthlyTotals[month].expense)
        };
    }

    calculateCategoryTotals(data) {
        const categoryTotals = {};
        
        data.forEach(item => {
            const category = item.거래구분 || '기타';
            if (!categoryTotals[category]) {
                categoryTotals[category] = 0;
            }
            categoryTotals[category] += Math.abs(item.원화계산총금);
        });

        return {
            labels: Object.keys(categoryTotals),
            values: Object.values(categoryTotals)
        };
    }

    createTransactionList(data) {
        const section = document.createElement('div');
        section.className = 'cash-flow-transactions';
        
        const sortedData = [...data].sort((a, b) => 
            new Date(b.날짜) - new Date(a.날짜)
        );

        section.innerHTML = `
            <h3>거래 내역</h3>
            <div class="cash-flow-table">
                <table>
                    <thead>
                        <tr>
                            <th>날짜</th>
                            <th>항목</th>
                            <th>금액</th>
                            <th>구분</th>
                            <th>비고</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${sortedData.map(item => `
                            <tr class="${item.수입비용 === '수입' ? 'income-row' : 'expense-row'}">
                                <td>${item.날짜}</td>
                                <td>${item.항목}</td>
                                <td class="cash-flow-amount-cell">
                                    ₩${Math.abs(item.금액).toLocaleString()}
                                </td>
                                <td>${item.구분}</td>
                                <td>${item.비고}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;

        return section;
    }
} 