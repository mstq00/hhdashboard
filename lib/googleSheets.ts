// 데이터 타입 정의
import { supabase } from '@/lib/supabase';

interface SalesItem {
  channel: string;
  orderNumber: string;
  orderDate: string | null;
  customerName: string;
  customerID: string;
  productName: string;
  optionName: string;
  quantity: number;
  price: number;
  commissionRate: number;
  commissionAmount: number;
  netProfit: number;
  status: string;
  matchingStatus?: string; // 매칭 상태 추가: '매칭 성공', '가격 정보 미확인', '상품 매칭 실패'
  marginRate?: string; // 마진율 추가: (순이익/매출액) × 100
  operatingProfit?: number; // 영업이익 추가: 순이익 - 수수료
  operatingMarginRate?: string; // 영업 마진율 추가: (영업이익/매출액) × 100
  totalSales?: number; // 매출액 추가: 판매가 * 수량
}

// 상품 데이터베이스에서 가져온 정보
interface ProductInfo {
  id: string;
  name: string;
  option: string;
  status: string;
  created_at: string;
  updated_at: string;
}

// 채널별 가격 정보
interface ChannelPricing {
  id: string;
  product_id: string;
  channel: string | null;
  fee: number | null;
  selling_price: number | null;
  supply_price: number | null;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  updated_at?: string;
  is_default?: boolean;
}

interface ProductMapping {
  searchTerms: string[];
  mappedName: string;
  option: string;
  price: number;
  commissionRate: number;
}

// 날짜 유효성 검사 함수
function isValidDate(date: any): boolean {
  return date instanceof Date && !isNaN(date.getTime());
}

// 날짜 문자열 파싱 함수
function parseDate(dateStr: string | null): Date | null {
  if (!dateStr) return null;
  
  try {
    // YYYY-MM-DD 형식
    if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(dateStr)) {
      const date = new Date(dateStr);
      if (isValidDate(date)) return date;
    }
    
    // YYYY.MM.DD 형식
    if (/^\d{4}\.\d{1,2}\.\d{1,2}$/.test(dateStr)) {
      const parts = dateStr.split('.');
      const date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      if (isValidDate(date)) return date;
    }
    
    // YYYY/MM/DD 형식
    if (/^\d{4}\/\d{1,2}\/\d{1,2}$/.test(dateStr)) {
      const parts = dateStr.split('/');
      const date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      if (isValidDate(date)) return date;
    }
    
    // MM/DD/YYYY 형식
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateStr)) {
      const parts = dateStr.split('/');
      const date = new Date(parseInt(parts[2]), parseInt(parts[0]) - 1, parseInt(parts[1]));
      if (isValidDate(date)) return date;
    }
    
    // YYYY년 MM월 DD일 형식
    if (/^\d{4}년\s*\d{1,2}월\s*\d{1,2}일/.test(dateStr)) {
      const match = dateStr.match(/(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일/);
      if (match) {
        const date = new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]));
        if (isValidDate(date)) return date;
      }
    }
    
    // 일반 Date 생성자로 시도
    const date = new Date(dateStr);
    if (isValidDate(date)) return date;
    
    console.log(`파싱할 수 없는 날짜 형식: ${dateStr}`);
    return null;
  } catch (error) {
    console.error(`날짜 파싱 오류: ${dateStr}`, error);
    return null;
  }
}

// 채널명을 표준화하는 함수 추가
export function normalizeChannelName(channel: string): string {
  // 채널명을 소문자로 변환하고 공백 제거
  const normalizedChannel = channel.toLowerCase().trim();
  
  // API 응답과 프론트엔드의 채널 ID 맞추기
  // 참고: 기간별/요일별 데이터에서는 한글 키를 사용하므로 여기도 한글로 반환
  if (normalizedChannel.includes('스마트스토어') || normalizedChannel === 'smartstore') {
    return 'smartstore'; // API 응답용
  } else if (normalizedChannel.includes('오늘의집') || normalizedChannel === 'ohouse') {
    return 'ohouse'; // API 응답용
  } else if (normalizedChannel.includes('유튜브') || normalizedChannel.includes('youtube') || normalizedChannel === 'ytshopping') {
    return 'ytshopping'; // API 응답용 - 소문자로 통일
  } else if (normalizedChannel.includes('쿠팡') || normalizedChannel === 'coupang') {
    return 'coupang'; // API 응답용
  } else {
    return normalizedChannel;
  }
}

// 스마트스토어 데이터 처리
export function processSmartStoreData(data: any[][], commissions: Record<string, number>, productMappings: ProductMapping[]): SalesItem[] {
  try {
    // console.log(`스마트스토어 데이터 처리 시작: ${data.length}행`);
    
    // 샘플 데이터 행 확인
    // if (data.length > 0) {
    //   console.log('스마트스토어 헤더:',
    //     `주문번호: ${data[0][1] || ''} ` +
    //     `주문일시: ${data[0][2] || ''} ` +
    //     `주문상태: ${data[0][3] || ''} ` +
    //     `상품명: ${data[0][8] || ''} ` +
    //     `옵션명: ${data[0][9] || ''} ` +
    //     `수량: ${data[0][10] || ''} ` +
    //     `구매자명: ${data[0][11] || ''} ` +
    //     `연락처: ${data[0][12] || ''}`
    //   );
    // }
    
    const results: SalesItem[] = [];
    let processed = 0;
    let excluded = 0;
    let mapped = 0;
    let dateParseFailures = 0;
    
    for (let i = 0; i < data.length; i++) {
      try {
      const row = data[i];
        if (!row || !row[1]) continue; // 빈 행 무시
        
        // 샘플 데이터 행 확인 (처음 몇 개만)
        // if (i < 5) {
        //   console.log(`스마트스토어 데이터 ${i}:`,
        //     `주문번호: ${row[1] || ''} ` +
        //     `주문일시: ${row[2] || ''} ` +
        //     `주문상태: ${row[3] || ''} ` +
        //     `상품명: ${row[8] || ''} ` +
        //     `옵션명: ${row[9] || ''}`
        //   );
        // }
        
        // 날짜 파싱
        const orderDateStr = row[2] ? String(row[2]).trim() : null;
      let orderDate: Date | null = null;
      
        if (orderDateStr) {
          orderDate = parseDate(orderDateStr);
          if (!orderDate) {
            // console.log(`스마트스토어 날짜 파싱 실패 (${i}행):`, orderDateStr);
            dateParseFailures++;
          }
      }
      
      if (!orderDate) {
        excluded++;
        continue;
      }
      
        const orderNumber = row[1]; // 주문번호 (B열)
        const productName = row[8]; // 상품명 (I열)
        const optionName = row[9] || ''; // 옵션정보 (J열)
        const quantity = parseInt(row[10], 10) || 1; // 수량 (K열)
        const status = row[3] || '주문완료'; // 주문상태 (D열)
      
      // 고객 정보
        const customerName = row[11] || ''; // 구매자명 (L열)
        const customerID = row[12] || ''; // 연락처 (M열)
      
      // 제품 매핑 찾기
      let mappedProductName = '';
      let commissionRate = 0;
      let price = 0;
      
      // 제품 매핑 적용
      for (const mapping of productMappings) {
        if (productName && mapping.searchTerms && 
            mapping.searchTerms.some(term => 
              productName.toLowerCase().includes(term.toLowerCase())
            )) {
          mappedProductName = mapping.mappedName;
          commissionRate = mapping.commissionRate;
          price = mapping.price;
          mapped++;
          break;
        }
      }
      
      // 매핑된 상품명이 없으면 원래 상품명 사용
      if (!mappedProductName) {
        mappedProductName = productName;
        commissionRate = commissions.smartstore || 0;
      }
      
      // 수수료 및 순이익 계산
      const commissionAmount = price * (commissionRate / 100);
      const netProfit = price - commissionAmount;
      
      // 결과 추가
      results.push({
        channel: '스마트스토어',
        orderNumber,
        orderDate: orderDate.toISOString(),
        customerName,
        customerID,
        productName: mappedProductName,
        optionName,
        quantity,
        price,
        commissionRate,
        commissionAmount,
        netProfit,
        status
      });
      
      processed++;
      } catch (error) {
        console.error(`스마트스토어 날짜 파싱 오류 (${i}행):`, error);
        dateParseFailures++;
      }
    }
    
    console.log(`스마트스토어 처리 완료: ${processed}개 처리, ${excluded}개 제외, ${dateParseFailures}개 날짜 파싱 실패`);
    return results;
  } catch (error) {
    console.error('스마트스토어 데이터 처리 오류:', error);
    return [];
  }
}

