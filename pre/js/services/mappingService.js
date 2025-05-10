export class MappingService {
    constructor(dataService) {
        this.dataService = dataService;
        this.productMappings = {};
        this.channelFees = [];
    }

    createMappingKey(product, option) {
        const key = `${product}-${option}`;
        return key;
    }

    async loadMappingData() {
        try {
            const response = await gapi.client.sheets.spreadsheets.values.get({
                spreadsheetId: CONFIG.SHEETS.ID,
                range: CONFIG.SHEETS.RANGES.MAPPING
            });

            if (!response.result || !response.result.values) {
                throw new Error('매핑 데이터를 찾을 수 없습니다');
            }

            this.productMappings = {};
            
            response.result.values.forEach(row => {
                if (row.length < 6) return;

                const originalProduct = row[0];
                const originalOption = row[1];
                const key = `${originalProduct}-${originalOption}`;

                this.productMappings[key] = {
                    product: row[2],
                    option: row[3],
                    price: parseFloat(row[4]),
                    cost: parseFloat(row[5])
                };

            });

            return this.productMappings;

        } catch (error) {
            console.error('매핑 데이터 로드 실패:', error);
            throw error;
        }
    }

    getMappedProductInfo(originalProduct, originalOption, seller) {
        if (!originalProduct) {
            return null;
        }

        // 원본 옵션이 undefined나 null인 경우 빈 문자열로 처리
        const cleanedOption = originalOption || '';
        const key = `${originalProduct}-${cleanedOption}`;

        const mappedInfo = this.productMappings[key];
        if (mappedInfo) {
            return {
                productName: mappedInfo.product,
                option: mappedInfo.option,
                price: mappedInfo.price,
                cost: mappedInfo.cost
            };
        }

        return null;
    }

    getChannelFee(productName, optionName, channel) {
        try {
            const channelMapping = this.channelFees.find(mapping => 
                mapping.상품명 === productName && 
                (optionName ? mapping.옵션 === optionName : true)
            );

            if (channelMapping) {
                switch(channel) {
                    case '스마트스토어':
                        return channelMapping.스마트스토어 || 0;
                    case '오늘의집':
                        return channelMapping.오늘의집 || 0;
                    case '유튜브쇼핑':
                        return channelMapping.유튜브쇼핑 || 0;
                    default:
                        return 0;
                }
            }
            return 0;
        } catch (error) {
            console.error('채널 수수료 조회 중 오류:', error);
            return 0;
        }
    }

    // 채널별 데이터 구조에 맞게 매핑 키 생성
    createMappingKeyFromSheet(row, seller) {
        let productName, optionName;
        
        switch(seller) {
            case '스마트스토어':
                productName = row[8];  // I열
                optionName = row[9];   // J열
                break;
            case '오늘의집':
                productName = row[3];  // D열
                optionName = row[6];   // G열
                break;
            case '오늘의집2':
                productName = row[5];  // F열
                optionName = row[8];   // I열
                break;
            case '유튜브쇼핑':
                productName = row[6];  // G열
                optionName = row[7];   // H열
                break;
            default:
                console.warn('알 수 없는 채널:', seller);
                return null;
        }

        if (!productName) {
            console.warn('상품명을 찾을 수 없습니다:', { seller, row });
            return null;
        }

        return this.createMappingKey(productName, optionName || '');
    }
} 