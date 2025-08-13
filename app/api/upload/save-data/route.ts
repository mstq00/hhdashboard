import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

const BATCH_SIZE = 200;

// 재시도 함수
async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = 5,
  delay: number = 1000
): Promise<T> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      console.error(`시도 ${attempt}/${maxRetries} 실패:`, error);
      
      if (attempt === maxRetries) {
        throw error;
      }
      
      // 지수 백오프로 대기 시간 증가 (1초, 2초, 4초, 8초)
      const backoffDelay = delay * Math.pow(2, attempt - 1);
      console.log(`${backoffDelay}ms 후 재시도...`);
      await new Promise(resolve => setTimeout(resolve, backoffDelay));
    }
  }
  throw new Error('모든 재시도 실패');
}

// 데이터베이스 스키마에 존재하는 컬럼만 필터링하는 함수
function filterValidColumns(item: any): any {
  // orders 테이블의 실제 컬럼들 (DB 스키마에 맞게 수정)
  const validColumns = [
    'id',
    'user_id',
    'channel',
    'order_number',
    'product_order_number',
    'order_date',
    'status',
    'product_id',
    'product_name',
    'product_option',
    'quantity',
    'unit_price',
    'total_price',
    'customer_name',
    'customer_phone',
    'recipient_name',
    'recipient_phone',
    'recipient_address',
    'recipient_zipcode',
    'tracking_number',
    'courier_company',
    'delivery_message',
    'shipping_cost',
    'assembly_cost',
    'settlement_amount',
    'claim_status',
    'purchase_confirmation_date',
    'shipment_date',
    'payment_completion_date',
    'buyer_id',
    'payment_method',
    'customs_clearance_code',
    'created_at',
    'updated_at'
  ];
  
  const filtered: any = {};
  Object.keys(item).forEach(key => {
    if (validColumns.includes(key)) {
      filtered[key] = item[key];
    } else {
      // 유효하지 않은 컬럼은 로그로 기록
      console.log(`필터링된 컬럼: ${key} = ${item[key]}`);
    }
  });
  
  return filtered;
}

// Excel 날짜를 ISO 문자열로 변환하는 함수
function convertExcelDateToISO(excelDate: any): string | null {
  if (!excelDate || excelDate === '' || excelDate === null || excelDate === undefined) {
    return null;
  }
  
  // 이미 문자열인 경우 그대로 반환
  if (typeof excelDate === 'string') {
    // 이미 ISO 형식인지 확인
    if (excelDate.includes('T') || excelDate.includes('-')) {
      const date = new Date(excelDate);
      if (!isNaN(date.getTime())) {
        return date.toISOString();
      }
    }
    return excelDate;
  }
  
  // 숫자인 경우 Excel 날짜로 변환
  if (typeof excelDate === 'number') {
    try {
      // Excel 날짜는 1900년 1월 1일부터의 일수
      // 1900년 1월 1일이 1로 시작하므로 25569를 빼야 함 (1970년 1월 1일 기준)
      const utcDays = Math.floor(excelDate - 25569);
      const utcValue = utcDays * 86400;
      const dateInfo = new Date(utcValue * 1000);
      
      // 소수점 부분(시간) 처리
      const decimalPart = excelDate - Math.floor(excelDate);
      const totalSeconds = decimalPart * 24 * 60 * 60; // 하루를 초로 변환
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = Math.floor(totalSeconds % 60);
      
      // 한국 시간대로 변환 (UTC+9)
      const koreanTime = new Date(dateInfo.getTime() + (9 * 60 * 60 * 1000));
      
      // 시간 정보 추가
      koreanTime.setHours(hours, minutes, seconds);
      
      console.log('Excel 날짜 변환:', {
        original: excelDate,
        utcDays: utcDays,
        utcValue: utcValue,
        dateInfo: dateInfo.toISOString(),
        decimalPart: decimalPart,
        hours: hours,
        minutes: minutes,
        seconds: seconds,
        koreanTime: koreanTime.toISOString()
      });
      
      return koreanTime.toISOString();
    } catch (error) {
      console.error('날짜 변환 오류:', error, '원본 값:', excelDate);
      return null;
    }
  }
  
  console.error('지원하지 않는 날짜 타입:', typeof excelDate, excelDate);
  return null;
}