// 첫 번째 데이터 파싱 추적을 위한 변수
let firstDateParsingAttempt = true;

// 첫 번째 날짜 파싱 오류 로깅 여부
let loggedFirstParseError = false;

// 채널별 수수료 정보 가져오기
export async function fetchChannelCommissions(): Promise<Record<string, number>> {
  try {
    console.log('채널별 수수료 정보 가져오는 중...');
    
    // 임시 수수료 데이터 (실제 구현에서는 Supabase에서 가져옴)
    const commissions: Record<string, number> = {
      'smartstore': 0.05, // 5%
      'ohouse': 0.08,     // 8%
      'ytshopping': 0.07, // 7%
      'coupang': 0.10     // 10%
    };
    
    console.log(`${Object.keys(commissions).length}개 채널 수수료 정보 로드됨`);
    return commissions;
  } catch (error) {
    console.error('채널 수수료 정보 가져오기 오류:', error);
    return {};
  }
}

// 오늘의집 데이터 처리
export function processOhouseData(
  data: any[][], 
  commissions: Record<string, number>, 
  productMappings: ProductMapping[],
  isOhouse2: boolean = false
): SalesItem[] {
  try {
    // console.log(`오늘의집${isOhouse2 ? '2' : ''} 데이터 처리 시작: ${data.length}행`);
    
    // 샘플 데이터 행 확인
    // if (data.length > 0) {
    //   if (!isOhouse2) {
    //     console.log('오늘의집 헤더:',
    //       `주문번호: ${data[0][0] || ''} ` +
    //       `주문일시: ${data[0][22] || ''} ` +
    //       `주문상태: ${data[0][40] || ''} ` +
    //       `상품명: ${data[0][3] || ''} ` +
    //       `옵션명: ${data[0][6] || ''} ` +
    //       `수량: ${data[0][8] || ''} ` +
    //       `구매자명: ${data[0][27] || ''} ` +
    //       `연락처: ${data[0][29] || ''}`
    //     );
    //   } else {
    //     console.log('오늘의집2 헤더:',
    //       `주문번호: ${data[0][0] || ''} ` +
    //       `주문일시: ${data[0][13] || ''} ` +
    //       `주문상태: ${data[0][40] || ''} ` +
    //       `상품명: ${data[0][5] || ''} ` +
    //       `옵션명: ${data[0][8] || ''} ` +
    //       `수량: ${data[0][9] || ''} ` +
    //       `구매자명: ${data[0][28] || ''} ` +
    //       `연락처: ${data[0][29] || ''}`
    //     );
    //   }
    // }
    
    const results: SalesItem[] = [];
    let processed = 0;
    let excluded = 0;
    let mapped = 0;
    let dateParseFailures = 0;
    
    for (let i = 0; i < data.length; i++) {
      try {
      const row = data[i];
        if (!row || !row[0]) continue; // 빈 행 무시
        
        // 샘플 데이터 행 확인 (처음 몇 개만)
        // if (i < 5) {
        //   if (!isOhouse2) {
        //     console.log(`오늘의집 데이터 ${i}:`,
        //       `주문번호: ${row[0] || ''} ` +
        //       `주문일시: ${row[22] || ''} ` +
        //       `주문상태: ${row[40] || ''} ` +
        //       `상품명: ${row[3] || ''} ` +
        //       `옵션명: ${row[6] || ''}`
        //     );
        //   } else {
        //     console.log(`오늘의집2 데이터 ${i}:`,
        //       `주문번호: ${row[0] || ''} ` +
        //       `주문일시: ${row[13] || ''} ` +
        //       `주문상태: ${row[40] || ''} ` +
        //       `상품명: ${row[5] || ''} ` +
        //       `옵션명: ${row[8] || ''}`
        //     );
        //   }
        // }
        
        // 날짜 파싱
        const orderDateStr = !isOhouse2 ? (row[22] ? String(row[22]).trim() : null) : (row[13] ? String(row[13]).trim() : null);
      let orderDate: Date | null = null;
      
        if (orderDateStr) {
          orderDate = parseDate(orderDateStr);
          if (!orderDate) {
            // console.log(`오늘의집${isOhouse2 ? '2' : ''} 날짜 파싱 실패 (${i}행):`, orderDateStr);
            dateParseFailures++;
          }
      }
      
      if (!orderDate) {
        excluded++;
        continue;
      }
      
        const orderNumber = row[0]; // 주문번호 (A열)
        
        // ohouse와 ohouse2에서 열 위치 다름
        let productName, optionName, quantity;
        let customerName, customerID;
        
        if (!isOhouse2) {
          // 오늘의집(ohouse)
          productName = row[3] || ''; // 상품명 (D열)
          optionName = row[6] || ''; // 옵션명 (G열)
          quantity = parseInt(row[8], 10) || 1; // 수량 (I열)
          customerName = row[27] || ''; // 고객명 (AB열)
          customerID = row[29] || ''; // 고객 연락처 (AD열)
        } else {
          // 오늘의집2(ohouse2)
          productName = row[5] || ''; // 상품명 (F열)
          optionName = row[8] || ''; // 옵션명 (I열)
          quantity = parseInt(row[9], 10) || 1; // 수량 (J열)
          customerName = row[28] || ''; // 고객명 (AC열)
          customerID = row[29] || ''; // 고객 연락처 (AD열)
        }
        
        const status = '배송완료'; // 주문상태는 항상 배송완료로 설정
      
      // 제품 매핑 찾기
      let mappedProductName = '';
      let commissionRate = 0;
      let price = 0;
      
      // 제품 매핑 적용
      for (const mapping of productMappings) {
        if (productName && mapping.searchTerms && 
            mapping.searchTerms.some(term => 
              productName.toLowerCase().includes(term.toLowerCase())
            )) {
          mappedProductName = mapping.mappedName;
          commissionRate = mapping.commissionRate;
          price = mapping.price;
          mapped++;
          break;
        }
      }
      
      // 매핑된 상품명이 없으면 원래 상품명 사용
      if (!mappedProductName) {
        mappedProductName = productName;
        commissionRate = commissions.ohouse || 0;
      }
      
      // 수수료 및 순이익 계산
      const commissionAmount = price * (commissionRate / 100);
      const netProfit = price - commissionAmount;
      
      // 결과 추가
      results.push({
        channel: 'ohouse',
        orderNumber,
        orderDate: orderDate.toISOString(),
        customerName,
        customerID,
        productName: mappedProductName,
        optionName,
        quantity,
        price,
        commissionRate,
        commissionAmount,
        netProfit,
          status
      });
      
      processed++;
      } catch (error) {
        console.error(`오늘의집${isOhouse2 ? '2' : ''} 날짜 파싱 오류 (${i}행):`, error);
        dateParseFailures++;
      }
    }
    
    console.log(`오늘의집${isOhouse2 ? '2' : ''} 처리 완료: ${processed}개 처리, ${excluded}개 제외, ${dateParseFailures}개 날짜 파싱 실패`);
    return results;
  } catch (error) {
    console.error(`오늘의집${isOhouse2 ? '2' : ''} 데이터 처리 오류:`, error);
    return [];
  }
}

