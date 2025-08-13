import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx-populate';
import { createServiceClient } from '@/lib/supabase';

// Excel 날짜를 ISO 형식으로 변환하는 함수
function convertExcelDateToISO(excelDate: any): string | null {
  if (!excelDate) return null;
  
  console.log('날짜 변환 시작:', { value: excelDate, type: typeof excelDate });
  
  // 숫자인 경우 Excel 날짜로 처리
  if (typeof excelDate === 'number') {
    try {
      // Excel 날짜는 1900년 1월 1일부터의 일수
      // 1900년 1월 1일이 1로 시작하므로 25569를 빼야 함 (1970년 1월 1일 기준)
      const utcDays = Math.floor(excelDate - 25569);
      const utcValue = utcDays * 86400;
      const dateInfo = new Date(utcValue * 1000);
      
      console.log('Excel 숫자 날짜 변환:', {
        original: excelDate,
        utcDays: utcDays,
        utcValue: utcValue,
        dateInfo: dateInfo.toISOString()
      });
      
      // 한국 시간대로 변환 (UTC+9)
      const koreanTime = new Date(dateInfo.getTime() + (9 * 60 * 60 * 1000));
      
      console.log('한국 시간 변환:', {
        original: dateInfo.toISOString(),
        korean: koreanTime.toISOString()
      });
      
      return koreanTime.toISOString();
    } catch (error) {
      console.error('Excel 날짜 변환 오류:', error, '원본 값:', excelDate);
      return null;
    }
  }
  
  // 문자열인 경우 기존 로직 유지
  if (typeof excelDate === 'string') {
    try {
      // 이미 ISO 형식인지 확인
      if (excelDate.includes('T') || excelDate.includes('-')) {
        const date = new Date(excelDate);
        if (!isNaN(date.getTime())) {
          console.log('이미 ISO 형식:', excelDate);
          return date.toISOString();
        }
      }
      
      // 한국 날짜 형식 처리 (YYYY-MM-DD HH:mm:ss)
      const koreanDateMatch = excelDate.match(/^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2}):(\d{2})$/);
      if (koreanDateMatch) {
        const [, year, month, day, hour, minute, second] = koreanDateMatch;
        const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), 
                             parseInt(hour), parseInt(minute), parseInt(second));
        console.log('한국 날짜 형식 변환:', { original: excelDate, result: date.toISOString() });
        return date.toISOString();
      }
      
      // 일반적인 날짜 형식 처리
      const date = new Date(excelDate);
      if (!isNaN(date.getTime())) {
        console.log('일반 날짜 형식 변환:', { original: excelDate, result: date.toISOString() });
        return date.toISOString();
      }
      
      console.error('날짜 형식을 인식할 수 없음:', excelDate);
      return null;
    } catch (error) {
      console.error('문자열 날짜 변환 오류:', error, '원본 값:', excelDate);
      return null;
    }
  }
  
  console.error('지원하지 않는 날짜 타입:', typeof excelDate, excelDate);
  return null;
}