// 한글 필드명을 영문 필드명으로 변환하는 함수
function convertKoreanToEnglishFields(item: any): any {
  const fieldMapping: Record<string, string> = {
    // 주문 관련
    '주문번호': 'order_number',
    '상품주문번호': 'product_order_number',
    '주문일시': 'order_date',
    '주문결제완료일': 'order_date',
    '발주일': 'order_date',
    '주문상태': 'status',
    '주문수량': 'quantity',
    
    // 상품 관련
    '상품명': 'product_name',
    '옵션정보': 'product_option',
    '옵션명': 'product_option',
    '상품번호': 'product_id',
    '상품코드': 'product_id',
    
    // 고객 관련
    '구매자명': 'customer_name',
    '구매자ID': 'customer_phone',
    '구매자연락처': 'customer_phone',
    '주문자': 'customer_name',
    '주문자연락처': 'customer_phone',
    
    // 수취인 관련
    '수취인명': 'recipient_name',
    '수취인연락처': 'recipient_phone',
    '수취인주소': 'recipient_address',
    '수취인우편번호': 'recipient_zipcode',
    
    // 배송 관련
    '운송장번호': 'tracking_number',
    '택배사': 'courier_company',
    '배송메시지': 'delivery_message',
    '배송상태': 'status',
    
    // 가격 관련
    '결제가': 'total_price',
    '결제가(판매가/조립비/선불배송비)': 'total_price',
    '배송비': 'shipping_cost',
    '매출액': 'total_price',
    '총매출': 'total_price',
    '단가': 'unit_price',
    '조립비': 'assembly_cost',
    '정산금액': 'settlement_amount',
    
    // 날짜 관련
    '구매확정일': 'purchase_confirmation_date',
    '배송시작일': 'shipment_date',
    '배송완료일': 'shipment_date',
    '출고예정일': 'shipment_date',
    '배송예정일': 'shipment_date',
    '정산기준일': 'payment_completion_date'
  };
  
  const converted: any = {};
  
  Object.keys(item).forEach(key => {
    const englishField = fieldMapping[key] || key;
    converted[englishField] = item[key];
  });
  
  return converted;
}

// 데이터 전처리 함수
function preprocessData(item: any) {
  // 먼저 한글 필드명을 영문으로 변환
  const converted = convertKoreanToEnglishFields(item);
  const processed = { ...converted };
  
  // 숫자 필드들을 문자열로 통일 (unique constraint와 일치시키기 위해)
  if (processed.order_number) {
    processed.order_number = String(processed.order_number);
  }
  
  if (processed.product_order_number) {
    processed.product_order_number = String(processed.product_order_number);
  }
  
  if (processed.product_id) {
    processed.product_id = String(processed.product_id);
  }
  
  // 수량과 가격은 숫자로 유지
  if (processed.quantity) {
    const num = Number(processed.quantity);
    processed.quantity = isNaN(num) ? 0 : num;
  }
  
  if (processed.total_price) {
    const num = Number(processed.total_price);
    processed.total_price = isNaN(num) ? 0 : num;
  }
  
  if (processed.unit_price) {
    const num = Number(processed.unit_price);
    processed.unit_price = isNaN(num) ? 0 : num;
  }
  
  // 날짜 필드 변환
  if (processed.order_date) {
    processed.order_date = convertExcelDateToISO(processed.order_date);
  }
  
  // 추가 날짜 필드들 변환
  if (processed.purchase_confirmation_date) {
    processed.purchase_confirmation_date = convertExcelDateToISO(processed.purchase_confirmation_date);
  }
  
  if (processed.shipment_date) {
    processed.shipment_date = convertExcelDateToISO(processed.shipment_date);
  }
  
  if (processed.payment_completion_date) {
    processed.payment_completion_date = convertExcelDateToISO(processed.payment_completion_date);
  }
  
  // 빈 문자열을 null로 변환
  Object.keys(processed).forEach(key => {
    if (processed[key] === '') {
      processed[key] = null;
    }
  });
  
  return processed;
}