// 유튜브쇼핑 데이터 처리
export function processYTShoppingData(data: any[][], commissions: Record<string, number>, exclusionOrderNumbers: string[]): SalesItem[] {
  try {
    if (!data || data.length === 0) {
      return [];
    }
    
    console.log(`유튜브쇼핑 데이터 처리 시작: ${data.length}행`);
    
    // 첫 행에서 헤더 찾기 시도
    const firstRow = data[0];
    console.log(`유튜브쇼핑 헤더: ${firstRow.join(' ')}`);
    
    const processedData: SalesItem[] = [];
    let skippedCount = 0;
    let dateParseFailCount = 0;
    
    // 샘플 데이터 로깅 (처음 5개)
    let sampleCount = 0;
    
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      
      // 데이터 형식 검증 - 최소 R열(18번째 열)까지 있어야 함
      if (!row || row.length < 18) continue;
      
      // 주문번호(A열)가 있는지 확인
      const orderNumberCell = row[0] ? row[0].toString().trim() : '';
      if (!orderNumberCell.includes('-')) continue;
      
      // 주문번호 추출
      const orderNumber = orderNumberCell;
      
      // 제외 목록에 있는지 확인
      if (exclusionOrderNumbers.includes(orderNumber)) {
        skippedCount++;
        continue;
      }
      
      // 주문 날짜 추출 - R열(인덱스 17)에서 가져옴
      const orderDateStr = row[17] ? row[17].toString().trim() : '';
      const orderDate = parseDate(orderDateStr);
      
      // 날짜 파싱에 실패하면 로그를 기록하고 계속 진행
      if (!orderDate) {
        dateParseFailCount++;
        console.warn(`유튜브쇼핑 날짜 파싱 실패: ${orderDateStr}(R열)`);
        continue;
      }
      
      // 상품명 추출 - G열(인덱스 6)
      const productName = row[6] ? row[6].toString().trim() : '';
      
      // 옵션명 추출 - H열(인덱스 7)
      const optionName = row[7] ? row[7].toString().trim() : '';
      
      // 수량 추출 - I열(인덱스 8)
      const quantityStr = row[8] ? row[8].toString().trim() : '';
      const quantity = parseInt(quantityStr) || 1;
      
      // 가격 추출 (가능하다면)
      let price = 0;
      if (row[5] && typeof row[5] === 'string') {
        // 가격에서 쉼표나 원화 기호 등을 제거하고 숫자만 추출
        const priceStr = row[5].replace(/[^0-9]/g, '');
        price = parseInt(priceStr) || 0;
      } else if (typeof row[5] === 'number') {
        price = row[5];
      }
      
      // 구매자 정보 추출 - K열(인덱스 10), L열(인덱스 11)
      const customerName = row[10] ? row[10].toString().trim() : '';
      const customerID = row[11] ? row[11].toString().trim() : '';
      
      // 가격 정보 계산 - 유튜브쇼핑의 기본 수수료율 적용
      const commissionRate = commissions['유튜브쇼핑'] || commissions['YTshopping'] || 2.8;
      const commissionAmount = price * quantity * (commissionRate / 100);
      
      // 샘플 데이터 로깅
      if (sampleCount < 5) {
        console.log(`${sampleCount+1}번 데이터: 주문번호: ${orderNumber}, 주문일시: ${orderDateStr}, 상품명: ${productName}, 옵션명: ${optionName}, 가격: ${price}, 수량: ${quantity}`);
        sampleCount++;
      }
      
      // 정제된 데이터 생성
      const salesItem: SalesItem = {
        channel: '유튜브쇼핑',
        orderNumber,
        orderDate: orderDate.toISOString(),
        customerName,
        customerID,
        productName,
        optionName,
        quantity,
        price,
        commissionRate,
        commissionAmount,
        netProfit: price * quantity - commissionAmount, // 순이익 계산
        status: '구매확정', // 기본 상태 설정
        totalSales: price * quantity // 총 매출액 추가
      };
      
      processedData.push(salesItem);
    }
    
    console.log(`유튜브쇼핑 처리 완료: ${processedData.length}개 처리, ${skippedCount}개 제외, ${dateParseFailCount}개 날짜 파싱 실패`);
    return processedData;
  } catch (error) {
    console.error('유튜브쇼핑 데이터 처리 오류:', error);
    return [];
  }
}

// 쿠팡 데이터 처리
export function processCoupangData(data: any[][], exclusionOrderNumbers: string[] = []): SalesItem[] {
  try {
    // 데이터가 없는 경우
    if (!data || data.length === 0) {
      console.log('쿠팡 데이터 없음');
      return [];
    }
    
    // exclusionOrderNumbers가 undefined인 경우 빈 배열로 설정
    if (!exclusionOrderNumbers) {
      exclusionOrderNumbers = [];
    }
    
    // 첫 번째 행의 헤더 확인
    const header = data[0];
    console.log(`쿠팡 헤더: 주문번호: ${header[2]} 주문일시: ${header[9]} 상품명: ${header[10]} 옵션명: ${header[11]} 수량: ${header[22]} 구매자명: ${header[24]} 연락처: ${header[28]}`);
    
    // 처음 5개 데이터 샘플 로깅
    console.log('쿠팡 처음 5개 데이터 샘플:');
      for (let i = 1; i < Math.min(6, data.length); i++) {
      const row = data[i];
      if (row && row.length > 28) {
        console.log(`${i}번 데이터: 주문번호: ${row[2]}, 주문일시: ${row[9]}, 상품명: ${row[10]}, 옵션명: ${row[11]}`);
      } else {
        console.log(`${i}번 데이터: 데이터 형식 오류 또는 빈 행`);
      }
    }
    
    const results: SalesItem[] = [];
    let processed = 0;
    let excluded = 0;
    let dateParseFailures = 0;
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      
      // 행이 비어있거나 필수 필드가 비어있으면 건너뜀
      if (!row || row.length < 29 || !row[2] || !row[9]) {
        continue;
      }
      
      const orderNumber = String(row[2]).trim();
      
      // 제외할 주문번호인 경우 건너뜀
      if (exclusionOrderNumbers.includes(orderNumber)) {
        excluded++;
        continue;
      }
      
      try {
        // 날짜 변환
        const dateStr = String(row[9]).trim();
        let orderDate: Date | null = null;
        
        // 날짜 파싱 (다양한 형식 지원)
        orderDate = parseDate(dateStr);
        
        if (!orderDate || isNaN(orderDate.getTime())) {
          throw new Error(`유효하지 않은 날짜: ${dateStr}`);
        }
        
        // 원래 상품명과 옵션명을 가져옴
        const productName = String(row[10] || '').trim();
        const optionName = String(row[11] || '').trim();
        const quantity = parseInt(String(row[22] || '1').trim(), 10) || 1;
        const customerName = String(row[24] || '').trim();
        const customerID = String(row[28] || '').trim();
        
        // 쿠팡 주문 상태는 항상 '배송완료'로 간주
        const status = '배송완료';
        
      results.push({
          channel: 'coupang',
        orderNumber,
        orderDate: orderDate.toISOString(),
        customerName,
        customerID,
          productName,
        optionName,
        quantity,
          price: 0, // 나중에 업데이트됨
          commissionRate: 0, // 나중에 업데이트됨
          commissionAmount: 0, // 나중에 업데이트됨
          netProfit: 0, // 나중에 업데이트됨
          status,
          matchingStatus: '상품 매칭 실패' // 기본값, 나중에 업데이트됨
      });
      
      processed++;
      } catch (error) {
        console.error(`쿠팡 날짜 파싱 오류 (${i}행):`, error);
        dateParseFailures++;
      }
    }
    
    console.log(`쿠팡 처리 완료: ${processed}개 처리, ${excluded}개 제외, ${dateParseFailures}개 날짜 파싱 실패`);
    return results;
  } catch (error) {
    console.error('쿠팡 데이터 처리 오류:', error);
    return [];
  }
}

