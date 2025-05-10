import { MappingService } from './mappingService.js';

export class DataService {
    constructor() {
        this.data = null;
        this.productMappings = {};
        this.processedData = null;
        this.channelCommissions = {};
        this.productChannelCommissions = {};
        this.ZERO_SALES_STATUSES = CONFIG.SALES.ZERO_SALES_STATUSES;
        this.spreadsheetId = CONFIG.SHEETS.ID;
        this.data = [];
        this.processedData = [];
        this.channelFees = {};
        this.defaultCommission = 0;
        this.currentData = null;
        
        // MappingService 초기화
        this.mappingService = new MappingService(this);
    }

    async initialize() {
        try {
            console.log('DataService 초기화 시작');
            
            // Google API 초기화
            await this.initializeGoogleAPI();
            
            // 매핑 데이터 로드
            await this.initializeMappings();
            
            // 채널 수수료 정보 로드
            await this.loadChannelCommissions();
            
            console.log('DataService 초기화 완료');
            return true;
        } catch (error) {
            console.error('DataService 초기화 실패:', error);
            throw error;
        }
    }

    async initializeMappings() {
        try {
            this.productMappings = await this.mappingService.loadMappingData();
            await this.loadChannelCommissions();
        } catch (error) {
            console.error('매핑 초기화 중 오류:', error);
        }
    }

    getProductMapping(productName, option) {
        if (!this.mappingService) {
            console.error('MappingService가 초기화되지 않았습니다');
            return null;
        }
        return this.mappingService.getMapping(productName, option);
    }

    async initializeGoogleAPI() {
        try {
            if (!gapi) {
                throw new Error('GAPI가 로드되지 않았습니다.');
            }

            await new Promise((resolve, reject) => {
                gapi.load('client', {
                    callback: resolve,
                    onerror: reject
                });
            });

            await gapi.client.init({
                apiKey: CONFIG.API.KEY,
                discoveryDocs: ['https://sheets.googleapis.com/$discovery/rest?version=v4']
            });

            if (!gapi.client.sheets) {
                throw new Error('Sheets API 초기화 실패');
            }

            await this.loadChannelCommissions();
            return true;

        } catch (error) {
            console.error('Google API 초기화 실패:', error);
            throw error;
        }
    }

    async loadChannelCommissions() {
        try {
            const response = await gapi.client.sheets.spreadsheets.values.get({
                spreadsheetId: this.spreadsheetId,
                range: CONFIG.SHEETS.RANGES.CHANNEL
            });

            if (!response.result || !response.result.values) {
                console.warn('채널 수수료 데이터가 없습니다');
                return;
            }

            const rows = response.result.values;
            
            // 데이터 처리
            for (const row of rows) {
                if (!row || row.length < 5) continue;

                const product = row[CONFIG.SHEETS.CHANNEL_COLUMNS.PRODUCT];
                if (!product) continue;

                const key = product;
                this.channelCommissions[key] = {
                    smartstore: this.parseCommissionRate(row[CONFIG.SHEETS.CHANNEL_COLUMNS.SMARTSTORE]),
                    ohouse: this.parseCommissionRate(row[CONFIG.SHEETS.CHANNEL_COLUMNS.OHOUSE]),
                    ytshopping: this.parseCommissionRate(row[CONFIG.SHEETS.CHANNEL_COLUMNS.YTSHOPPING])
                };
            }


        } catch (error) {
            console.error('채널 수수료 정보 로드 실패:', error);
            this.channelCommissions = {};
            throw error;
        }
    }

    parseCommissionRate(value) {
        if (!value) return CONFIG.SALES.DEFAULT_COMMISSION_RATE;
        const parsed = parseFloat(value);
        return isNaN(parsed) ? CONFIG.SALES.DEFAULT_COMMISSION_RATE : parsed;
    }

    calculateChannelCommission(channel, sales) {
        const commission = this.channelCommissions[channel];
        if (!commission) {
            console.warn(`채널 ${channel}의 수수료 정보가 없습니다.`);
            return 0;
        }
        return (sales * commission.rate) / 100;
    }