// 기본 매핑 정의
const DEFAULT_MAPPINGS = {
  smartstore: {
    '주문번호': 'order_number',
    '상품주문번호': 'product_order_number',
    '주문일시': 'order_date',
    '주문결제완료일': 'order_date',
    '발주일': 'order_date',
    '주문상태': 'status',
    '수량': 'quantity',
    '상품명': 'product_name',
    '옵션정보': 'product_option',
    '구매자명': 'customer_name',
    '구매자ID': 'customer_phone',
    '상품번호': 'product_id',
    '수취인명': 'recipient_name',
    '클레임상태': 'claim_status'
  },
  ohouse: {
    '주문번호': 'order_number',
    '주문일시': 'order_date',
    '주문일': 'order_date',
    '주문결제완료일': 'order_date',
    '발주일': 'order_date',
    '주문상태': 'status',
    '수량': 'quantity',
    '상품명': 'product_name',
    '옵션명': 'product_option',
    '주문자명': 'customer_name',
    '주문자 연락처': 'customer_phone',
    '수취인명': 'recipient_name',
    '수취인 연락처': 'recipient_phone',
    '수취인 우편번호': 'recipient_zipcode',
    '수취인 주소': 'recipient_address',
    '수취인 주소상세': 'recipient_address_detail',
    '운송장번호': 'tracking_number',
    '배송정보(택배사)': 'courier_company',
    '배송메모': 'delivery_message',
    '구매확정일': 'purchase_confirmation_date',
    '판매가': 'total_price',
    '배송비': 'shipping_cost'
  },
  ohouse2: {
    '주문번호': 'order_number',
    '주문일시': 'order_date',
    '주문일': 'order_date',
    '주문결제완료일': 'order_date',
    '발주일': 'order_date',
    '주문상태': 'status',
    '수량': 'quantity',
    '상품명': 'product_name',
    '옵션명': 'product_option',
    '주문자명': 'customer_name',
    '주문자 연락처': 'customer_phone',
    '수취인명': 'recipient_name',
    '수취인 연락처': 'recipient_phone',
    '수취인 우편번호': 'recipient_zipcode',
    '수취인 주소': 'recipient_address',
    '수취인 주소상세': 'recipient_address_detail',
    '운송장번호': 'tracking_number',
    '배송정보(택배사)': 'courier_company',
    '배송메모': 'delivery_message',
    '구매확정일': 'purchase_confirmation_date',
    '판매가': 'total_price',
    '배송비': 'shipping_cost'
  },
  YTshopping: {
    '주문번호': 'order_number',
    '품목별 주문번호': 'product_order_number',
    '주문일시': 'order_date',
    '주문일': 'order_date',
    '주문결제완료일': 'order_date',
    '발주일': 'order_date',
    '주문상태': 'status',
    '수량': 'quantity',
    '주문상품명': 'product_name',
    '주문상품명(옵션포함)': 'product_option',
    '수령인': 'customer_name',
    '수령인 휴대전화': 'customer_phone',
    '수령인 주소': 'recipient_address',
    '수령인 연락처': 'recipient_phone',
    '운송장번호': 'tracking_number',
    '배송업체': 'courier_company',
    '배송메모': 'delivery_message',
    '판매가': 'total_price',
    '배송비': 'shipping_cost'
  },
  coupang: {
    '주문번호': 'order_number',
    '주문일': 'order_date',
    '주문결제완료일': 'order_date',
    '발주일': 'order_date',
    '구매수(수량)': 'quantity',
    '등록상품명': 'product_name',
    '등록옵션명': 'product_option',
    '구매자': 'customer_name',
    '구매자전화번호': 'customer_phone',
    '수취인명': 'recipient_name',
    '수취인연락처': 'recipient_phone',
    '수취인주소': 'recipient_address',
    '운송장번호': 'tracking_number',
    '배송업체': 'courier_company',
    '배송메모': 'delivery_message',
    '판매가': 'total_price',
    '배송비': 'shipping_cost'
  }
};