// 속도 제한을 위한 백오프 딜레이 함수
async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 캐싱 및 API 요청 관리 변수
const CACHE_TTL = 60 * 60 * 1000; // 1시간 캐시 유효시간

// 타입 지정된 인터페이스
interface CacheItem<T> {
  data: T;
  expiry: number;
}

// 캐시 저장소
const cache: Record<string, CacheItem<any>> = {};

// 진행 중인 요청 저장소
const pendingRequests: Record<string, Promise<any>> = {};

// 시트 데이터 가져오기 - 최적화된 버전
export async function fetchSheetData(range: string, dateParams?: { startDate?: string, endDate?: string }): Promise<any[]> {
  // 기본 캐시 키는 범위만 포함
  let cacheKey = `sheet_${range}`;
  
  // 날짜 파라미터가 있으면 캐시 키에 추가
  if (dateParams && (dateParams.startDate || dateParams.endDate)) {
    cacheKey += `_${dateParams.startDate || ''}_${dateParams.endDate || ''}`;
  }
  
  // 캐시된 데이터가 있으면 반환
  if (cache[cacheKey] && Date.now() < cache[cacheKey].expiry) {
    // 로그 간소화 - 모바일에서의 부담 감소
    return cache[cacheKey].data;
  }
  
  // 진행 중인 요청이 있는지 확인
  let pendingRequest = pendingRequests[cacheKey];
  if (pendingRequest) {
    // 로그 간소화
    return pendingRequest;
  }
  
  console.log(`데이터 로드 중: ${range.split('!')[0]}`);
  
  // 새 요청 생성
  pendingRequest = (async () => {
    try {
      // API 키를 사용한 인증 방식으로 변경
      // 임시 하드코딩된 API 키 (테스트용)
      const hardcodedApiKey = 'AIzaSyD1I839Np6CFFysPqwSQlxBDYPiFzguBiM';
      
      // 환경 변수 또는 하드코딩된 키 사용
      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY || 
                     process.env.GOOGLE_API_KEY || 
                     hardcodedApiKey;
      
      // 로그 간소화
      if (!apiKey) {
        throw new Error('Google API 키가 설정되지 않았습니다.');
      }
      
      // 스프레드시트 ID 확인 - 임시 하드코딩 지원
      const hardcodedSheetId = '1Hu-V8dDmE1j5gQz4Gk4LHclBZS9UEAVVr5IPd2e0G-o';
      const sheetId = process.env.NEXT_PUBLIC_SHEET_ID || hardcodedSheetId;
      
      if (!sheetId) {
        throw new Error('스프레드시트 ID가 설정되지 않았습니다.');
      }
      
      // 기본 URL
      let url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}?key=${apiKey}`;
      
      // 날짜 필터링은 클라이언트 측에서 처리하므로 API URL에 추가하지 않음
      
      // 타임아웃 적용 - 모바일 환경에서의 안정성 향상
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30초 타임아웃
      
      try {
        const response = await fetch(url, {
          signal: controller.signal,
          // 캐시 제어를 통한 안정성 향상
          cache: 'no-store'
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`API 응답 오류 (${response.status}): ${errorText}`);
        }
        
        const data = await response.json();
        const values = data.values || [];
        
        // 캐시에 결과 저장
        cache[cacheKey] = {
          data: values,
          expiry: Date.now() + CACHE_TTL
        };
        
        console.log(`${range.split('!')[0]} 로드 완료: ${values.length}행`);
        return values;
      } catch (fetchError) {
        clearTimeout(timeoutId);
        throw fetchError;
      }
    } catch (error: any) {
      // 오류 로깅 간소화
      let errorMessage = '데이터 로드 오류';
      
      if (error.name === 'AbortError') {
        errorMessage = '요청 시간 초과';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      console.error(`${range.split('!')[0]} 오류: ${errorMessage}`);
      
      // 할당량 초과 오류 특별 처리
      if (error.message && error.message.includes('429')) {
        console.error('API 할당량 초과. 잠시 후 다시 시도하세요.');
        return [];
      }
      
      throw error;
    } finally {
      // 요청 완료 후 pendingRequests에서 제거
      delete pendingRequests[cacheKey];
    }
  })();
  
  // 진행 중인 요청 저장
  pendingRequests[cacheKey] = pendingRequest;
  
  return pendingRequest;
}

// 통합된 하나의 fetchAllSalesData 함수
export async function fetchAllSalesData(startDate?: Date, endDate?: Date): Promise<SalesItem[]> {
  try {
    // 현재 날짜 범위에 대한 캐시 키 생성 (범위가 있는 경우)
    const dateRangeStr = startDate && endDate 
      ? `_${startDate.toISOString().slice(0, 10)}_${endDate.toISOString().slice(0, 10)}`
      : '';
    const cacheKey = `allSalesData${dateRangeStr}`;
    
    // 캐시된 데이터가 있으면 반환
    if (cache[cacheKey] && Date.now() < cache[cacheKey].expiry) {
      // 로그 간소화
      return cache[cacheKey].data;
    }
    
    console.log('데이터 로드 중...');
    
    // 판매 데이터 관련 정보 가져오기 (병렬 처리)
    const [productInfoData, commissions, channelPricingData, sheetMappings] = await Promise.all([
      fetchProductsFromDatabase(),
      fetchChannelCommissions(),
      fetchChannelPricingFromDatabase(),
      fetchSheetMappingsFromDatabase()
    ]);
    
    // 로그 간소화
    
    // 가격 정보 맵 생성
    const priceInfoMap = new Map<string, { price: number, fee: number, supplyPrice: number }>();
    
    for (const pricing of channelPricingData) {
      if (pricing.product_id && pricing.channel) {
        const key = `${pricing.product_id}:${pricing.channel.toLowerCase()}`;
        priceInfoMap.set(key, {
          price: pricing.selling_price || 0,
          fee: pricing.fee || 0,
          supplyPrice: pricing.supply_price || 0
        });
      }
    }
    
    // 모든 시트 데이터를 순차적으로 가져오기 (API 호출 과부하 방지)
    const allSalesData: SalesItem[] = [];
    
    try {
      // 날짜 파라미터는 더 이상 URL에 직접 추가하지 않음
      // 대신 클라이언트 측에서 필터링
      
      // 순차적 데이터 로딩 (각 요청 사이에 지연 적용)
      // 타입 안전성을 위해 프로세서 함수 정의 개선
      type SheetProcessor = (
        data: any[][], 
        commissions: Record<string, number>, 
        exclusions: string[]
      ) => SalesItem[];
      
      interface SheetConfig {
        name: string;
        processor: SheetProcessor | ((data: any[][], exclusions: string[]) => SalesItem[]);
      }
      
      const sheets: SheetConfig[] = [
        { 
          name: `smartstore!A2:N`, 
          processor: (data, comm, _) => processSmartStoreData(data, comm, [])
        },
        { 
          name: `ohouse!A2:AL`, 
          processor: (data, comm, _) => processOhouseData(data, comm, [], false)
        },
        { 
          name: `ohouse2!A2:AL`, 
          processor: (data, comm, _) => processOhouseData(data, comm, [], true)
        },
        { 
          name: `YTshopping!A2:T`, 
          processor: (data, comm, exclusions) => processYTShoppingData(data, comm, exclusions)
        },
        { 
          name: `coupang!A2:AC`, 
          processor: (data, _, exclusions) => processCoupangData(data, exclusions)
        }
      ];
      
      // 모바일 환경에서 안정성을 위해 지연 시간 증가
      const delayBetweenRequests = 1500; // 1.5초
      
      // 모바일 환경 최적화: 한 번에 모든 시트를 처리하는 대신 한 번에 하나씩 처리
      for (const sheet of sheets) {
        try {
          console.log(`${sheet.name.split('!')[0]} 데이터 로드 중...`);
          
          // 날짜 범위 정보는 따로 전달하지 않음
          const sheetData = await fetchSheetData(sheet.name);
          
          const exclusions = allSalesData.map(item => item.orderNumber);
          
          let processedData: SalesItem[];
          if (sheet.name.includes('coupang')) {
            // coupang은 commissions 인자 구조가 다른 함수를 가짐
            processedData = (sheet.processor as any)(sheetData, exclusions || []);
          } else {
            processedData = (sheet.processor as SheetProcessor)(sheetData, commissions, exclusions);
          }

          // 서버에서 날짜 필터링 대신 클라이언트에서 필터링
          if (startDate && endDate) {
            processedData = filterDataByDateRange(processedData, startDate, endDate);
            console.log(`${sheet.name.split('!')[0]}: ${processedData.length}개 항목 필터링됨`);
          }
          
          allSalesData.push(...processedData);
          
          // API 요청 사이에 지연 추가
          await sleep(delayBetweenRequests);
        } catch (error) {
          console.error(`${sheet.name.split('!')[0]} 로드 실패`);
          // 개별 시트 실패해도 계속 진행
        }
      }
    } catch (error) {
      console.error('데이터 로드 중 오류 발생');
      // 일부 시트 데이터라도 처리 계속
    }
    
    console.log(`총 ${allSalesData.length}개 항목 로드됨`);
    
    // 상품 정보 적용
    let mappingAttemptCount = 0;
    let matchingSuccessCount = 0;
    
    const updatedSalesData = allSalesData.map((item) => {
      // 매핑 시도 횟수 증가
      mappingAttemptCount++;
      
      // 매핑 시도 로그 제거 (모바일 성능 향상을 위해)
      
      // 매핑 시도
      let mapping = findMapping(sheetMappings, item.productName, item.optionName);
      
      if (mapping) {
        const productInfo = productInfoData.find(p => p.id === mapping?.product_id);
        
        if (productInfo) {
          // 상품명과 옵션명 업데이트
          item.productName = productInfo.name;
          item.optionName = productInfo.option;
          item.matchingStatus = '매칭 성공';
          
          // 채널별 가격 정보 가져오기
          // 대소문자 관계없이 채널 이름 일치하는지 확인
          const normalizedChannel = item.channel.toLowerCase();
          
          // 채널명 정규화
          const standardizedChannel = 
            normalizedChannel.includes('스마트') ? 'smartstore' :
            normalizedChannel.includes('오늘의집') || normalizedChannel.includes('오늘') || normalizedChannel.includes('ohouse') ? 'ohouse' :
            normalizedChannel.includes('유튜브') || normalizedChannel.includes('yt') ? 'YTshopping' :
            normalizedChannel.includes('쿠팡') ? 'coupang' : 
            normalizedChannel;
          
          // 매핑된 상품의 채널별 가격 정보 찾기
          const key = `${mapping.product_id}:${standardizedChannel}`;
          let priceInfo = priceInfoMap.get(key);
          
          // 해당 채널에 가격 정보가 없으면 기본 가격 정보 찾기
          if (!priceInfo) {
            const defaultKey = `${mapping.product_id}:smartstore`; // 스마트스토어를 기본값으로
            priceInfo = priceInfoMap.get(defaultKey);
            
            // 여전히 없으면 모든 채널 중에서 찾기
            if (!priceInfo) {
              for (const [k, v] of priceInfoMap.entries()) {
                if (k.startsWith(`${mapping.product_id}:`)) {
                  priceInfo = v;
                  break;
                }
              }
            }
          }
          
          // 가격 정보가 있으면 업데이트
          if (priceInfo) {
            // 판매가 업데이트 (항상 channel_pricing의 가격 사용)
            if (priceInfo.price) {
              item.price = priceInfo.price;
            }
            
            // 수수료 업데이트
            if (priceInfo.fee !== undefined) {
              item.commissionRate = priceInfo.fee;
              
              // 수수료 금액 계산
              const totalSales = item.price * item.quantity;
              item.commissionAmount = (totalSales * (priceInfo.fee / 100));
              
              // 순이익 계산 (판매가 - 공급가 - 수수료)
              const netProfit = (item.price - (priceInfo.supplyPrice || 0)) * item.quantity;
              item.netProfit = netProfit;
              
              // 매출액 추가
              item.totalSales = totalSales;
              
              // 영업이익 계산 (순이익 - 수수료)
              const operatingProfit = netProfit - item.commissionAmount;
              item.operatingProfit = operatingProfit;
              
              // 마진율 및 영업 마진율 계산
              if (totalSales > 0) {
                item.marginRate = (netProfit / totalSales * 100).toFixed(1);
                item.operatingMarginRate = (operatingProfit / totalSales * 100).toFixed(1);
              }
              
              // 매칭 성공 카운트 증가
              matchingSuccessCount++;
            }
          } else {
            // 가격 정보가 없는 경우 상태 표시
            item.matchingStatus = '가격 정보 미확인';
          }
        }
      } else {
        // 매칭 실패 표시
        item.matchingStatus = '상품 매칭 실패';
      }
      
      return item;
    });
    
    // 매치 성공률 로그 간소화
    
    // 캐시에 데이터 저장 (1시간 유효)
    cache[cacheKey] = {
      data: updatedSalesData,
      expiry: Date.now() + 3600000  // 1시간 캐시
    };
    
    return updatedSalesData;
  } catch (error) {
    console.error('데이터 로드 오류 발생');
    return [];
  }
}

// 캐시 지우기 통합 함수
export function clearCache(cacheKey?: string) {
  if (cacheKey) {
    // 특정 키의 캐시만 삭제
    delete cache[cacheKey];
    console.log(`캐시 삭제됨: ${cacheKey}`);
    return { success: true, clearedKey: cacheKey };
  } else {
    // 모든 캐시 삭제
    Object.keys(cache).forEach(key => {
      delete cache[key];
    });
    console.log('모든 캐시가 삭제됨');
    return { success: true, clearedAll: true };
  }
}

// 상품 데이터베이스에서 데이터 가져오기
export async function fetchProductsFromDatabase(): Promise<ProductInfo[]> {
  try {
    console.log('상품 데이터베이스에서 정보 가져오는 중...');
    
    const { data, error } = await supabase
      .from('products')
      .select('*');
    
    if (error) {
      console.error('상품 정보 가져오기 오류:', error);
      return [];
    }
    
    console.log(`${data.length}개 상품 정보 로드됨`);
    
    if (data.length > 0) {
      console.log('상품 정보 샘플:');
      for (let i = 0; i < Math.min(5, data.length); i++) {
        console.log(`${i + 1}. id=${data[i].id}, name=${data[i].name}, option=${data[i].option}`);
      }
    }
    
    console.log(`상품 데이터베이스에서 ${data.length}개 상품 정보 로드됨`);
    
    return data as ProductInfo[];
  } catch (error) {
    console.error('상품 데이터 가져오기 오류:', error);
    return [];
  }
}

// 채널별 가격 정보 가져오기
export async function fetchChannelPricingFromDatabase(): Promise<ChannelPricing[]> {
  try {
    console.log('채널별 가격 정보 가져오는 중...');
    
    const { data, error } = await supabase
      .from('channel_pricing')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('채널별 가격 정보 가져오기 오류:', error);
      return [];
    }
    
    console.log(`${data.length}개 채널별 가격 정보 로드됨`);
    return data;
  } catch (error) {
    console.error('채널별 가격 정보 가져오기 오류:', error);
    return [];
  }
}

// 상품명과 채널에 따른 가격 및 수수료 정보 조회
export async function getProductPriceInfo(productName: string, channel: string): Promise<{ price: number, fee: number } | null> {
  try {
    // 상품 정보 가져오기
    const products = await fetchProductsFromDatabase();
    
    // 상품명으로 상품 ID 찾기
    const product = products.find(p => p.name.toLowerCase() === productName.toLowerCase());
    if (!product) {
      console.log(`상품을 찾을 수 없음: ${productName}`);
      return null;
    }
    
    // 채널별 가격 정보 가져오기
    const channelPricings = await fetchChannelPricingFromDatabase();
    
    // 채널명 표준화
    const normalizedChannel = normalizeChannelName(channel);
    
    // 해당 상품과 채널에 맞는 가격 정보 찾기
    const pricing = channelPricings.find(p => 
      p.product_id === product.id && 
      p.channel && normalizeChannelName(p.channel) === normalizedChannel
    );
    
    // 채널별 가격이 없으면 기본 가격 정보 찾기
    if (!pricing) {
      const defaultPricing = channelPricings.find(p => 
        p.product_id === product.id && 
        p.is_default === true
      );
      
      if (defaultPricing) {
        return {
          price: Number(defaultPricing.selling_price),
          fee: Number(defaultPricing.fee)
        };
      }
      
      console.log(`가격 정보를 찾을 수 없음: ${productName}, 채널: ${channel}`);
      return null;
    }
    
    return {
      price: Number(pricing.selling_price),
      fee: Number(pricing.fee)
    };
  } catch (error) {
    console.error('상품 가격 정보 조회 오류:', error);
    return null;
  }
}

export async function fetchDataFromGoogleSheets(spreadsheetId: string, range: string) {
  try {
    console.log(`Google Sheets에서 데이터 가져오기: ${spreadsheetId}, 범위: ${range}`);
    // 실제 구현은 Google Sheets API를 사용하여 처리해야 함
    return [];
  } catch (error) {
    console.error('Google Sheets 데이터 가져오기 오류:', error);
    throw error;
  }
}

// 유효한 주문 상태 확인 함수 추가
function isValidOrderStatus(status: string): boolean {
  // 취소, 미결제취소, 반품 상태는 제외
  const invalidStatuses = ['취소', '미결제취소', '반품', '교환', '결제취소'];
  return !invalidStatuses.some(invalidStatus => status.includes(invalidStatus));
}

// 매출 계산에 유효한 판매 데이터만 필터링하는 함수
export function filterValidSalesData(salesData: SalesItem[]): SalesItem[] {
  return salesData.filter(item => isValidOrderStatus(item.status));
}

export function aggregateProductSales(salesData: any[]) {
  try {
    // 제품별 매출 집계
    const productSales: Record<string, any> = {};
    
    // 유효한 주문 상태의 데이터만 처리
    const validSalesData = salesData.filter(item => isValidOrderStatus(item.status));
    
    validSalesData.forEach(item => {
      // 상품명과 옵션명 가져오기
      const productName = item.productName || '알 수 없는 상품';
      const optionName = item.optionName || '-';  // 빈 문자열 대신 하이픈으로 통일
      
      // 매칭 상태 확인
      const isSuccessfullyMapped = item.matchingStatus === '매칭 성공';
      
      // 상품명과 옵션명을 키로 사용
      const productKey = `${productName}##${optionName}`;
      
      if (!productSales[productKey]) {
        productSales[productKey] = {
          productName,
          option: optionName,  // 옵션명은 매핑된 값으로 사용
          quantity: 0,
          sales: 0,
          commissionAmount: 0,
          netProfit: 0,
          operatingProfit: 0,
          channels: {},
          matchingStatus: item.matchingStatus || '상품 매칭 실패'
        };
      }
      
      const product = productSales[productKey];
      product.quantity += item.quantity || 0;
      
      // totalSales 필드가 있으면 사용하고, 없으면 가격과 수량을 곱해서 계산
      const itemSales = item.totalSales !== undefined ? item.totalSales : (item.price || 0) * (item.quantity || 1);
      product.sales += itemSales;
      product.commissionAmount += (item.commissionAmount || 0);
      product.netProfit += (item.netProfit || 0);
      product.operatingProfit += (item.operatingProfit || 0);
      
      // 매핑 상태가 '매칭 성공'인 항목이 있으면 전체를 '매칭 성공'으로 업데이트
      if (isSuccessfullyMapped) {
        product.matchingStatus = '매칭 성공';
      }
      
      // 채널별 데이터 추가
      const channel = item.channel ? normalizeChannelName(item.channel) : 'unknown';
      
      if (!product.channels[channel]) {
        product.channels[channel] = {
          quantity: 0,
          sales: 0,
          commissionAmount: 0,
          netProfit: 0,
          operatingProfit: 0
        };
      }
      
      product.channels[channel].quantity += item.quantity || 0;
      product.channels[channel].sales += itemSales;
      product.channels[channel].commissionAmount += (item.commissionAmount || 0);
      product.channels[channel].netProfit += (item.netProfit || 0);
      product.channels[channel].operatingProfit += (item.operatingProfit || 0);
    });
    
    // 객체를 배열로 변환하고 매출액으로 정렬
    return Object.values(productSales)
      .map((product: any) => {
        // 마진율 계산
        if (product.sales > 0) {
          // 순이익 마진율
          product.marginRate = parseFloat(((product.netProfit / product.sales) * 100).toFixed(1));
          
          // 영업이익 마진율
          product.operatingMarginRate = parseFloat(((product.operatingProfit / product.sales) * 100).toFixed(1));
        } else {
          product.marginRate = 0;
          product.operatingMarginRate = 0;
        }
        
        // 채널별 데이터를 배열로 변환
        product.channelData = Object.entries(product.channels).map(([channel, data]: [string, any]) => {
          // 채널별 표시 이름 설정
          let displayName;
          switch(channel) {
            case 'smartstore':
              displayName = '스마트스토어';
              break;
            case 'ohouse':
              displayName = '오늘의집';
              break;
            case 'ytshopping':
              displayName = '유튜브쇼핑';
              break;
            case 'coupang':
              displayName = '쿠팡';
              break;
            default:
              displayName = channel;
          }
          
          return {
            channel,
            displayName,
            ...data,
            percentage: product.sales > 0 ? (data.sales / product.sales) * 100 : 0
          };
        }).sort((a: any, b: any) => b.sales - a.sales);
        
        return product;
      })
      .sort((a: any, b: any) => b.sales - a.sales);
  } catch (error) {
    console.error('제품별 매출 집계 오류:', error);
    return [];
  }
}

