import { NotionService } from '../services/notionService.js';

export class OrderManager {
    constructor() {
        this.notionService = new NotionService('1541d84cc1ac80bc8696fe96b2cc86b8');
        this.orderTableContainer = document.getElementById('orderTableContainer');
        this.data = [];
        this.initialize();
        this.setupDateFilter();
    }

    async initialize() {
        try {
            this.orderTableContainer.innerHTML = '<div class="loading">데이터를 불러오는 중...</div>';
            
            const rawData = await this.notionService.fetchDatabase();
            const processedData = this.processNotionData(rawData);
            this.data = processedData;
            
            this.renderTable(this.data);
        } catch (error) {
            console.error('발주 데이터 초기화 중 오류:', error);
            this.orderTableContainer.innerHTML = `
                <div class="error-message">
                    데이터를 불러오는데 실패했습니다.<br>
                    <small>${error.message}</small>
                </div>
            `;
        }
    }

    processNotionData(data) {
        try {
            const orderGroups = data.reduce((groups, page) => {
                const props = page.properties;
                
                // 핵심 데이터만 로깅
                console.log("\n=== 주문 데이터 ===");
                console.log({
                    발주코드: props['발주코드']?.select?.name,
                    발주명: props['발주명']?.rich_text?.[0]?.plain_text,
                    발주차수: props['발주차수']?.select?.name,
                    발주액: {
                        수량: props['발주수량']?.number,
                        단가: props['단가']?.number
                    },
                    송금: {
                        선금: props['선금송금액']?.number,
                        선금환율: props['선금환율']?.number,
                        잔금: props['잔금송금액']?.number,
                        잔금환율: props['잔금환율']?.number
                    },
                    입항후비용: props['입항후비용']?.number,
                    상태: props['상태']?.status?.name
                });

                const orderCode = props['발주코드']?.select?.name || '';
                if (!orderCode) {
                    console.warn('발주코드 누락된 데이터 발견');
                    return groups;
                }

                const 발주명 = props['발주명']?.rich_text?.[0]?.plain_text || '제목 없음';
                const 발주차수 = props['발주차수']?.select?.name || '미지정';
                
                if (!groups[orderCode]) {
                    groups[orderCode] = {
                        발주코드: orderCode,
                        발주명: 발주명,
                        상태: props['상태']?.status?.name || '',
                        총발주수량: 0,
                        총발주액: 0,
                        최초발주일: null,
                        최종입고일: null,
                        차수별발주: {}
                    };
                }

                if (!groups[orderCode].차수별발주[발주차수]) {
                    groups[orderCode].차수별발주[발주차수] = {
                        발주차수,
                        발주명: 발주명,
                        발주수량: 0,
                        발주액: 0,
                        items: []
                    };
                }

                const orderItem = {
                    id: page.id,
                    발주명: 발주명,
                    발주일: props['발주일']?.date?.start || '',
                    발주수량: props['발주수량']?.number || 0,
                    단가: props['단가']?.number || 0,
                    발주액: (props['발주수량']?.number || 0) * (props['단가']?.number || 0),
                    선금환율: props['선금환율']?.number || 0,
                    잔금환율: props['잔금환율']?.number || 0,
                    선금송금액: props['선금송금액']?.number || 0,
                    잔금송금액: props['잔금송금액']?.number || 0,
                    입항후비용: props['입항후비용']?.number || 0,
                    원화발주액: props['원화발주액']?.number || 0,
                    상태: props['상태']?.status?.name || '',
                    입항예정일: props['입항예정일']?.date?.start || '',
                    최종입고일: props['최종입고일']?.date?.start || ''
                };

                // 원화환산 계산
                orderItem.원화환산 = (orderItem.선금송금액 * orderItem.선금환율) + 
                                   (orderItem.잔금송금액 * orderItem.잔금환율) +
                                   (orderItem.원화발주액 || 0);

                // 잔금 계산
                orderItem.잔금 = orderItem.잔금송금액 ? 0 : (orderItem.발주액 - orderItem.선금송금액);

                // 제품원가 계산
                orderItem.제품원가 = (orderItem.원화환산 + (orderItem.입항후비용 || 0)) / orderItem.발주수량;

                // 차수별 합계 업데이트
                groups[orderCode].차수별발주[발주차수].발주수량 += orderItem.발주수량;
                groups[orderCode].차수별발주[발주차수].발주액 += orderItem.발주액;
                groups[orderCode].차수별발주[발주차수].items.push(orderItem);

                // 전체 합계 업데이트
                groups[orderCode].총발주수량 += orderItem.발주수량;
                groups[orderCode].총발주액 += orderItem.발주액;
                
                // 총잔액은 잔금송금액이 있는 경우 0으로 처리
                groups[orderCode].총잔액 = (groups[orderCode].총잔액 || 0) + orderItem.잔금;

                // 최초발주일 업데이트
                if (!groups[orderCode].최초발주일 || orderItem.발주일 < groups[orderCode].최초발주일) {
                    groups[orderCode].최초발주일 = orderItem.발주일;
                }

                // 최종입고일 업데이트
                if (orderItem.최종입고일 && (!groups[orderCode].최종입고일 || 
                    orderItem.최종입고일 > groups[orderCode].최종입고일)) {
                    groups[orderCode].최종입고일 = orderItem.최종입고일;
                }

                // 원화환산 계산 결과 로깅
                const 선금원화환산 = orderItem.선금송금액 * orderItem.선금환율;
                const 잔금원화환산 = orderItem.잔금송금액 * orderItem.잔금환율;
                
                console.log("원화환산:", {
                    선금: `$${orderItem.선금송금액} × ₩${orderItem.선금환율} = ₩${선금원화환산}`,
                    잔금: `$${orderItem.잔금송금액} × ₩${orderItem.잔금환율} = ₩${잔금원화환산}`,
                    총액: `₩${선금원화환산 + 잔금원화환산}`
                });

                return groups;
            }, {});

            return Object.values(orderGroups);
        } catch (error) {
            console.error('데이터 처리 중 오류:', error);
            throw error;
        }
    }