const getDefaultMapping = (channel: string) => {
  // 채널명 대소문자 처리
  const normalizedChannel = channel.toLowerCase();
  let mapping = DEFAULT_MAPPINGS[channel as keyof typeof DEFAULT_MAPPINGS];
  
  // 대소문자 매칭이 안 되면 소문자로 시도
  if (!mapping && normalizedChannel === 'ytshopping') {
    mapping = DEFAULT_MAPPINGS['YTshopping'];
  }
  
  console.log('getDefaultMapping 호출:', {
    originalChannel: channel,
    normalizedChannel: normalizedChannel,
    foundMapping: !!mapping,
    mappingKeys: mapping ? Object.keys(mapping) : []
  });
  
  return mapping || {};
};

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const channel = formData.get('channel') as string;
    const password = formData.get('password') as string;

    if (!file) {
      return NextResponse.json({ error: '파일이 필요합니다.' }, { status: 400 });
    }

    if (!channel) {
      return NextResponse.json({ error: '채널 정보가 필요합니다.' }, { status: 400 });
    }

          console.log('파일 처리 시작:', {
        fileName: file.name,
        fileSize: file.size,
        channel: channel,
        hasPassword: !!password,
        password: password || '없음'
      });

    try {
      const buffer = await file.arrayBuffer();
      let workbook;

      if (password) {
        workbook = await XLSX.fromDataAsync(buffer, { 
          password,
          dateNF: 'yyyy/mm/dd hh:mm' // 날짜 형식 지정
        });
      } else {
        workbook = await XLSX.fromDataAsync(buffer, {
          dateNF: 'yyyy/mm/dd hh:mm' // 날짜 형식 지정
        });
      }

      // 첫 번째 시트 사용
      const worksheet = workbook.sheet(0);
      if (!worksheet) {
        return NextResponse.json({ error: '시트를 찾을 수 없습니다.' }, { status: 400 });
      }

      const range = worksheet.usedRange();
      if (!range) {
        return NextResponse.json({ error: '데이터가 없는 시트입니다.' }, { status: 400 });
      }

      const rows = range.value();
      if (!rows || rows.length === 0) {
        return NextResponse.json({ error: '데이터가 없습니다.' }, { status: 400 });
      }

      const headers = rows[0];
      const dataRows = rows.slice(1);

      // 헤더에서 undefined 값 제거
      const cleanHeaders = headers.filter((header: any) => header !== undefined && header !== null && header !== '');
      
      console.log('데이터 읽기 완료:', {
        totalRows: dataRows.length,
        originalHeaders: headers,
        cleanHeaders: cleanHeaders,
        sheetName: worksheet.name(),
        channel: channel
      });

      // 채널별 헤더 분석 로깅 추가
      if (channel === 'ohouse' || channel === 'ohouse2' || channel === 'YTshopping') {
        console.log(`${channel} 파일 헤더 분석:`, {
          allHeaders: cleanHeaders,
          headerCount: cleanHeaders.length,
          dateHeaders: cleanHeaders.filter((h: string) => h.includes('일시') || h.includes('일') || h.includes('날짜')),
          orderHeaders: cleanHeaders.filter((h: string) => h.includes('주문')),
          sampleHeaders: cleanHeaders.slice(0, 10)
        });
      }

      // 쿠팡 파일의 경우 헤더를 더 자세히 확인
      if (channel === 'coupang') {
        console.log('쿠팡 파일 헤더 분석:', {
          allHeaders: cleanHeaders,
          headerCount: cleanHeaders.length,
          orderNumberHeaders: cleanHeaders.filter((h: string) => h.includes('주문') || h.includes('order')),
          sampleHeaders: cleanHeaders.slice(0, 10)
        });
      }

      // 첫 번째 데이터 행 확인
      if (dataRows.length > 0) {
        console.log('첫 번째 데이터 행:', {
          row: dataRows[0],
          rowLength: dataRows[0].length,
          hasData: dataRows[0].some((cell: any) => cell && cell !== ''),
          sampleValues: dataRows[0].slice(0, 5) // 처음 5개 값만 확인
        });
      }

      // 주문번호 인덱스 찾기 (채널별로 다름)
      let orderNumberIndex = -1;
      if (channel === 'smartstore') {
        // 스마트스토어는 '주문번호' 컬럼을 찾되, '상품주문번호'가 아닌 것을 찾음
        orderNumberIndex = cleanHeaders.findIndex((header: string) => 
          header === '주문번호'
        );
      } else if (channel === 'coupang') {
        // 쿠팡은 여러 가능한 컬럼명을 시도
        const possibleOrderNumberHeaders = ['주문번호', '주문 번호', '주문번호', 'Order Number', 'order_number'];
        for (const header of possibleOrderNumberHeaders) {
          const index = cleanHeaders.findIndex((h: string) => h === header);
          if (index !== -1) {
            orderNumberIndex = index;
            break;
          }
        }
        
        // 만약 찾지 못했다면 '주문'이 포함된 컬럼을 찾기
        if (orderNumberIndex === -1) {
          orderNumberIndex = cleanHeaders.findIndex((header: string) => 
            header.includes('주문') && !header.includes('상품주문')
          );
        }
      } else {
        orderNumberIndex = cleanHeaders.findIndex((header: string) => header === '주문번호');
      }

      console.log('주문번호 인덱스 찾기 결과:', {
        channel: channel,
        orderNumberIndex: orderNumberIndex,
        headers: cleanHeaders,
        foundHeader: orderNumberIndex >= 0 ? cleanHeaders[orderNumberIndex] : null
      });

      if (orderNumberIndex === -1) {
        return NextResponse.json({ 
          error: '주문번호 컬럼을 찾을 수 없습니다.',
          availableHeaders: cleanHeaders,
          channel: channel
        }, { status: 400 });
      }

      // 빈 행 필터링 - 주문번호가 있는 행만 유효한 데이터로 간주
      const validDataRows = dataRows.filter((row: any[], index: number) => {
        const orderNumber = row[orderNumberIndex];
        const hasOrderNumber = orderNumber && 
                              orderNumber !== '' && 
                              orderNumber !== null && 
                              orderNumber !== undefined &&
                              String(orderNumber).trim() !== '';
        
        if (!hasOrderNumber) {
          console.log(`빈 행 필터링됨 (행 ${index + 2}):`, {
            orderNumber: orderNumber,
            orderNumberType: typeof orderNumber,
            orderNumberLength: String(orderNumber).length
          });
        }
        
        return hasOrderNumber;
      });

      console.log('데이터 필터링 완료:', {
        originalRows: dataRows.length,
        validRows: validDataRows.length,
        filteredRows: dataRows.length - validDataRows.length
      });

      // 사용자 설정 매핑 정보 가져오기
      let userMapping = {};
      try {
        const mappingResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/upload/save-mapping?channel=${channel}`);
        if (mappingResponse.ok) {
          const mappingData = await mappingResponse.json();
          if (mappingData.success && mappingData.mapping) {
            userMapping = mappingData.mapping;
          }
        }
      } catch (error) {
        // 사용자 매핑 로드 실패 시 기본 매핑 사용
      }

      // 매핑 정보 생성 (사용자 설정 우선, 기본 매핑은 fallback)
      const defaultMapping = getDefaultMapping(channel);
      const mapping = {};
      
      cleanHeaders.forEach(header => {
        // 사용자 설정 매핑 우선 사용
        const userMappedField = userMapping[header];
        // 기본 매핑은 fallback으로 사용
        const defaultMappedField = defaultMapping[header];
        // 최종 매핑 결정 - 매핑된 필드명이 실제 DB 컬럼명과 일치하도록 수정
        const mappedField = userMappedField || defaultMappedField;
        
        // 매핑된 필드명이 있는 경우에만 매핑 정보에 추가
        if (mappedField && mappedField !== header) {
          mapping[header] = mappedField;
        } else {
          // 매핑되지 않은 경우 원본 헤더명 사용
          mapping[header] = header;
        }
      });
      


      // 데이터 변환 및 전처리 (필터링된 유효한 데이터만 사용)
      const processedData = validDataRows.map((row: any[], index: number) => {
        const processedRow: any = {};
        
        cleanHeaders.forEach((header: string, colIndex: number) => {
          let value = row[colIndex];
          
          // 날짜 컬럼인 경우 변환
          if (header === '주문일시' || 
              header === '주문일' ||
              header.includes('일시') || 
              header.includes('날짜')) {
            if (typeof value === 'number') {
              // Excel 날짜 숫자를 실제 날짜로 변환
              try {
                // Excel 날짜는 1900년 1월 1일부터의 일수
                // 1900년 1월 1일이 1로 시작하므로 25569를 빼야 함 (1970년 1월 1일 기준)
                const utcDays = Math.floor(value - 25569);
                const utcValue = utcDays * 86400;
                const dateInfo = new Date(utcValue * 1000);
                
                // 소수점 부분(시간) 처리
                const decimalPart = value - Math.floor(value);
                const totalSeconds = decimalPart * 24 * 60 * 60; // 하루를 초로 변환
                const hours = Math.floor(totalSeconds / 3600);
                const minutes = Math.floor((totalSeconds % 3600) / 60);
                const seconds = Math.floor(totalSeconds % 60);
                
                // 한국 시간대로 변환 (UTC+9)
                const koreanTime = new Date(dateInfo.getTime() + (9 * 60 * 60 * 1000));
                
                // YYYY/MM/DD HH:mm 형식으로 변환
                const year = koreanTime.getFullYear();
                const month = String(koreanTime.getMonth() + 1).padStart(2, '0');
                const day = String(koreanTime.getDate()).padStart(2, '0');
                const finalHours = String(hours).padStart(2, '0');
                const finalMinutes = String(minutes).padStart(2, '0');
                
                value = `${year}/${month}/${day} ${finalHours}:${finalMinutes}`;
                
                console.log('날짜 변환:', { 
                  header: header,
                  original: row[colIndex], 
                  converted: value,
                  decimalPart: decimalPart,
                  hours: hours,
                  minutes: minutes,
                  channel: channel
                });
              } catch (error) {
                console.error('날짜 변환 오류:', error, '원본 값:', value);
                value = null;
              }
            }
          }
          
          // 빈 값 처리
          if (value === undefined || value === null || value === '') {
            value = null;
          }
          
          // 매핑된 필드명으로 저장
          const mappedField = mapping[header];
          
          // 매핑 디버깅 (처음 5개 행만)
          if (index < 5) {
            console.log(`행 ${index + 1} - ${header}:`, {
              originalValue: value,
              mappedField: mappedField,
              isMapped: mappedField && mappedField !== header,
              finalField: mappedField && mappedField !== header ? mappedField : header,
              mappingExists: !!mapping[header]
            });
          }
          
          // 매핑된 필드명이 있고, 실제 DB 컬럼명과 일치하는 경우에만 저장
          if (mappedField && mappedField !== header) {
            // 매핑된 필드명이 실제 DB 컬럼명인지 확인
            const validDbColumns = [
              'order_number', 'product_order_number', 'order_date', 'status', 
              'product_id', 'product_name', 'product_option', 'quantity', 
              'unit_price', 'total_price', 'customer_name', 'customer_phone', 'recipient_name',
              'recipient_phone', 'recipient_address', 'recipient_zipcode',
              'tracking_number', 'courier_company', 'delivery_message',
              'shipping_cost', 'assembly_cost', 'settlement_amount', 'claim_status',
              'purchase_confirmation_date', 'shipment_date', 'payment_completion_date',
              'buyer_id', 'payment_method', 'customs_clearance_code'
            ];
            
            if (validDbColumns.includes(mappedField)) {
              processedRow[mappedField] = value;
            } else {
              // 매핑된 필드명이 유효하지 않은 경우 원본 사용
              processedRow[header] = value;
            }
          } else {
            // 매핑되지 않은 경우 원본 필드명 사용
            processedRow[header] = value;
            console.log(`원본 사용: ${header} = ${value}`);
          }
        });
        
        return processedRow;
      });

      // 처리된 데이터 샘플 로깅
      if (processedData.length > 0) {
        console.log('처리된 데이터 샘플:', {
          channel: channel,
          sampleRow: processedData[0],
          hasOrderDate: !!processedData[0].order_date,
          hasCustomerName: !!processedData[0].customer_name,
          hasCustomerPhone: !!processedData[0].customer_phone,
          hasRecipientName: !!processedData[0].recipient_name,
          hasRecipientPhone: !!processedData[0].recipient_phone,
          hasRecipientAddress: !!processedData[0].recipient_address,
          hasRecipientZipcode: !!processedData[0].recipient_zipcode,
          hasTrackingNumber: !!processedData[0].tracking_number,
          hasCourierCompany: !!processedData[0].courier_company,
          hasDeliveryMessage: !!processedData[0].delivery_message,
          hasTotalPrice: !!processedData[0].total_price,
          hasShippingCost: !!processedData[0].shipping_cost
        });
        
        // 첫 번째 행의 모든 필드 확인
        console.log('첫 번째 행 상세 데이터:', {
          order_date: processedData[0].order_date,
          customer_name: processedData[0].customer_name,
          customer_phone: processedData[0].customer_phone,
          recipient_name: processedData[0].recipient_name,
          recipient_phone: processedData[0].recipient_phone,
          recipient_address: processedData[0].recipient_address,
          recipient_zipcode: processedData[0].recipient_zipcode,
          tracking_number: processedData[0].tracking_number,
          courier_company: processedData[0].courier_company,
          delivery_message: processedData[0].delivery_message,
          total_price: processedData[0].total_price,
          shipping_cost: processedData[0].shipping_cost
        });
        

      }

      // 중복 분석 (채널별로 다른 기준 적용)
      
      // 중복 분석 - 매핑 정보를 전달하여 중복 분석
      const duplicates = analyzeDuplicates(validDataRows, channel, cleanHeaders, mapping);

      // 미리보기 데이터 (처음 10개) - 원본 헤더명 유지
      const preview = validDataRows.slice(0, 10).map((row: any[], index: number) => {
        const previewRow: any = {};
        
        cleanHeaders.forEach((header: string, colIndex: number) => {
          let value = row[colIndex];
          
          // 날짜 컬럼인 경우 변환 (정확한 조건)
          if (header === '주문일시' || 
              header === '주문일' ||
              header === '출고일(발송일)' ||
              header === '배송완료일' ||
              header === '구매확정일자' ||
              header === '주문시 출고예정일' ||
              header === '분리배송 출고예정일' ||
              header === '발주일' ||
              header.includes('일시') || 
              (header.includes('날짜') && !header.includes('번호')) ||
              (header.includes('출고') && header.includes('일')) ||
              (header.includes('배송') && header.includes('일')) ||
              (header.includes('완료') && header.includes('일')) ||
              (header.includes('확정') && header.includes('일')) ||
              (header.includes('발주') && header.includes('일'))) {
            if (typeof value === 'number') {
              try {
                const utcDays = Math.floor(value - 25569);
                const utcValue = utcDays * 86400;
                const dateInfo = new Date(utcValue * 1000);
                
                const decimalPart = value - Math.floor(value);
                const totalSeconds = decimalPart * 24 * 60 * 60;
                const hours = Math.floor(totalSeconds / 3600);
                const minutes = Math.floor((totalSeconds % 3600) / 60);
                
                const koreanTime = new Date(dateInfo.getTime() + (9 * 60 * 60 * 1000));
                
                const year = koreanTime.getFullYear();
                const month = String(koreanTime.getMonth() + 1).padStart(2, '0');
                const day = String(koreanTime.getDate()).padStart(2, '0');
                const finalHours = String(hours).padStart(2, '0');
                const finalMinutes = String(minutes).padStart(2, '0');
                
                value = `${year}/${month}/${day} ${finalHours}:${finalMinutes}`;
              } catch (error) {
                console.error('미리보기 날짜 변환 오류:', error, '헤더:', header, '값:', value);
                value = null;
              }
            }
          }
          
          // 빈 값 처리
          if (value === undefined || value === null || value === '') {
            value = null;
          }
          
          // 원본 헤더명으로 저장 (미리보기용)
          previewRow[header] = value;
        });
        
        return previewRow;
      });



      return NextResponse.json({
        success: true,
        data: {
          headers: cleanHeaders,
          rows: processedData,
          preview,
          totalRows: processedData.length,
          duplicates: duplicates
        }
      });

    } catch (error: any) {
      console.error('파일 처리 오류:', error);
      
      // 비밀번호 관련 오류 처리
      if (error.message?.includes('PASSWORD_REQUIRED')) {
        return NextResponse.json({ 
          error: '파일이 비밀번호로 보호되어 있습니다. 비밀번호를 입력해주세요.',
          requiresPassword: true 
        }, { status: 400 });
      }
      
      if (error.message?.includes('INVALID_PASSWORD')) {
        return NextResponse.json({ 
          error: '비밀번호가 올바르지 않습니다.',
          requiresPassword: true 
        }, { status: 400 });
      }
      
      if (error.message?.includes('FILE_CORRUPTED')) {
        return NextResponse.json({ 
          error: '파일이 손상되었거나 읽을 수 없습니다.' 
        }, { status: 400 });
      }
      
      return NextResponse.json({ 
        error: '파일 처리 중 오류가 발생했습니다.',
        details: error.message 
      }, { status: 500 });
    }

  } catch (error) {
    console.error('API 오류:', error);
    console.error('오류 상세 정보:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace',
      type: typeof error
    });
    return NextResponse.json({ 
      error: '서버 오류가 발생했습니다.',
      details: error instanceof Error ? error.message : '알 수 없는 오류'
    }, { status: 500 });
  }
}

// 중복 분석 함수 (채널별로 다른 기준 적용)
function analyzeDuplicates(data: any[], channel: string, headers: string[], mapping: any = {}) {
  console.log('중복 분석 시작:', {
    channel: channel,
    dataLength: data.length,
    headers: headers,
    sampleRow: data.length > 0 ? data[0] : null
  });

  const orderNumberIndex = headers.findIndex(header => header === '주문번호');
  
  if (orderNumberIndex === -1) {
    console.log('주문번호 컬럼을 찾을 수 없음. 사용 가능한 컬럼:', headers);
    return {
      orderNumberDuplicates: 0,
      orderNumberDuplicateList: [],
      exactDuplicates: 0,
      exactDuplicateList: []
    };
  }

  // 주문번호별 그룹화 (빈 주문번호 제외)
  const orderGroups = new Map();
  data.forEach((row, index) => {
    const orderNumber = row[orderNumberIndex];
    // 빈 주문번호 필터링
    if (orderNumber && 
        orderNumber !== '' && 
        orderNumber !== null && 
        orderNumber !== undefined &&
        String(orderNumber).trim() !== '') {
      if (!orderGroups.has(orderNumber)) {
        orderGroups.set(orderNumber, []);
      }
      orderGroups.get(orderNumber).push(index);
    }
  });

  // 중복 주문번호 찾기
  const orderNumberDuplicates = Array.from(orderGroups.entries())
    .filter(([orderNumber, indices]) => (indices as number[]).length > 1)
    .map(([orderNumber, indices]) => ({
      orderNumber,
      count: (indices as number[]).length,
      indices: indices as number[]
    }));

  // 정확한 중복 찾기 (채널별로 다른 기준)
  const exactDuplicates = new Set();
  const exactDuplicateList: any[] = [];

  console.log('중복 분석 - 채널 확인:', { channel, isSmartstoreOrYT: channel === 'smartstore' || channel === 'YTshopping' || channel === 'ytshopping' });
  
  if (channel === 'smartstore' || channel === 'YTshopping' || channel === 'ytshopping') {
    // 스마트스토어와 유튜브쇼핑: 상품주문번호, 주문번호, 상품명, 옵션정보가 모두 같아야 중복
    console.log('스마트스토어/유튜브쇼핑 중복 분석 시작');
    const seen = new Set();
    const productOrderNumberIndex = headers.findIndex(header => 
      channel === 'smartstore' ? header === '상품주문번호' : header === '품목별 주문번호'
    );
    const productNameIndex = headers.findIndex(header => 
      channel === 'smartstore' ? header === '상품명' : header === '주문상품명'
    );
    const optionIndex = headers.findIndex(header => 
      channel === 'smartstore' ? header === '옵션정보' : header === '주문상품명(옵션포함)'
    );
    
    console.log('유튜브쇼핑 컬럼 찾기:', {
      channel,
      headers,
      productOrderNumberIndex,
      productNameIndex,
      optionIndex,
      foundProductOrderNumber: productOrderNumberIndex >= 0 ? headers[productOrderNumberIndex] : null,
      foundProductName: productNameIndex >= 0 ? headers[productNameIndex] : null,
      foundOption: optionIndex >= 0 ? headers[optionIndex] : null
    });
    
    data.forEach((row, index) => {
      const orderNumber = row[orderNumberIndex] || '';
      const productOrderNumber = productOrderNumberIndex >= 0 ? row[productOrderNumberIndex] || '' : '';
      const productName = productNameIndex >= 0 ? row[productNameIndex] || '' : '';
      const option = optionIndex >= 0 ? row[optionIndex] || '' : '';
      
      // 빈 주문번호는 중복 분석에서 제외
      if (!orderNumber || 
          orderNumber === '' || 
          orderNumber === null || 
          orderNumber === undefined ||
          String(orderNumber).trim() === '') {
        return; // 이 행은 중복 분석에서 제외
      }
      
      const key = `${orderNumber}-${productOrderNumber}-${productName}-${option}`;
      
      // 디버깅: 첫 번째 행의 키 정보 출력
      if (index === 0) {
        console.log(`${channel} 중복 체크 - 첫 번째 행:`, {
          orderNumber: orderNumber,
          productOrderNumber: productOrderNumber,
          productName: productName,
          option: option,
          keyLength: key.length,
          fullKey: key,
          indices: {
            orderNumberIndex: orderNumberIndex,
            productOrderNumberIndex: productOrderNumberIndex,
            productNameIndex: productNameIndex,
            optionIndex: optionIndex
          },
          rowData: row,
          headers: headers
        });
      }
      
      if (seen.has(key)) {
        exactDuplicates.add(key);
        exactDuplicateList.push({
          orderNumber: orderNumber,
          productOrderNumber: productOrderNumber,
          productName: productName,
          option: option,
          rowIndex: index
        });
        
        // 중복 발견 시 로그 출력
        console.log(`${channel} 정확한 중복 발견:`, {
          orderNumber: orderNumber,
          productOrderNumber: productOrderNumber,
          productName: productName,
          option: option,
          rowIndex: index,
          orderNumberType: typeof orderNumber,
          orderNumberLength: orderNumber ? orderNumber.length : 0
        });
      } else {
        seen.add(key);
      }
      
      // 디버깅: 중복 분석 진행 상황 로그
      if (index % 100 === 0) {
        console.log(`${channel} 중복 분석 진행: ${index}/${data.length}, 현재 중복: ${exactDuplicates.size}`);
      }
    });
  } else {
    // 다른 채널들: 주문번호, 상품명, 옵션명이 같아야 중복
    console.log('다른 채널 중복 분석 시작:', { channel });
    const seen = new Set();
    
    // 쿠팡의 경우 다른 컬럼명 사용
    let productNameIndex, optionIndex;
    if (channel === 'coupang') {
      productNameIndex = headers.findIndex(header => header === '등록상품명');
      optionIndex = headers.findIndex(header => header === '등록옵션명');
    } else {
      productNameIndex = headers.findIndex(header => header === '상품명');
      optionIndex = headers.findIndex(header => header === '옵션명');
    }
    
    console.log('다른 채널 중복 분석 시작:', { channel, dataLength: data.length });
    data.forEach((row, index) => {
      const orderNumber = row[orderNumberIndex] || '';
      const productName = productNameIndex >= 0 ? row[productNameIndex] || '' : '';
      const option = optionIndex >= 0 ? row[optionIndex] || '' : '';
      
      // 빈 주문번호는 중복 분석에서 제외
      if (!orderNumber || 
          orderNumber === '' || 
          orderNumber === null || 
          orderNumber === undefined ||
          String(orderNumber).trim() === '') {
        return; // 이 행은 중복 분석에서 제외
      }
      
      const key = `${orderNumber}-${productName}-${option}`;
      
              // 디버깅: 첫 번째 행의 키 정보 출력
        if (index === 0) {
          console.log('다른 채널 중복 체크 - 첫 번째 행:', {
            orderNumber: orderNumber,
            productName: productName,
            option: option,
            keyLength: key.length,
            fullKey: key,
            indices: {
              orderNumberIndex: orderNumberIndex,
              productNameIndex: productNameIndex,
              optionIndex: optionIndex
            },
            rowData: row,
            headers: headers
          });
        }
      
      if (seen.has(key)) {
        exactDuplicates.add(key);
        exactDuplicateList.push({
          orderNumber: orderNumber,
          productName: productName,
          option: option,
          rowIndex: index
        });
        
        // 중복 발견 시 로그 출력
        console.log('다른 채널 정확한 중복 발견:', {
          orderNumber: orderNumber,
          productName: productName,
          option: option,
          rowIndex: index,
          orderNumberType: typeof orderNumber,
          orderNumberLength: orderNumber ? orderNumber.length : 0
        });
      } else {
        seen.add(key);
      }
    });
  }

  const result = {
    orderNumberDuplicates: orderNumberDuplicates.length,
    orderNumberDuplicateList: orderNumberDuplicates,
    exactDuplicates: exactDuplicates.size,
    exactDuplicateList: exactDuplicateList,
    exactDuplicateOrderNumbers: Array.from(new Set(exactDuplicateList.map(item => item.orderNumber).filter(num => num && String(num).trim() !== '')))
  };

  console.log('중복 분석 결과:', {
    channel: channel,
    orderNumberDuplicates: result.orderNumberDuplicates,
    exactDuplicates: result.exactDuplicates,
    exactDuplicateOrderNumbers: result.exactDuplicateOrderNumbers,
    exactDuplicateList: result.exactDuplicateList,
    exactDuplicateListLength: result.exactDuplicateList.length,
    sampleExactDuplicate: result.exactDuplicateList.length > 0 ? result.exactDuplicateList[0] : null
  });

  return result;
} 