export function aggregateChannelSales(salesData: SalesItem[]) {
  try {
    if (!salesData || salesData.length === 0) {
      return [];
    }
    
    // 유효한 주문 상태의 데이터만 처리
    const validSalesData = salesData.filter(item => isValidOrderStatus(item.status));
    
    const channelSales: { [key: string]: { channel: string, channelName: string, sales: number, percentage?: number } } = {};
    let totalSales = 0;
    
    validSalesData.forEach(item => {
      // 채널 이름 표준화
      const channel = item.channel ? normalizeChannelName(item.channel) : 'unknown';
      let channelName = '알 수 없음';
      
      // 채널 이름 매핑
      switch (channel) {
        case 'smartstore':
          channelName = '스마트스토어';
          break;
        case 'ohouse':
          channelName = '오늘의집';
          break;
        case 'ytshopping':
          channelName = '유튜브쇼핑';
          break;
        case 'coupang':
          channelName = '쿠팡';
          break;
        default:
          channelName = channel;
      }
      
      // 채널별 매출 집계
      if (!channelSales[channel]) {
        channelSales[channel] = {
          channel,
          channelName,
          sales: 0
        };
      }
      
      // totalSales 필드가 있으면 사용하고, 없으면 가격과 수량을 곱해서 계산
      const itemSales = item.totalSales !== undefined ? item.totalSales : item.price * item.quantity;
      channelSales[channel].sales += itemSales;
      totalSales += itemSales;
    });
    
    // 비율 계산 및 결과 정렬
    return Object.values(channelSales)
      .map(channel => {
        channel.percentage = totalSales > 0 ? (channel.sales / totalSales) * 100 : 0;
        return channel;
      })
      .sort((a, b) => b.sales - a.sales);
  } catch (error) {
    console.error('채널별 매출 집계 오류:', error);
    return [];
  }
}