    async loadData(loadType = 'dashboard') {
        try {
            if (!gapi.client?.sheets) {
                throw new Error('Sheets API가 초기화되지 않았습니다.');
            }

            // 데이터 로딩 시작 로깅
            console.log('데이터 로딩 시작:', loadType);

            // Promise.all을 사용하여 모든 데이터를 동시에 로드
            const [smartstoreResponse, ohouseResponse, ohouse2Response, ytshoppingResponse] = await Promise.all([
                gapi.client.sheets.spreadsheets.values.get({
                    spreadsheetId: this.spreadsheetId,
                    range: CONFIG.SHEETS.RANGES.SMARTSTORE
                }),
                gapi.client.sheets.spreadsheets.values.get({
                    spreadsheetId: this.spreadsheetId,
                    range: CONFIG.SHEETS.RANGES.OHOUSE
                }),
                gapi.client.sheets.spreadsheets.values.get({
                    spreadsheetId: this.spreadsheetId,
                    range: CONFIG.SHEETS.RANGES.OHOUSE2
                }),
                gapi.client.sheets.spreadsheets.values.get({
                    spreadsheetId: this.spreadsheetId,
                    range: CONFIG.SHEETS.RANGES.YTSHOPPING
                })
            ]);


            // 데이터 병합 전 각 채널별 데이터 검증
            const validateData = (data, channel) => {
                if (!Array.isArray(data)) {
                    console.warn(`${channel} 데이터가 배열이 아닙니다`);
                    return [];
                }
                return data.filter(row => row && row.length >= 5);
            };

            // 각 채널 데이터 처리
            const smartstoreData = validateData(smartstoreResponse.result?.values, '스마트스토어')
                .map(row => ({ row, seller: '스마트스토어' }));
            const ohouseData = validateData(ohouseResponse.result?.values, '오늘의집')
                .map(row => ({ row, seller: '오늘의집' }));
            const ohouse2Data = validateData(ohouse2Response.result?.values, '오늘의집')  // seller를 '오늘의집'으로 통일
                .map(row => ({ row, seller: '오늘의집' }));
            const ytshoppingData = validateData(ytshoppingResponse.result?.values, '유튜브쇼핑')
                .map(row => ({ row, seller: '유튜브쇼핑' }));

            // 모든 데이터 병합
            const combinedData = [
                ...smartstoreData,
                ...ohouseData,
                ...ohouse2Data,
                ...ytshoppingData
            ];

            return combinedData;

        } catch (error) {
            console.error('데이터 로드 실패:', error);
            throw error;
        }
    }

    // 상세 데이터가 필요할 때 호출하는 메서드
    async loadDetailData() {
        return this.loadData('detail');
    }