export async function POST(request: NextRequest) {
  try {
    const { orderItems, channel } = await request.json();

    if (!orderItems || !Array.isArray(orderItems)) {
      return NextResponse.json({ error: '주문 데이터가 필요합니다.' }, { status: 400 });
    }

    if (!channel) {
      return NextResponse.json({ error: '채널 정보가 필요합니다.' }, { status: 400 });
    }

    console.log('데이터 저장 시작:', {
      totalItems: orderItems.length,
      channel: channel,
      sampleItem: orderItems[0] // 첫 번째 아이템 샘플 확인
    });

    // Supabase 클라이언트 생성 및 연결 테스트
    const supabase = createServiceClient();
    
    // 연결 테스트
    try {
      await retryOperation(async () => {
        const { error } = await supabase
          .from('orders')
          .select('count', { count: 'exact', head: true })
          .limit(1);
        
        if (error) {
          throw error;
        }
      }, 3, 1000);
      
      console.log('Supabase 연결 성공');
    } catch (connectionError) {
      console.error('Supabase 연결 실패:', connectionError);
      return NextResponse.json({
        success: false,
        error: '데이터베이스 연결에 실패했습니다. 잠시 후 다시 시도해주세요.'
      }, { status: 500 });
    }

    // 데이터 전처리 및 user_id 추가
    const processedData = orderItems.map((item, index) => {
      console.log(`처리 중인 아이템 ${index + 1}:`, {
        originalKeys: Object.keys(item),
        sampleValues: {
          orderNumber: item.order_number || item['주문번호'],
          productName: item.product_name || item['상품명'],
          quantity: item.quantity || item['주문수량'],
          purchaseConfirmationDate: item.purchase_confirmation_date || item['구매확정일']
        }
      });
      
      const processed = preprocessData(item);
      const withUserId = {
        ...processed,
        user_id: 'current-user-id', // TODO: Clerk에서 실제 사용자 ID 가져오기
        channel: channel
      };
      
      // 데이터베이스 스키마에 존재하는 컬럼만 필터링
      const finalItem = filterValidColumns(withUserId);
      
      // 첫 번째 아이템의 전처리 결과 로그
      if (index === 0) {
        console.log('첫 번째 아이템 전처리 결과:', {
          original: item,
          processed: processed,
          withUserId: withUserId,
          final: finalItem,
          filteredKeys: Object.keys(finalItem),
          dateFields: {
            order_date: finalItem.order_date,
            purchase_confirmation_date: finalItem.purchase_confirmation_date,
            shipment_date: finalItem.shipment_date,
            payment_completion_date: finalItem.payment_completion_date
          }
        });
      }
      
      return finalItem;
    });

    // UPSERT 키와 동일한 기준으로 중복 제거 (모든 채널에 대해 동일한 키 사용)
    const uniqueData = processedData.filter((item, index, self) => {
      // 모든 채널에 대해 동일한 키 사용: channel-order_number-product_name-product_option-product_order_number
      const key = `${item.channel}-${item.order_number}-${item.product_name}-${item.product_option}-${item.product_order_number}`;
      
      const firstIndex = self.findIndex(x => {
        const compareKey = `${x.channel}-${x.order_number}-${x.product_name}-${x.product_option}-${x.product_order_number}`;
        return compareKey === key;
      });
      
      return firstIndex === index;
    });

    console.log('중복 제거 결과:', {
      originalCount: processedData.length,
      uniqueCount: uniqueData.length,
      removedCount: processedData.length - uniqueData.length
    });

    // 데이터베이스 기존 데이터 확인 (디버깅용)
    try {
      // 전체 데이터 개수 확인
      const { count: totalCount, error: countError } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('channel', channel);
      
      console.log(`데이터베이스 ${channel} 채널 총 데이터 개수:`, totalCount);
      
      const { data: existingData, error: existingError } = await supabase
        .from('orders')
        .select('channel, order_number, product_name, product_option, product_order_number')
        .eq('channel', channel)
        .limit(10);
      
      if (!existingError && existingData) {
        console.log('데이터베이스 기존 데이터 샘플:', {
          existingKeys: existingData.map(item => ({
            key: `${item.channel}-${item.order_number}-${item.product_name}-${item.product_option}-${item.product_order_number}`,
            order_number: item.order_number,
            product_order_number: item.product_order_number
          }))
        });
        
        // 첫 번째 업로드 데이터와 비교
        const firstUploadKey = `${uniqueData[0].channel}-${uniqueData[0].order_number}-${uniqueData[0].product_name}-${uniqueData[0].product_option}-${uniqueData[0].product_order_number}`;
        const matchingExisting = existingData.find(item => {
          const existingKey = `${item.channel}-${item.order_number}-${item.product_name}-${item.product_option}-${item.product_order_number}`;
          return existingKey === firstUploadKey;
        });
        
        console.log('첫 번째 업로드 데이터 매칭 결과:', {
          uploadKey: firstUploadKey,
          found: !!matchingExisting,
          matchingData: matchingExisting ? {
            order_number: matchingExisting.order_number,
            product_order_number: matchingExisting.product_order_number
          } : null
        });
        
        // 특정 주문번호로 직접 검색
        const { data: specificData, error: specificError } = await supabase
          .from('orders')
          .select('channel, order_number, product_name, product_option, product_order_number')
          .eq('channel', channel)
          .eq('order_number', uniqueData[0].order_number)
          .limit(5);
        
        console.log('특정 주문번호 검색 결과:', {
          searchOrderNumber: uniqueData[0].order_number,
          foundCount: specificData?.length || 0,
          foundData: specificData?.map(item => ({
            key: `${item.channel}-${item.order_number}-${item.product_name}-${item.product_option}-${item.product_order_number}`,
            order_number: item.order_number,
            product_order_number: item.product_order_number
          })) || []
        });
      }
    } catch (error) {
      console.log('기존 데이터 확인 중 오류:', error);
    }

    let totalInserted = 0;
    const errors: any[] = [];

    // 배치로 데이터 삽입
    for (let i = 0; i < uniqueData.length; i += BATCH_SIZE) {
      const batch = uniqueData.slice(i, i + BATCH_SIZE);
      const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
      
      try {
        console.log(`배치 ${batchNumber} 처리 중: ${batch.length}개 항목`);
        
        const result = await retryOperation(async () => {
          // 직접 중복 확인 후 INSERT/UPDATE 처리
          console.log(`배치 ${batchNumber} 중복 확인 중...`);
          
          // 배치의 모든 키를 추출
          const batchKeys = batch.map(item => ({
            key: `${item.channel}-${item.order_number}-${item.product_name}-${item.product_option}-${item.product_order_number}`,
            data: item
          }));
          
          // 데이터베이스에서 기존 데이터 확인
          const { data: existingData, error: existingError } = await supabase
            .from('orders')
            .select('id, channel, order_number, product_name, product_option, product_order_number')
            .eq('channel', channel)
            .in('order_number', batch.map(item => item.order_number));
          
          if (existingError) {
            throw existingError;
          }
          
          // 중복 데이터와 새로운 데이터 분리
          const existingKeys = new Set(
            existingData?.map(item => 
              `${item.channel}-${item.order_number}-${item.product_name}-${item.product_option}-${item.product_order_number}`
            ) || []
          );
          
          const newData = batch.filter(item => {
            const key = `${item.channel}-${item.order_number}-${item.product_name}-${item.product_option}-${item.product_order_number}`;
            return !existingKeys.has(key);
          });
          
          console.log(`배치 ${batchNumber} - 기존: ${existingData?.length || 0}개, 새로운: ${newData.length}개`);
          
          // 새로운 데이터만 INSERT
          if (newData.length > 0) {
            const { data: insertResult, error: insertError } = await supabase
              .from('orders')
              .insert(newData)
              .select('id');
            
            if (insertError) {
              throw insertError;
            }
            
            return { data: insertResult, error: null };
          } else {
            return { data: [], error: null };
          }
        }, 3, 1000);

        if (result.error) {
          console.error(`배치 ${batchNumber} 삽입 오류:`, result.error);
          errors.push({
            batch: batchNumber,
            error: result.error.message
          });
        } else {
          const insertedCount = result.data?.length || 0;
          totalInserted += insertedCount;
          console.log(`배치 ${batchNumber} 완료: ${insertedCount}개 삽입됨`);
          
          // 디버깅: 새로 삽입된 데이터 샘플 확인
          if (insertedCount > 0 && batchNumber <= 3) {
            console.log(`배치 ${batchNumber} 새로 삽입된 데이터 샘플:`, {
              sampleKeys: batch.slice(0, 2).map(item => ({
                key: `${item.channel}-${item.order_number}-${item.product_name}-${item.product_option}-${item.product_order_number}`,
                order_number: item.order_number,
                product_order_number: item.product_order_number,
                dataTypes: {
                  order_number: typeof item.order_number,
                  product_order_number: typeof item.product_order_number
                }
              }))
            });
            
            // 첫 번째 삽입된 데이터의 상세 정보
            if (insertedCount > 0) {
              const firstInserted = batch[0];
              console.log(`배치 ${batchNumber} 첫 번째 삽입 데이터 상세:`, {
                key: `${firstInserted.channel}-${firstInserted.order_number}-${firstInserted.product_name}-${firstInserted.product_option}-${firstInserted.product_order_number}`,
                order_number: firstInserted.order_number,
                product_order_number: firstInserted.product_order_number,
                dataTypes: {
                  order_number: typeof firstInserted.order_number,
                  product_order_number: typeof firstInserted.product_order_number
                }
              });
            }
          }
        }
      } catch (error) {
        console.error(`배치 ${batchNumber} 예외:`, error);
        errors.push({
          batch: batchNumber,
          error: error instanceof Error ? error.message : '알 수 없는 오류'
        });
      }
      
      // 배치 간 지연 증가 (네트워크 안정성 향상)
      if (i + BATCH_SIZE < uniqueData.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    console.log('데이터 저장 완료:', {
      total: uniqueData.length,
      inserted: totalInserted,
      errors: errors.length
    });

    if (errors.length > 0) {
      console.error('일부 배치에서 오류 발생:', errors);
      return NextResponse.json({
        success: false,
        error: '일부 데이터 저장 중 오류가 발생했습니다.',
        details: errors,
        data: {
          total: uniqueData.length,
          inserted: totalInserted,
          errors: errors.length
        }
      }, { status: 500 });
    }

    const response = NextResponse.json({
      success: true,
      message: `${totalInserted}개의 데이터가 성공적으로 저장되었습니다.`,
      data: {
        total: uniqueData.length,
        inserted: totalInserted
      }
    });

    // 타임아웃 방지를 위한 헤더 설정
    response.headers.set('Cache-Control', 'no-cache');
    response.headers.set('Connection', 'keep-alive');
    
    return response;

  } catch (error) {
    console.error('데이터 저장 오류:', error);
    return NextResponse.json(
      { 
        error: '데이터 저장 중 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : '알 수 없는 오류'
      },
      { status: 500 }
    );
  }
} 