// 날짜별 매출 데이터 생성
export function generatePeriodSalesData(
  salesData: SalesItem[], 
  periodType: 'daily' | 'weekly' | 'monthly' = 'daily'
) {
  try {
    if (!salesData || salesData.length === 0) {
      console.log(`데이터가 없음: 빈 배열 반환 (${periodType})`);
      return [];
    }
    
    // 유효한 주문 상태의 데이터만 처리
    const validSalesData = salesData.filter(item => isValidOrderStatus(item.status));
    console.log(`기간별 매출 분석 데이터 생성 중: ${validSalesData.length}개 유효 데이터, 기간 유형: ${periodType}`);
    
    // 기간별 매출 데이터 집계
    const periodSales: { [key: string]: { [channel: string]: number } } = {};
    
    // 모든 채널 수집을 위한 Set
    const channelsSet = new Set<string>();
    
    // 주요 채널 미리 추가 (데이터에 없어도 표시)
    channelsSet.add('smartstore');
    channelsSet.add('ohouse');
    channelsSet.add('ytshopping');
    channelsSet.add('coupang');
    
    // 데이터에서 최소/최대 날짜 찾기
    let minDate: Date | null = null;
    let maxDate: Date | null = null;
    
    validSalesData.forEach(item => {
      if (!item.orderDate) return;
      
        const date = new Date(item.orderDate);
      
      // UTC+9 (한국 시간) 적용
      const kstDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      
      if (!minDate || kstDate < minDate) minDate = new Date(kstDate);
      if (!maxDate || kstDate > maxDate) maxDate = new Date(kstDate);
    });
    
    // 날짜 범위가 없는 경우 빈 배열 반환
    if (!minDate || !maxDate) {
      console.log('유효한 날짜 범위가 없음: 빈 배열 반환');
      return [];
    }
    
    // 데이터 처리
    validSalesData.forEach(item => {
      if (!item.orderDate) return;
      
      const date = new Date(item.orderDate);
      const kstDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      let periodKey = '';
      let channelName = normalizeChannelName(item.channel || '기타');
      
      switch (periodType) {
        case 'monthly':
          // 월별 포맷: YYYY-MM
          periodKey = `${kstDate.getFullYear()}-${String(kstDate.getMonth() + 1).padStart(2, '0')}`;
          break;
        
        case 'weekly': {
          // 주차 계산
          const firstDayOfYear = new Date(kstDate.getFullYear(), 0, 1);
          const pastDaysOfYear = Math.floor((kstDate.getTime() - firstDayOfYear.getTime()) / 86400000);
          const weekNumber = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
          
          // YYYY-WXX 형식 (ISO 주차)
          periodKey = `${kstDate.getFullYear()}-W${String(weekNumber).padStart(2, '0')}`;
          break;
        }
        
        default: // 'daily'
          // 일별 형식: YYYY-MM-DD
          periodKey = `${kstDate.getFullYear()}-${String(kstDate.getMonth() + 1).padStart(2, '0')}-${String(kstDate.getDate()).padStart(2, '0')}`;
      }
      
      // 해당 기간 키에 대한 초기화
      if (!periodSales[periodKey]) {
        periodSales[periodKey] = {};
      }
      
      // 채널별 매출 집계
      if (!periodSales[periodKey][channelName]) {
        periodSales[periodKey][channelName] = 0;
      }
      
      // 매출 누적
      const itemSales = item.totalSales !== undefined ? item.totalSales : (item.price || 0) * (item.quantity || 1);
      periodSales[periodKey][channelName] += itemSales;
    });
    
    // 날짜 정렬
    const sortedPeriods = Object.keys(periodSales).sort();
    
    // 결과 배열 생성
    const result = sortedPeriods.map(period => {
      const entry: { [key: string]: string | number } = { period };
      
      // 모든 채널에 대해 값 설정
      Array.from(channelsSet).forEach(channel => {
        entry[channel] = periodSales[period][channel] || 0;
      });
      
      return entry;
    });
    
    console.log(`기간별 매출 차트 데이터 생성 완료: ${result.length}개 기간, ${channelsSet.size}개 채널, 유형: ${periodType}`);
    
    if (result.length > 0) {
      console.log(`첫 번째 항목: ${result[0].period}, 마지막 항목: ${result[result.length-1].period}`);
    }
    
    return result;
  } catch (error) {
    console.error('기간별 매출 데이터 생성 오류:', error);
    return [];
  }
}