    async processData(rawData, mode = 'full') {
        try {
            if (!Array.isArray(rawData)) {
                console.warn('유효하지 않은 데이터 형식');
                return [];
            }

            const processedData = await Promise.all(rawData.map(async item => {
                try {
                    let productName, optionName, quantity, orderNumber, orderDate, customerName, customerContact, orderStatus, sales;
                    
                    // 채널별로 상품명과 옵션명 위치가 다름
                    switch(item.seller) {
                        case '스마트스토어':
                            // A~P: 상품주문번호(0), 주문번호(1), 주문일시(2), 주문상태(3), ..., 상품명(8), 옵션정보(9), 수량(10), 구매자명(11)
                            productName = item.row[8];     // I열 (상품명)
                            optionName = item.row[9];      // J열 (옵션정보)
                            quantity = parseInt(item.row[10]) || 0;  // K열 (수량)
                            orderNumber = item.row[1];     // B열 (주문번호)
                            orderDate = item.row[2];       // C열 (주문일시)
                            customerName = item.row[11];    // L열 (구매자명)
                            customerContact = item.row[12]; // M열 (구매자ID)
                            orderStatus = item.row[3];     // D열 (주문상태)
                            sales = parseFloat(item.row[9]) || 0;  // 판매가 정보 없음, 매핑 정보 사용 필요
                            break;
                            
                        case '오늘의집':
                            // ohouse 시트와 ohouse2 시트 구분
                            const isOhouse2 = item.row.length >= 40;  // ohouse2는 AO열까지 있음
                            
                            if (isOhouse2) {
                                // A~AO: 주문번호(0), ..., 상품명(5), ..., 옵션명(8), 수량(9), ..., 판매가*수량(21), ..., 주문자명(26), 주문자연락처(27), ..., 주문상태(40)
                                productName = item.row[5];     // F열 (상품명)
                                optionName = item.row[8];     // I열 (옵션명)
                                quantity = parseInt(item.row[9]) || 0;  // J열 (수량)
                                orderNumber = item.row[0];    // A열 (주문번호)
                                orderDate = item.row[13];     // N열 (주문결제완료일)
                                customerName = item.row[26];  // AA열 (주문자명)
                                customerContact = item.row[27]; // AB열 (주문자 연락처)
                                orderStatus = item.row[40];   // AO열 (주문상태)
                                sales = parseFloat(item.row[21]) || 0;  // V열 (판매가 * 수량)
                            } else {
                                productName = item.row[3];     // D열 (상품명)
                                optionName = item.row[6];     // G열 (옵션명)
                                quantity = parseInt(item.row[8]) || 0;  // I열 (주문수량)
                                orderNumber = item.row[0];    // A열 (주문번호)
                                orderDate = item.row[22];     // W열 (주문일)
                                customerName = item.row[27];  // AB열 (고객명)
                                customerContact = item.row[29]; // AD열 (연락처)
                                orderStatus = item.row[40];   // AO열 (주문상태)
                                sales = parseFloat(item.row[21]) || 0;  // V열 (매출)
                            }
                            break;
                            
                        case '유튜브쇼핑':
                            // A~S: 주문번호(0), ..., 주문상품명(6), 주문상품명+옵션(7), 수량(8), 판매가(9), 수령인(10), 수령인휴대전화(11)
                            productName = item.row[6];     // G열 (주문상품명)
                            optionName = item.row[7];      // H열 (주문상품명+옵션)
                            quantity = parseInt(item.row[8]) || 0;  // I열 (수량)
                            orderNumber = item.row[0];     // A열 (주문번호)
                            orderDate = item.row[17];      // R열 (발주일)
                            customerName = item.row[10];    // K열 (수령인)
                            customerContact = item.row[11]; // L열 (수령인 휴대전화)
                            orderStatus = '';              // 주문상태 정보 없음
                            sales = parseFloat(item.row[9]) || 0;  // J열 (판매가)
                            break;
                            
                        default:
                            console.warn('알 수 없는 판매처:', item.seller);
                            return null;
                    }


                    // 매핑 정보 조회
                    const mappedInfo = this.mappingService.getMappedProductInfo(productName, optionName, item.seller);

                    // 매핑된 정보가 있으면 사용, 없으면 원본 데이터 사용
                    const processedItem = {
                        date: this.formatDate(orderDate),
                        seller: item.seller,
                        orderNumber,
                        originalProduct: productName,
                        originalOption: optionName,
                        mappedProduct: mappedInfo?.product || null,
                        mappedOption: mappedInfo?.option || null,
                        quantity,
                        price: mappedInfo?.price || (sales / quantity),
                        sales: mappedInfo ? (mappedInfo.price * quantity) : sales,
                        cost: mappedInfo?.cost || 0,
                        orderStatus,
                        customerName,
                        customerContact,
                        mappingStatus: mappedInfo?.product ? 'mapped' : 'unmapped'
                    };
                    

                    return processedItem;
                } catch (err) {
                    console.error('데이터 처리 중 오류:', err, item);
                    return null;
                }
            }));

            const filteredData = processedData.filter(item => item !== null && item.date);

            this.processedData = filteredData;
            return filteredData;

        } catch (error) {
            console.error('데이터 처리 중 오류:', error);
            throw error;
        }
    }

    formatDate(dateStr) {
        if (!dateStr) return '';
        try {
            if (typeof dateStr === 'string' && dateStr.length === 8) {
                const year = dateStr.substring(0, 4);
                const month = dateStr.substring(4, 6);
                const day = dateStr.substring(6, 8);
                return `${year}-${month}-${day}`;
            }
            return dateStr;
        } catch (err) {
            console.error('날짜 형식 변환 오류:', err);
            return dateStr;
        }
    }

    getProcessedData() {
        return this.processedData || [];
    }

    filterDataByDateRange(start, end) {
        if (!Array.isArray(this.processedData)) {
            return [];
        }

        if (!start || !end) {
            return [];
        }

        const startDate = new Date(start);
        const endDate = new Date(end);

        return this.processedData.filter(item => {
            if (!item.date) {
                return false;
            }

            const itemDate = new Date(item.date);
            return itemDate >= startDate && itemDate <= endDate;
        });
    }

    calculateChannelFee(channel, sales) {
        if (!channel || !sales) return 0;
        const feeRate = this.channelFees[channel] || this.defaultCommission;
        return sales * (feeRate / 100);
    }

    getDefaultCommission() {
        return this.defaultCommission;
    }

    async loadChannelFees() {
        try {
            const response = await this.gapiClient.sheets.spreadsheets.values.get({
                spreadsheetId: this.spreadsheetId,
                range: 'fees!A2:B',
            });

            const fees = {};
            response.result.values.forEach(([channel, fee]) => {
                fees[channel] = parseFloat(fee) || 0;
            });

            this.channelFees = fees;
            this.defaultCommission = fees['default'] || 0;
        } catch (error) {
            console.error('수수료 정보 로드 중 오류:', error);
            this.channelFees = {};
            this.defaultCommission = 0;
        }
    }

    setCurrentData(data) {
        this.currentData = data;
    }

