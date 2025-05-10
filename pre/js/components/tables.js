import { FormatUtils } from '../utils/formatUtils.js';
import { DataService } from '../services/dataService.js';

export class TableManager {
    constructor(dataService) {
        this.dataService = dataService;
        this.detailTableContainer = document.querySelector('.data-table-container');
        if (!this.detailTableContainer) {
            console.error('상세 테이블 컨테이너를 찾을 수 없습니다.');
            return;
        }
        
        this.initializeTable();
        this.initializeSearchField();
    }

    initializeTable() {
        // 기존 테이블이 있다면 제거
        const existingTable = document.querySelector('.detail-data-table');
        if (existingTable) {
            existingTable.remove();
        }

        const table = document.createElement('table');
        table.className = 'detail-data-table';
        table.classList.add('table', 'table-striped', 'table-bordered');

        // 테이블 헤더 생성
        const thead = document.createElement('thead');
        thead.innerHTML = `
            <tr>
                <th>날짜</th>
                <th>판매처</th>
                <th>주문번호</th>
                <th>상품명</th>
                <th>옵션</th>
                <th class="text-right">수량</th>
                <th class="text-right">매출</th>
                <th>주문상태</th>
                <th>구매자명</th>
                <th>연락처</th>
            </tr>
        `;
        table.appendChild(thead);

        // 테이블 바디 생성
        const tbody = document.createElement('tbody');
        table.appendChild(tbody);

        this.detailTableContainer.appendChild(table);
        this.detailTable = table;
    }

    initializeSearchField() {
        const searchContainer = document.createElement('div');
        searchContainer.className = 'search-container mb-3';

        const searchInput = document.createElement('input');
        searchInput.type = 'text';
        searchInput.id = 'tableSearch';
        searchInput.className = 'form-control';
        searchInput.placeholder = '검색어를 입력하세요...';

        searchContainer.appendChild(searchInput);
        this.detailTableContainer.insertBefore(searchContainer, this.detailTable);

        // 검색 이벤트 리스너
        searchInput.addEventListener('input', (e) => this.handleSearch(e.target.value));
    }

    updateTable(data) {
        if (!this.detailTable) {
            console.error('테이블이 초기화되지 않았습니다.');
            return;
        }

        const tbody = this.detailTable.querySelector('tbody');
        if (!tbody) {
            console.error('테이블 tbody를 찾을 수 없습니다.');
            return;
        }

        // 기존 데이터 삭제
        tbody.innerHTML = '';

        // 새 데이터 추가
        data.forEach(row => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${row.date || ''}</td>
                <td>${row.seller || ''}</td>
                <td>${row.orderNumber || ''}</td>
                <td>${row.mappingStatus === 'unmapped' ? row.mappedProduct : row.originalProduct || ''}</td>
                <td>${row.mappingStatus === 'unmapped' ? row.mappedOption : row.originalOption || ''}</td>
                <td class="text-right">${this.formatNumber(row.quantity)}</td>
                <td class="text-right">${this.formatCurrency(row.sales)}</td>
                <td>${row.orderStatus || ''}</td>
                <td>${row.customerName || ''}</td>
                <td>${row.customerContact || ''}</td>
            `;
            tbody.appendChild(tr);
        });
    }

    handleSearch(searchTerm) {
        if (!this.detailTable) return;

        const tbody = this.detailTable.querySelector('tbody');
        if (!tbody) return;

        const rows = tbody.getElementsByTagName('tr');
        const searchLower = searchTerm.toLowerCase();

        for (const row of rows) {
            const text = row.textContent.toLowerCase();
            row.style.display = text.includes(searchLower) ? '' : 'none';
        }
    }

    formatNumber(num) {
        if (num === undefined || num === null) return '';
        return new Intl.NumberFormat('ko-KR').format(num);
    }

    formatCurrency(value) {
        if (value === undefined || value === null) return '';
        return new Intl.NumberFormat('ko-KR', { 
            style: 'currency', 
            currency: 'KRW' 
        }).format(value);
    }

    async updateTables(data) {
        if (!Array.isArray(data)) {
            console.error('데이터가 배열 형식이 아닙니다:', data);
            return;
        }
        this.updateTable(data);
    }
} 