// 재구매 통계 계산
export function calculateRepurchaseStats(salesData: SalesItem[]) {
  try {
    if (!salesData || salesData.length === 0) {
      return null;
    }
    
    // 유효한 주문 상태의 데이터만 처리
    const validSalesData = salesData.filter(item => isValidOrderStatus(item.status));
    
    // 고객별 주문 횟수 계산
    const customerOrders: { [customerId: string]: number } = {};
    
    validSalesData.forEach(item => {
      if (!item.customerID) return;
      
      if (!customerOrders[item.customerID]) {
        customerOrders[item.customerID] = 0;
      }
      
      customerOrders[item.customerID]++;
    });
    
    // 고객수 계산
    const totalCustomers = Object.keys(customerOrders).length;
    
    if (totalCustomers === 0) {
      return { firstTime: 0, repeated: 0 };
    }
    
    // 첫 구매와 재구매 고객 구분
    const firstTimeBuyers = Object.values(customerOrders).filter(count => count === 1).length;
    const repeatedBuyers = totalCustomers - firstTimeBuyers;
    
    // 비율 계산
    const firstTimePercentage = (firstTimeBuyers / totalCustomers) * 100;
    const repeatedPercentage = (repeatedBuyers / totalCustomers) * 100;
    
      return {
      firstTime: firstTimePercentage,
      repeated: repeatedPercentage
    };
  } catch (error) {
    console.error('재구매 통계 계산 오류:', error);
    return null;
  }
}