    getCurrentData() {
        return this.currentData || [];
    }

    async processDetailData(rawData) {
        try {
            if (!Array.isArray(rawData)) {
                return [];
            }

            return rawData.map(row => {
                const date = this.formatDate(row.orderDate || row.orderPaymentDate);
                
                return {
                    date: date,
                    seller: row.seller || row.channel || '',
                    orderNumber: row.orderNumber || '',
                    productName: row.productName || row.originalProduct || '',
                    option: row.option || row.optionInfo || row.optionName || '',
                    quantity: parseInt(row.quantity) || 0,
                    price: parseFloat(row.price) || 0,
                    orderStatus: row.orderStatus || row.deliveryStatus || '',
                    buyerName: row.buyerName || row.customerName || row.orderName || '',
                    buyerContact: row.buyerContact || row.customerContact || row.orderContact || ''
                };
            });
        } catch (error) {
            console.error('상세 데이터 처리 중 오류:', error);
            return [];
        }
    }

    async filterDataByPeriod(period) {
        try {
            const currentData = this.getCurrentData();
            if (!currentData || !Array.isArray(currentData)) {
                return [];
            }

            const today = new Date();
            let startDate, endDate;

            switch (period) {
                case 'today':
                    startDate = new Date(today.setHours(0, 0, 0, 0));
                    endDate = new Date(today.setHours(23, 59, 59, 999));
                    break;
                case 'yesterday':
                    startDate = new Date(today.setDate(today.getDate() - 1));
                    startDate.setHours(0, 0, 0, 0);
                    endDate = new Date(startDate);
                    endDate.setHours(23, 59, 59, 999);
                    break;
                case 'this-week':
                    startDate = new Date(today);
                    startDate.setDate(today.getDate() - (today.getDay() === 0 ? 6 : today.getDay() - 1));
                    startDate.setHours(0, 0, 0, 0);
                    endDate = new Date(startDate);
                    endDate.setDate(startDate.getDate() + 6);
                    endDate.setHours(23, 59, 59, 999);
                    break;
                case 'last-week':
                    startDate = new Date(today);
                    startDate.setDate(today.getDate() - (today.getDay() === 0 ? 6 : today.getDay() - 1) - 7);
                    startDate.setHours(0, 0, 0, 0);
                    endDate = new Date(startDate);
                    endDate.setDate(startDate.getDate() + 6);
                    endDate.setHours(23, 59, 59, 999);
                    break;
                case 'this-month':
                    startDate = new Date(today.getFullYear(), today.getMonth(), 1);
                    endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);
                    break;
                case 'last-month':
                    startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                    endDate = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59, 999);
                    break;
                case 'last-3-months':
                    startDate = new Date(today.getFullYear(), today.getMonth() - 2, 1);
                    endDate = new Date(today.setHours(23, 59, 59, 999));
                    break;
                case 'last-6-months':
                    startDate = new Date(today.getFullYear(), today.getMonth() - 5, 1);
                    endDate = new Date(today.setHours(23, 59, 59, 999));
                    break;
                case 'all':
                    return currentData;
                default:
                    return currentData;
            }

            return currentData.filter(item => {
                const itemDate = new Date(item.date);
                return itemDate >= startDate && itemDate <= endDate;
            });

        } catch (error) {
            console.error('데이터 필터링 중 오류:', error);
            return [];
        }
    }

    async filterDataByCustomDate(selectedDate) {
        try {
            const currentData = this.getCurrentData();
            
            if (!currentData || !Array.isArray(currentData)) {
                return [];
            }

            const date = new Date(selectedDate);
            const startDate = new Date(date.setHours(0, 0, 0, 0));
            const endDate = new Date(date.setHours(23, 59, 59, 999));

            return currentData.filter(item => {
                const itemDate = new Date(item.date);
                return itemDate >= startDate && itemDate <= endDate;
            });

        } catch (error) {
            console.error('커스텀 날짜 필터링 중 오류:', error);
            return [];
        }
    }

    async getNotionData(databaseId) {
        try {
            const baseUrl = window.location.hostname === 'localhost' 
                ? 'http://localhost:3000'  // 3001에서 3000으로 변경
                : 'https://us-central1-hejdoohome-dashboard.cloudfunctions.net/api';

            const response = await fetch(`${baseUrl}/notion/query`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ databaseId })
            });

            if (!response.ok) {
                throw new Error(`서버 요청 실패: ${response.status}`);
            }

            const data = await response.json();
            return data.results || [];
        } catch (error) {
            console.error('Notion 데이터 가져오기 실패:', error);
            throw error;
        }
    }
}