    renderTable(data) {
        const stats = this.calculateOrderStats(data);
        const container = document.createElement('div');
        container.innerHTML = `
            <div class="stats-grid">
                <div class="stat-box">
                    <h3>발주 현황</h3>
                    <div class="stat-value">${Object.values(stats.statusCount).reduce((a, b) => a + b, 0)}건</div>
                    <div class="stat-details">
                        ${Object.entries(stats.statusCount).map(([status, count]) => `
                            <div class="stat-detail">
                                <span class="detail-label">${status}:</span>
                                <span class="detail-value">${count}건</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
                <div class="stat-box">
                    <h3>발주액</h3>
                    <div class="stat-details">
                        <div class="stat-detail usd-amount">
                            <span class="detail-label">USD 총 발주액:</span>
                            <span class="detail-value">$${Math.round(stats.totalAmountUSD).toLocaleString()}</span>
                        </div>
                        <div class="stat-detail krw-amount">
                            <span class="detail-label">원화 총 발주액:</span>
                            <span class="detail-value">₩${Math.round(stats.totalWonAmount).toLocaleString()}</span>
                        </div>
                        <div class="stat-detail section-divider usd-amount">
                            <span class="detail-label">송금 총액 (USD):</span>
                            <span class="detail-value">$${Math.round(stats.totalPaidUSD).toLocaleString()}</span>
                        </div>
                        <div class="stat-detail remaining">
                            <span class="detail-label">잔금 총액 (USD):</span>
                            <span class="detail-value">$${Math.round(stats.totalRemainingUSD).toLocaleString()}</span>
                        </div>
                        <div class="stat-detail section-divider usd-amount">
                            <span class="detail-label">USD 송금 원화환산:</span>
                            <span class="detail-value">₩${Math.round(stats.totalUSDtoKRW).toLocaleString()}</span>
                        </div>
                        <div class="stat-detail krw-amount">
                            <span class="detail-label">원화 발주 송금액:</span>
                            <span class="detail-value">₩${Math.round(stats.totalWonAmount).toLocaleString()}</span>
                        </div>
                        <div class="stat-detail section-divider">
                            <span class="detail-label">제품발주비용:</span>
                            <span class="detail-value">₩${Math.round(stats.totalProductCost).toLocaleString()}</span>
                        </div>
                        <div class="stat-detail post-arrival">
                            <span class="detail-label">입항후비용:</span>
                            <span class="detail-value">₩${Math.round(stats.totalPostArrivalCost).toLocaleString()}</span>
                        </div>
                        <div class="stat-detail total">
                            <span class="detail-label">발주관련 총액:</span>
                            <span class="detail-value">₩${Math.round(stats.totalOrderAmount).toLocaleString()}</span>
                        </div>
                    </div>
                </div>
            </div>
            <div class="order-cards-container">
                ${this.generateOrderCardsHTML(data)}
            </div>
        `;

        this.orderTableContainer.innerHTML = '';
        this.orderTableContainer.appendChild(container);

        // 이벤트 리스너 설정
        this.setupCardEventListeners(container.querySelector('.order-cards-container'));
    }

    calculateOrderStats(data) {
        const stats = {
            statusCount: {},
            totalAmountUSD: 0,
            totalPaidUSD: 0,
            totalRemainingUSD: 0,
            totalUSDtoKRW: 0,
            totalWonAmount: 0,
            totalProductCost: 0,
            totalPostArrivalCost: 0,
            totalOrderAmount: 0
        };

        data.forEach(order => {
            // 상태별 카운트
            const status = order.상태 || '상태없음';
            stats.statusCount[status] = (stats.statusCount[status] || 0) + 1;

            // USD 관련 금액
            stats.totalAmountUSD += Number(order.총발주액) || 0;
            stats.totalPaidUSD += Number(order.송금총액) || 0;
            stats.totalRemainingUSD += Number(order.총잔액) || 0;

            // 원화 관련 금액
            Object.values(order.차수별발주 || {}).forEach(차수 => {
                차수.items.forEach(item => {
                    // USD 송금 원화환산
                    const 선금원화 = (Number(item.선금송금액) || 0) * (Number(item.선금환율) || 0);
                    const 잔금원화 = (Number(item.잔금송금액) || 0) * (Number(item.잔금환율) || 0);
                    stats.totalUSDtoKRW += 선금원화 + 잔금원화;

                    // 원화 발주액
                    stats.totalWonAmount += Number(item.원화발주액) || 0;
                    

                    // 입항후비용
                    stats.totalPostArrivalCost += Number(item.입항후비용) || 0;
                });
            });

            // 제품발주비용 = USD 송금 원화환산 + 원화 발주액
            stats.totalProductCost = stats.totalUSDtoKRW + stats.totalWonAmount;

            // 발주관련 총액 = 제품발주비용 + 입항후비용
            stats.totalOrderAmount = stats.totalProductCost + stats.totalPostArrivalCost;
        });

        return stats;
    }

    filterOrdersByDate(startDate, endDate) {
        if (!this.data || !Array.isArray(this.data)) return;

        const filteredOrders = startDate && endDate
            ? this.data.filter(order => {
                const orderDate = new Date(order.최초발주일);
                return orderDate >= startDate && orderDate <= endDate;
            })
            : this.data;

        this.renderTable(filteredOrders);
    }

    generateOrderCardsHTML(data) {
        if (!data || !Array.isArray(data)) return '';

        let html = '';
        
        // 주문 카드 생성
        data.forEach((order, index) => {
            html += `
                <div class="order-card" data-order="${order.발주코드}">
                    <div class="order-card-header">
                        <div class="order-info">
                            <div class="order-title">
                                <span class="status-badge ${order.상태?.toLowerCase() || 'default'}">${order.상태 || '상태없음'}</span>
                                <h3>${order.발주코드 || '-'}</h3>
                            </div>
                            <div class="order-meta">
                                <span class="order-dates">
                                    <i class="fas fa-calendar"></i>
                                    ${order.최초발주일 || '날짜없음'} ~ ${order.최종입고일 || '진행중'}
                                </span>
                                <span class="order-amount">
                                    ${Object.values(order.차수별발주).some(차수 => 
                                        차수.items.some(item => item.원화발주액)) ?
                                        `<i class="fas fa-won-sign"></i>
                                         ${Object.values(order.차수별발주)
                                            .flatMap(차수 => 차수.items)
                                            .reduce((sum, item) => sum + (item.원화발주액 || 0), 0)
                                            .toLocaleString()}` :
                                        `<i class="fas fa-dollar-sign"></i>
                                         ${order.총발주액.toLocaleString()}`
                                    }
                                    ${order.총잔액 > 0 ? 
                                        `<span class="remaining-amount">(잔금: $${order.총잔액.toLocaleString()})</span>` 
                                        : ''}
                                </span>
                            </div>
                        </div>
                        <button class="toggle-details">
                            <i class="fas fa-chevron-down"></i>
                        </button>
                    </div>
                </div>`;

            // 3개의 카드마다 또는 마지막 카드 후에 상세 정보 컨테이너 추가
            if ((index + 1) % 3 === 0 || index === data.length - 1) {
                const rowStartIndex = Math.floor(index / 3) * 3;
                const rowEndIndex = Math.min(rowStartIndex + 3, data.length);
                const rowIndex = Math.floor(index / 3);
                
                html += `<div class="details-container" data-row="${rowIndex}">`;
                
                // 현재 행의 카드들에 대한 상세 정보 추가
                for (let i = rowStartIndex; i < rowEndIndex; i++) {
                    if (i < data.length) {  // 배열 범위 체크 추가
                        const rowOrder = data[i];
                        html += `
                            <div class="order-card-details" data-order="${rowOrder.발주코드}">
                                ${this.generateOrderCardDetails(rowOrder)}
                            </div>`;
                    }
                }
                
                html += '</div>';
            }
        });

        return html;
    }

    setupCardEventListeners(container) {
        if (!container) return;

        const cards = container.querySelectorAll('.order-card');
        cards.forEach((card, index) => {
            const toggleBtn = card.querySelector('.toggle-details');
            const icon = toggleBtn?.querySelector('i');
            const rowIndex = Math.floor(index / 3);
            const detailsContainer = container.querySelector(`.details-container[data-row="${rowIndex}"]`);
            const cardDetails = detailsContainer?.querySelector(`.order-card-details[data-order="${card.dataset.order}"]`);

            if (toggleBtn && icon && detailsContainer && cardDetails) {
                toggleBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    
                    // 다른 모든 카드를 닫습니다
                    cards.forEach(otherCard => {
                        if (otherCard !== card) {
                            otherCard.classList.remove('expanded');
                            const otherIcon = otherCard.querySelector('.toggle-details i');
                            if (otherIcon) {
                                otherIcon.classList.remove('fa-chevron-up');
                                otherIcon.classList.add('fa-chevron-down');
                            }
                        }
                    });

                    // 현재 카드를 토글합니다
                    const isExpanding = !card.classList.contains('expanded');
                    
                    if (isExpanding) {
                        // 다른 모든 상세 정보를 숨깁니다
                        container.querySelectorAll('.details-container').forEach(dc => {
                            if (dc !== detailsContainer) {
                                dc.style.display = 'none';
                            }
                        });
                        container.querySelectorAll('.order-card-details').forEach(details => {
                            if (details !== cardDetails) {
                                details.style.display = 'none';
                            }
                        });
                        
                        // 현재 카드의 상세 정보를 표시합니다
                        card.classList.add('expanded');
                        icon.classList.remove('fa-chevron-down');
                        icon.classList.add('fa-chevron-up');
                        detailsContainer.style.display = 'block';
                        cardDetails.style.display = 'block';
                        
                        // 스크롤 위치 조정
                        const cardRect = card.getBoundingClientRect();
                        const scrollTarget = window.scrollY + cardRect.top - 20;
                        window.scrollTo({
                            top: scrollTarget,
                            behavior: 'smooth'
                        });
                    } else {
                        card.classList.remove('expanded');
                        icon.classList.remove('fa-chevron-up');
                        icon.classList.add('fa-chevron-down');
                        detailsContainer.style.display = 'none';
                        cardDetails.style.display = 'none';
                    }
                });
            }
        });
    }

    generateOrderCardDetails(order) {
        return Object.values(order.차수별발주 || {})
            .map(차수 => `
                <div class="order-phase">
                    <div class="phase-items">
                        ${차수.items.map(item => {
                            const 원화환산액 = (item.선금송금액 * item.선금환율) + 
                                             (item.잔금송금액 * item.잔금환율) + 
                                             (item.원화발주액 || 0);
                            const 입항후비용 = Number(item.입항후비용 || 0);
                            const 제품원가 = item.발주수량 > 0 ? (원화환산액 + 입항후비용) / item.발주수량 : 0;

                            return `
                                <div class="order-item">
                                    <div class="item-header">
                                        <div class="item-title">
                                            <div class="item-badges">
                                                <span class="status-badge ${item.상태.toLowerCase()}">${item.상태}</span>
                                                <span class="phase-badge">${차수.발주차수}</span>
                                            </div>
                                            <h5>${item.발주명}</h5>
                                        </div>
                                    </div>
                                    <div class="item-details">
                                        <div class="item-info">
                                            <p><strong>발주일:</strong> ${item.발주일 || '-'}</p>
                                            <p><strong>입항예정일:</strong> ${item.입항예정일 || '-'}</p>
                                            <p><strong>최종입고일:</strong> ${item.최종입고일 || '-'}</p>
                                            <p><strong>수량:</strong> ${item.발주수량.toLocaleString()}개</p>
                                            <p><strong>단가:</strong> ${item.원화발주액 ? 
                                                `₩${item.원화발주액.toLocaleString()}` : 
                                                `$${item.단가.toLocaleString()}`}</p>
                                            <p><strong>발주액:</strong> ${item.원화발주액 ? 
                                                `₩${item.원화발주액.toLocaleString()}` : 
                                                `$${item.발주액.toLocaleString()}`}</p>
                                        </div>
                                        <div class="item-status">
                                            <p><strong>선금송금액:</strong> ${item.선금송금액 ? 
                                                `$${item.선금송금액.toLocaleString()}` : 
                                                '-'}</p>
                                            <p><strong>잔금송금액:</strong> ${item.잔금송금액 ? 
                                                `$${item.잔금송금액.toLocaleString()}` : 
                                                '-'}</p>
                                            <p><strong>원화환산:</strong> ₩${Math.round(원화환산액).toLocaleString()}</p>
                                            <p><strong>입항후비용:</strong> ₩${Math.round(입항후비용).toLocaleString()}</p>
                                            <p><strong>제품원가:</strong> ₩${Math.round(제품원가).toLocaleString()}/개</p>
                                        </div>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            `).join('');
    }

    generateOrderItemHTML(item) {
        const 원화환산액 = (item.선금송금액 * item.선금환율) + 
                         (item.잔금송금액 * item.잔금환율) + 
                         (item.원화발주액 || 0);
        const 입항후비용 = Number(item.입항후비용 || 0);
        const 제품원가 = item.발주수량 > 0 ? (원화환산액 + 입항후비용) / item.발주수량 : 0;

        return `
            <div class="order-item">
                <div class="item-header">
                    <h5>${item.발주명}</h5>
                    <span class="status-badge ${item.상태.toLowerCase()}">${item.상태}</span>
                </div>
                <div class="item-details">
                    <div class="item-info">
                        <p><strong>발주일:</strong> ${item.발주일 || '-'}</p>
                        <p><strong>입항예정일:</strong> ${item.입항예정일 || '-'}</p>
                        <p><strong>최종입고일:</strong> ${item.최종입고일 || '-'}</p>
                        <p><strong>수량:</strong> ${item.발주수량.toLocaleString()}개</p>
                        <p><strong>단가:</strong> ${item.원화발주액 ? 
                            `₩${item.원화발주액.toLocaleString()}` : 
                            `$${item.단가.toLocaleString()}`}</p>
                        <p><strong>발주액:</strong> ${item.원화발주액 ? 
                            `₩${item.원화발주액.toLocaleString()}` : 
                            `$${item.발주액.toLocaleString()}`}</p>
                    </div>
                    <div class="item-status">
                        <p><strong>선금송금액:</strong> ${item.선금송금액 ? 
                            `$${item.선금송금액.toLocaleString()} (₩${Math.round(item.선금송금액 * item.선금환율).toLocaleString()})` : 
                            '-'}</p>
                        <p><strong>잔금송금액:</strong> ${item.잔금송금액 ? 
                            `$${item.잔금송금액.toLocaleString()} (₩${Math.round(item.잔금송금액 * item.잔금환율).toLocaleString()})` : 
                            '-'}</p>
                        <p><strong>원화환산:</strong> ₩${Math.round(원화환산액).toLocaleString()}</p>
                        <p><strong>입항후비용:</strong> ₩${Math.round(입항후비용).toLocaleString()}</p>
                        <p><strong>제품원가:</strong> ₩${Math.round(제품원가).toLocaleString()}/개</p>
                    </div>
                </div>
            </div>
        `;
    }

    updateStats(stats) {
        const container = document.querySelector('.order-stats');
        if (!container) return;

        container.innerHTML = `
            <div class="order-stat-box">
                <h3>발주 현황</h3>
                <div class="order-stat-value">${Object.values(stats.statusCount).reduce((a, b) => a + b, 0)}건</div>
                <div class="order-stat-details">
                    ${Object.entries(stats.statusCount).map(([status, count]) => `
                        <div class="order-stat-detail">
                            <span class="detail-label">${status}:</span>
                            <span class="detail-value">${count}건</span>
                        </div>
                    `).join('')}
                </div>
            </div>
                <div class="order-stat-box">
                <h3>발주액</h3>
                <div class="order-stat-details">
                    <div class="order-stat-detail usd-amount">
                        <span class="detail-label">USD 총 발주액:</span>
                        <span class="detail-value">$${Math.round(stats.totalAmountUSD).toLocaleString()}</span>
                    </div>
                    <div class="order-stat-detail krw-amount">
                        <span class="detail-label">원화 총 발주액:</span>
                        <span class="detail-value">₩${Math.round(stats.totalWonAmount).toLocaleString()}</span>
                    </div>
                    <div class="order-stat-detail section-divider usd-amount">
                        <span class="detail-label">송금 총액 (USD):</span>
                        <span class="detail-value">$${Math.round(stats.totalPaidUSD).toLocaleString()}</span>
                    </div>
                    <div class="order-stat-detail remaining">
                        <span class="detail-label">잔금 총액 (USD):</span>
                        <span class="detail-value">$${Math.round(stats.totalRemainingUSD).toLocaleString()}</span>
                    </div>
                    <div class="order-stat-detail section-divider usd-amount">
                        <span class="detail-label">USD 송금 원화환산:</span>
                        <span class="detail-value">₩${Math.round(stats.totalUSDtoKRW).toLocaleString()}</span>
                    </div>
                    <div class="order-stat-detail krw-amount">
                        <span class="detail-label">원화 발주 송금액:</span>
                        <span class="detail-value">₩${Math.round(stats.totalWonAmount).toLocaleString()}</span>
                    </div>
                    <div class="order-stat-detail section-divider">
                        <span class="detail-label">제품발주비용:</span>
                        <span class="detail-value">₩${Math.round(stats.totalProductCost).toLocaleString()}</span>
                    </div>
                    <div class="order-stat-detail post-arrival">
                        <span class="detail-label">입항후비용:</span>
                        <span class="detail-value">₩${Math.round(stats.totalPostArrivalCost).toLocaleString()}</span>
                    </div>
                    <div class="order-stat-detail total">
                        <span class="detail-label">발주관련 총액:</span>
                        <span class="detail-value">₩${Math.round(stats.totalOrderAmount).toLocaleString()}</span>
                    </div>
                </div>
            </div>
        `;
    }

    setupDateFilter() {
        const dateFilter = document.getElementById('orderDateFilter');
        const dateRangeInput = document.getElementById('orderDateRange');
        const customDateRange = document.querySelector('.custom-date-range');

        if (dateFilter) {
            dateFilter.addEventListener('change', (e) => {
                const selectedValue = e.target.value;
                
                if (selectedValue === 'custom') {
                    customDateRange?.classList.remove('hidden');
                    return;
                }
                
                customDateRange?.classList.add('hidden');
                
                if (selectedValue === 'all') {
                    this.renderTable(this.data);
                } else {
                    const dates = this.getDateRangeFromFilter(selectedValue);
                    if (dates) {
                        this.filterOrdersByDate(dates.startDate, dates.endDate);
                    }
                }
            });
        }

        if (dateRangeInput) {
            flatpickr(dateRangeInput, {
                mode: 'range',
                dateFormat: 'Y-m-d',
                locale: 'ko',
                onChange: (selectedDates) => {
                    if (selectedDates.length === 2) {
                        const [startDate, endDate] = selectedDates;
                        this.filterOrdersByDate(startDate, endDate);
                    }
                }
            });
        }
    }

    getDateRangeFromFilter(filter) {
        const now = new Date();
        const endDate = new Date(now);
        let startDate = new Date(now);

        switch (filter) {
            case '1month':
                startDate.setMonth(now.getMonth() - 1);
                break;
            case '3months':
                startDate.setMonth(now.getMonth() - 3);
                break;
            case '6months':
                startDate.setMonth(now.getMonth() - 6);
                break;
            case '1year':
                startDate.setFullYear(now.getFullYear() - 1);
                break;
            case 'all':
                return null;
            default:
                return null;
        }

        return { startDate, endDate };
    }
} 