// 주문 및 고객 수 계산
export function calculateOrderAndCustomerCounts(salesData: SalesItem[]) {
  try {
    // 유효한 주문 상태의 데이터만 처리
    const validSalesData = salesData.filter(item => isValidOrderStatus(item.status));
    
    // 구매건수: 주문번호와 관계없이 해당 기간의 주문건수 합산
    const totalOrders = validSalesData.length;
    
    // 구매자수: 주문번호 기준으로 합산 (같은 주문번호는 구매자수 1로 취급)
    const uniqueOrderNumbers = new Set<string>();
    
    validSalesData.forEach(item => {
      if (item.orderNumber) {
        uniqueOrderNumbers.add(item.orderNumber);
      }
    });
    
    return {
      totalOrders,
      totalCustomers: uniqueOrderNumbers.size
    };
  } catch (error) {
    console.error('주문 및 고객 수 계산 오류:', error);
    return { totalOrders: 0, totalCustomers: 0 };
  }
}

// 날짜 범위로 데이터 필터링
export function filterDataByDateRange(salesData: SalesItem[], startDate: Date, endDate: Date): SalesItem[] {
  try {
    if (!salesData || salesData.length === 0) {
      return [];
    }
    
    // 시작일과 종료일 시간 설정 (시작일은 00:00:00, 종료일은 23:59:59)
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    
    // 디버깅 로그
    console.log(`날짜 필터링: ${start.toISOString()} ~ ${end.toISOString()}`);
    
    return salesData.filter(item => {
      if (!item.orderDate) return false;
      
      const orderDate = new Date(item.orderDate);
      
      // 날짜 객체를 새로 생성하여 시간대 문제 방지
      const itemDate = new Date(
        orderDate.getFullYear(),
        orderDate.getMonth(),
        orderDate.getDate(),
        0, 0, 0, 0
      );
      
      // 정확한 날짜 비교
      const isInRange = itemDate >= start && itemDate <= end;
      
      // 디버깅을 위한 추가 로그 (처음 몇 개만)
      if (salesData.indexOf(item) < 5) {
        console.log(`항목 날짜 확인: ${itemDate.toISOString()}, 범위: ${isInRange}, 원본: ${item.orderDate}`);
      }
      
      return isInRange;
    });
  } catch (error) {
    console.error('날짜 범위 필터링 오류:', error);
    return [];
  }
}

// sheet_mappings 테이블에서 매핑 정보 가져오기
export async function fetchSheetMappingsFromDatabase(): Promise<{
  id: string;
  product_id: string;
  original_name: string | null;
  original_option: string | null;
  created_at: string;
}[]> {
  try {
    console.log('시트 매핑 정보 가져오는 중...');
    
    const { data, error } = await supabase
      .from('sheet_mappings')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('시트 매핑 정보 가져오기 오류:', error);
      return [];
    }
    
    console.log(`${data.length}개 시트 매핑 정보 로드됨`);
    
    // null인 original_name을 빈 문자열로 처리
    const processedData = data.map(item => ({
      ...item,
      original_name: item.original_name || ''
    }));
    
    return processedData;
  } catch (error) {
    console.error('시트 매핑 정보 가져오기 오류:', error);
    return [];
  }
}

// 매핑 키 생성 함수 추가 - 상품명과 옵션명을 결합한 키를 생성
function createMappingKey(productName: string, optionName: string | null): string {
  // 옵션명이 null이거나 undefined인 경우 빈 문자열로 처리
  const cleanedOption = optionName || '';
  return `${productName}##${cleanedOption}`;
}

// 매핑 정보 조회 함수 추가 - 상품명과 옵션명을 세트로 매핑 정보 검색
function findMapping(
  sheetMappings: { 
    id: string; 
    product_id: string; 
    original_name: string | null; 
    original_option: string | null; 
    created_at: string 
  }[], 
  productName: string, 
  optionName: string | null
): { product_id: string; original_name: string | null; original_option: string | null } | undefined {
  // 상품명과 옵션명을 정확히 일치시켜 매핑 검색
  // 상품명이 일치하고, 옵션명도 정확히 일치하는 경우에만 매핑 성공
  const mapping = sheetMappings.find(
    m => m.original_name === productName && m.original_option === optionName
  );
  
  return mapping;
}

// 요일별 매출 데이터 생성
export function generateDayOfWeekSalesData(salesData: SalesItem[]) {
  // 유효한 주문 상태의 데이터만 처리
  const validSalesData = salesData.filter(item => isValidOrderStatus(item.status));
  
  // 요일별 초기 데이터 구조 생성
  const dayOfWeekData = [
    { day: 0, dayName: '일', smartstore: 0, ohouse: 0, ytshopping: 0, coupang: 0 },
    { day: 1, dayName: '월', smartstore: 0, ohouse: 0, ytshopping: 0, coupang: 0 },
    { day: 2, dayName: '화', smartstore: 0, ohouse: 0, ytshopping: 0, coupang: 0 },
    { day: 3, dayName: '수', smartstore: 0, ohouse: 0, ytshopping: 0, coupang: 0 },
    { day: 4, dayName: '목', smartstore: 0, ohouse: 0, ytshopping: 0, coupang: 0 },
    { day: 5, dayName: '금', smartstore: 0, ohouse: 0, ytshopping: 0, coupang: 0 },
    { day: 6, dayName: '토', smartstore: 0, ohouse: 0, ytshopping: 0, coupang: 0 }
  ];

  // 각 판매 데이터를 요일별로 집계
  validSalesData.forEach(sale => {
    if (sale.orderDate) {
      try {
        const date = new Date(sale.orderDate);
        const dayOfWeek = date.getDay(); // 0 (일요일) ~ 6 (토요일)
        const channel = normalizeChannelName(sale.channel);
        const totalSales = sale.totalSales || (sale.price * sale.quantity) || 0;

        // 채널이 유효한 경우에만 처리
        if (channel === 'smartstore' || channel === 'ohouse' || 
            channel === 'ytshopping' || channel === 'coupang') {
          dayOfWeekData[dayOfWeek][channel] += totalSales;
        }
  } catch (error) {
        console.error('날짜 처리 오류:', error);
      }
    }
  });

  return dayOfWeekData;
}

// 매핑 시도 로그 함수 (로그 출력 제어)
function logMappingAttempt(index: number, channel: string, productName: string, optionName: string, showDetailed: boolean = false) {
  // 로그 출력 비활성화
  return false;
}

// 상품 정보 가져오기
export async function fetchProductInfoFromDatabase() {
  try {
    console.log('상품 정보 가져오는 중...');
    
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('상품 정보 가져오기 오류:', error);
      return [];
    }
    
    console.log(`${data.length}개 상품 정보 로드됨`);
    return data;
  } catch (error) {
    console.error('상품 정보 가져오기 오류:', error);
    return [];
  }
}

// 상품 가격 정보 가져오기
export async function fetchProductPricesFromDatabase() {
  try {
    console.log('상품 가격 정보 가져오는 중...');
    
    // product_prices 테이블이 없는 것 같으므로 임시로 빈 배열 반환
    console.log('product_prices 테이블이 없습니다. 빈 배열 반환');
    return [];
    
    /* 원래 코드 주석 처리
    const { data, error } = await supabase
      .from('product_prices')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('상품 가격 정보 가져오기 오류:', error);
      return [];
    }
    
    console.log(`${data.length}개 상품 가격 정보 로드됨`);
    return data;
    */
  } catch (error) {
    console.error('상품 가격 정보 가져오기 오류:', error);
    return [];
  }
}