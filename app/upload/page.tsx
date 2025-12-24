"use client";

import React, { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { 
  Upload, 
  FileSpreadsheet, 
  Settings, 
  CheckCircle, 
  AlertCircle,
  Loader2,
  X,
  Eye,
  EyeOff
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";

// 채널별 설정
const CHANNELS = [
  { id: 'smartstore', name: '스마트스토어', color: '#03C75A' },
  { id: 'ohouse', name: '오늘의집', color: '#4D8DFF' },
  { id: 'ytshopping', name: '유튜브쇼핑', color: '#FF0000' },
  { id: 'coupang', name: '쿠팡', color: '#F39C12' }
];

// 데이터베이스 컬럼 정의
const DATABASE_COLUMNS = [
  { value: 'order_number', label: '주문번호', description: '주문을 식별하는 고유 번호' },
  { value: 'product_order_number', label: '상품주문번호', description: '상품별 주문을 식별하는 고유 번호' },
  { value: 'order_date', label: '주문일시', description: '주문이 발생한 날짜와 시간' },
  { value: 'status', label: '주문상태', description: '주문의 현재 상태 (배송중, 완료 등)' },
  { value: 'quantity', label: '수량', description: '주문한 상품의 수량' },
  { value: 'product_name', label: '상품명', description: '주문한 상품의 이름' },
  { value: 'product_option', label: '옵션명', description: '상품의 옵션 정보' },
  { value: 'customer_name', label: '구매자명', description: '주문한 고객의 이름' },
  { value: 'customer_phone', label: '연락처', description: '구매자의 연락처' },
  { value: 'unit_price', label: '단가', description: '상품의 단위 가격' },
  { value: 'total_price', label: '총액', description: '주문의 총 금액' },
  { value: 'product_id', label: '상품 ID', description: '상품을 식별하는 고유 ID' },
  { value: 'option_id', label: '옵션 ID', description: '옵션을 식별하는 고유 ID' },
  { value: 'recipient_name', label: '수취인명', description: '배송받을 사람의 이름' },
  { value: 'recipient_phone', label: '수취인 연락처', description: '수취인의 연락처' },
  { value: 'recipient_address', label: '수취인 주소', description: '배송받을 주소' },
  { value: 'recipient_zipcode', label: '수취인 우편번호', description: '배송받을 우편번호' },
  { value: 'shipping_cost', label: '배송비', description: '배송에 필요한 비용' },
  { value: 'assembly_cost', label: '조립비', description: '조립 서비스 비용' },
  { value: 'settlement_amount', label: '정산예정금액', description: '정산될 예정인 금액' },
  { value: 'tracking_number', label: '운송장번호', description: '배송 추적용 번호' },
  { value: 'courier_company', label: '택배사', description: '배송을 담당하는 택배사' },
  { value: 'claim_status', label: '클레임상태', description: '반품/교환 등의 클레임 상태' },
  { value: 'delivery_message', label: '배송메시지', description: '배송 관련 메시지' },
  { value: 'purchase_confirmation_date', label: '구매확정일', description: '구매가 확정된 날짜' },
  { value: 'shipment_date', label: '출고일', description: '상품이 출고된 날짜' },
  { value: 'payment_completion_date', label: '주문결제완료일', description: '결제가 완료된 날짜' },
  { value: 'buyer_id', label: '구매자 ID', description: '구매자를 식별하는 고유 ID' },
  { value: 'payment_method', label: '결제수단', description: '사용된 결제 방법' },
  { value: 'customs_clearance_code', label: '개인통관부호', description: '해외 배송용 통관 코드' }
];

// 기본 매핑 정의
const DEFAULT_MAPPINGS = {
  smartstore: {
    '주문번호': 'order_number',
    '상품주문번호': 'product_order_number',
    '주문일시': 'order_date',
    '주문상태': 'status',
    '주문수량': 'quantity',
    '상품명': 'product_name',
    '옵션정보': 'product_option',
    '구매자명': 'customer_name',
    '구매자ID': 'customer_phone'
  },
  ohouse: {
    '주문번호': 'order_number',
    '주문일시': 'order_date',
    '주문상태': 'status',
    '주문수량': 'quantity',
    '상품명': 'product_name',
    '옵션명': 'product_option',
    '구매자명': 'customer_name',
    '구매자ID': 'customer_phone'
  },
  ohouse2: {
    '주문번호': 'order_number',
    '주문일시': 'order_date',
    '주문상태': 'status',
    '주문수량': 'quantity',
    '상품명': 'product_name',
    '옵션명': 'product_option',
    '구매자명': 'customer_name',
    '구매자ID': 'customer_phone'
  },
  YTshopping: {
    '주문번호': 'order_number',
    '주문일시': 'order_date',
    '주문상태': 'status',
    '주문수량': 'quantity',
    '상품명': 'product_name',
    '옵션명': 'product_option',
    '구매자명': 'customer_name',
    '구매자ID': 'customer_phone'
  },
  coupang: {
    '주문번호': 'order_number',
    '주문일시': 'order_date',
    '주문상태': 'status',
    '주문수량': 'quantity',
    '상품명': 'product_name',
    '옵션명': 'product_option',
    '구매자명': 'customer_name',
    '구매자ID': 'customer_phone'
  }
};

const getDefaultMapping = (channel: string) => {
  return DEFAULT_MAPPINGS[channel as keyof typeof DEFAULT_MAPPINGS] || {};
};

interface UploadState {
  channel: string;
  file: File | null;
  password: string;
  showPassword: boolean;
  isProcessing: boolean;
  processingStep: string;
  preview: any[] | null;
  mapping: Record<string, string>;
  duplicates: {
    orderNumberDuplicates: number;
    orderNumberDuplicateList: any[];
    exactDuplicates: number;
    exactDuplicateList: any[];
    exactDuplicateOrderNumbers: string[];
  };
  totalRows: number;
  savedPasswords: Record<string, string>;
}

// API를 통한 파일 처리 함수
const processFileWithAPI = async (file: File, password?: string, channel?: string) => {
  try {
    console.log('API 호출 시작:', {
      fileName: file.name,
      fileSize: file.size,
      hasPassword: !!password,
      channel: channel
    });

    const formData = new FormData();
    formData.append('file', file);
    if (password) {
      formData.append('password', password);
    }
    if (channel) {
      formData.append('channel', channel);
    }

    console.log('FormData 생성 완료, API 호출 중...');

    const response = await fetch('/api/upload/process-file', {
      method: 'POST',
      body: formData,
    });

    console.log('API 응답 받음:', {
      status: response.status,
      ok: response.ok,
      statusText: response.statusText
    });

    if (!response.ok) {
      let parsed;
      try {
        parsed = await response.json();
      } catch (_) {
        const errorText = await response.text();
        throw new Error(`SERVER_ERROR_RAW:${response.status}:${errorText}`);
      }
      if (parsed?.code === 'ENCRYPTED_XLSX_NOT_SUPPORTED') {
        throw new Error('ENCRYPTED_XLSX_NOT_SUPPORTED');
      }
      throw new Error(parsed?.error || `SERVER_ERROR:${response.status}`);
    }

    const result = await response.json();
    
    console.log('API 응답 파싱 완료:', {
      success: result.success,
      hasData: !!result.data,
      dataKeys: result.data ? Object.keys(result.data) : []
    });

    if (!result.success) {
      if (result?.code === 'ENCRYPTED_XLSX_NOT_SUPPORTED') {
        throw new Error('ENCRYPTED_XLSX_NOT_SUPPORTED');
      }
      throw new Error(result.error || '파일 처리 중 오류가 발생했습니다.');
    }

    return result.data;
  } catch (error) {
    console.error('processFileWithAPI 오류:', error);
    if (error instanceof Error && error.message === 'ENCRYPTED_XLSX_NOT_SUPPORTED') {
      throw new Error('ENCRYPTED_XLSX_NOT_SUPPORTED');
    }
    if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
      throw new Error('서버에 연결할 수 없습니다. 서버가 실행 중인지 확인해주세요.');
    }
    throw error;
  }
};

// 데이터베이스 중복 검증 함수
const checkDatabaseDuplicates = async (processedData: any[], channel: string) => {
  const response = await fetch('/api/upload/check-duplicates', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ orderItems: processedData, channel: channel }),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || '중복 검증 중 오류가 발생했습니다.');
  }

  return result.data;
};


export default function UploadPage() {
  const [uploadState, setUploadState] = useState<UploadState>({
    channel: '',
    file: null,
    password: '',
    showPassword: false,
    isProcessing: false,
    processingStep: '',
    preview: null,
    mapping: {}, // 빈 매핑으로 시작
    duplicates: {
      orderNumberDuplicates: 0,
      orderNumberDuplicateList: [],
      exactDuplicates: 0,
      exactDuplicateList: [],
      exactDuplicateOrderNumbers: []
    },
    totalRows: 0,
    savedPasswords: {},
  });

  // 드롭존 설정
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      setUploadState(prev => ({ 
        ...prev, 
        file,
        preview: null,
        duplicates: {
          orderNumberDuplicates: 0,
          orderNumberDuplicateList: [],
          exactDuplicates: 0,
          exactDuplicateList: [],
          exactDuplicateOrderNumbers: []
        },
        totalRows: 0
      }));
      
      // 파일 업로드 시 자동으로 읽지 않음 - 사용자가 "파일 읽기" 버튼을 눌러야 함
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'text/csv': ['.csv']
    },
    multiple: false
  });

  // 파일 미리보기 처리
  const processFilePreview = async (file: File) => {
    try {
      console.log('파일 처리 시도:', {
        fileName: file.name,
        fileSize: file.size,
        password: uploadState.password,
        passwordLength: uploadState.password?.length,
        hasPassword: !!uploadState.password,
        channel: uploadState.channel
      });

      setUploadState(prev => ({ ...prev, isProcessing: true, processingStep: '파일 읽는 중...' }));

      const result = await processFileWithAPI(file, uploadState.password, uploadState.channel);
      
      // 객체 배열로 변환
      const preview = result.preview;
      const duplicates = result.duplicates;

      console.log('파일 처리 결과 - 중복 정보:', {
        duplicates: duplicates,
        exactDuplicateOrderNumbers: duplicates.exactDuplicateOrderNumbers,
        exactDuplicateList: duplicates.exactDuplicateList
      });

      // 파일 읽기 성공 후 저장된 매핑 불러오기
      try {
        console.log(`파일 읽기 후 ${uploadState.channel} 채널의 저장된 매핑 불러오기`);
        const mappingResponse = await fetch(`/api/upload/save-mapping?channel=${uploadState.channel}`);
        const mappingResult = await mappingResponse.json();

        if (mappingResult.success && mappingResult.data && Object.keys(mappingResult.data).length > 0) {
          console.log('파일 읽기 후 저장된 매핑 불러옴:', mappingResult.data);
          setUploadState(prev => ({
            ...prev,
            isProcessing: false,
            processingStep: '',
            preview,
            totalRows: result.totalRows,
            duplicates: duplicates,
            mapping: mappingResult.data, // 저장된 매핑 적용
          }));
        } else {
          console.log('저장된 매핑이 없음, 빈 매핑으로 설정');
          setUploadState(prev => ({
            ...prev,
            isProcessing: false,
            processingStep: '',
            preview,
            totalRows: result.totalRows,
            duplicates: duplicates,
            mapping: {}, // 빈 매핑으로 설정
          }));
        }
      } catch (mappingError) {
        console.error('매핑 불러오기 오류:', mappingError);
        setUploadState(prev => ({
          ...prev,
          isProcessing: false,
          processingStep: '',
          preview,
          totalRows: result.totalRows,
          duplicates: duplicates,
          mapping: {}, // 오류 시 빈 매핑으로 설정
        }));
      }

    } catch (error) {
      console.error('파일 처리 오류:', error);
      setUploadState(prev => ({ ...prev, isProcessing: false, processingStep: '' }));
      
      if (error instanceof Error) {
        if (error.message === 'ENCRYPTED_XLSX_NOT_SUPPORTED') {
          toast.error('이 엑셀 파일은 암호화되어 있습니다. 비밀번호를 제거하거나 CSV로 저장 후 업로드해주세요.');
        } else if (error.message.includes('서버에 연결할 수 없습니다')) {
          toast.error('서버에 연결할 수 없습니다. 서버가 실행 중인지 확인해주세요.');
        } else if (error.message.includes('PASSWORD_REQUIRED')) {
          toast.error('이 파일은 비밀번호가 필요합니다. 비밀번호를 입력해주세요.');
        } else if (error.message.includes('INVALID_PASSWORD')) {
          toast.error('비밀번호가 올바르지 않습니다. 다시 확인해주세요.');
        } else if (error.message.includes('FILE_CORRUPTED')) {
          toast.error('파일이 손상되었거나 지원되지 않는 형식입니다.');
        } else if (error.message.includes('서버 오류')) {
          toast.error(`서버 오류: ${error.message}`);
        } else {
          toast.error(`파일 처리 오류: ${error.message}`);
        }
      } else {
        toast.error('알 수 없는 오류가 발생했습니다.');
      }
      setUploadState(prev => ({ ...prev, preview: null }));
    }
  };

  // 채널 변경 처리
  const handleChannelChange = async (channel: string) => {
    console.log('채널 변경됨:', channel);
    
    setUploadState(prev => ({
      ...prev,
      channel,
      mapping: {} // 매핑을 빈 객체로 초기화 (파일 읽기 후에 저장된 매핑을 불러올 예정)
    }));

    // 저장된 비밀번호 불러오기
    try {
      const response = await fetch(`/api/upload/save-password?channel=${channel}&userId=current-user-id`);
      const result = await response.json();

      if (result.success && result.data.password) {
        setUploadState(prev => ({
          ...prev,
          password: result.data.password,
          savedPasswords: {
            ...prev.savedPasswords,
            [channel]: result.data.password
          }
        }));
      }
    } catch (error) {
      console.error('저장된 비밀번호 불러오기 오류:', error);
    }
  };

  // 비밀번호 토글
  const togglePassword = () => {
    setUploadState(prev => ({
      ...prev,
      showPassword: !prev.showPassword
    }));
  };

  // 비밀번호 변경
  const handlePasswordChange = (password: string) => {
    setUploadState(prev => ({ ...prev, password }));
  };

  // 매핑 변경
  const handleMappingChange = (excelColumn: string, dbColumn: string) => {
    setUploadState(prev => ({
      ...prev,
      mapping: {
        ...prev.mapping,
        [excelColumn]: dbColumn
      }
    }));
  };

  // 업로드 실행
  const handleUpload = async () => {
    if (!uploadState.channel || !uploadState.file) {
      toast.error('채널과 파일을 선택해주세요.');
      return;
    }

    setUploadState(prev => ({ ...prev, isProcessing: true, processingStep: '파일 처리 중...' }));

    try {
      // 미리보기에서 사용한 것과 동일한 방식으로 전체 데이터 처리
      toast.info('전체 데이터를 처리하고 있습니다...');
      const result = await processFileWithAPI(uploadState.file, uploadState.password, uploadState.channel);
      
      console.log('전체 데이터 처리:', {
        totalRows: result.totalRows,
        mapping: uploadState.mapping,
        channel: uploadState.channel,
        resultKeys: Object.keys(result),
        hasRows: !!result.rows,
        rowsLength: result.rows ? result.rows.length : 0,
        firstRow: result.rows ? result.rows[0] : null,
        hasData: !!result.data,
        dataKeys: result.data ? Object.keys(result.data) : [],
        dataRowsLength: result.data && result.data.rows ? result.data.rows.length : 0,
        dataFirstRow: result.data && result.data.rows ? result.data.rows[0] : null
      });

      // process-file API에서 이미 매핑된 데이터를 반환하므로 그대로 사용
      console.log('API 응답 구조 확인:', {
        resultKeys: Object.keys(result),
        hasData: !!result.data,
        dataKeys: result.data ? Object.keys(result.data) : [],
        hasRows: !!result.rows,
        hasDataRows: result.data && !!result.data.rows
      });
      
      const processedData = result.data?.rows || result.rows;
      
      if (!processedData) {
        throw new Error('처리된 데이터를 찾을 수 없습니다. API 응답 구조를 확인해주세요.');
      }

      // 첫 번째 행의 경우 매핑 결과를 로그로 출력
      if (processedData.length > 0) {
        console.log('첫 번째 행 매핑 결과:', {
          originalRow: processedData[0],
          hasOrderNumber: !!processedData[0].order_number,
          orderNumberValue: processedData[0].order_number,
          hasProductName: !!processedData[0].product_name,
          productNameValue: processedData[0].product_name,
          hasProductOption: !!processedData[0].product_option,
          productOptionValue: processedData[0].product_option
        });
      }

      console.log('처리된 데이터 샘플 (첫 3개):', processedData.slice(0, 3));
      console.log('주문번호 필드 확인:', processedData.slice(0, 3).map(item => ({
        hasOrderNumber: !!item.order_number,
        orderNumberValue: item.order_number,
        hasProductName: !!item.product_name,
        productNameValue: item.product_name,
        hasProductOption: !!item.product_option,
        productOptionValue: item.product_option
      })));

      // 데이터 유효성 검사
      const invalidData = processedData.filter(item => !item.order_number || item.order_number === '');
      if (invalidData.length > 0) {
        console.error('주문번호가 없는 데이터 발견:', invalidData.length, '개');
        console.error('첫 번째 무효 데이터:', invalidData[0]);
        throw new Error(`주문번호가 없는 데이터가 ${invalidData.length}개 있습니다. 파일을 다시 확인해주세요.`);
      }

      // 2단계: 중복 검증
      setUploadState(prev => ({ ...prev, processingStep: '중복 데이터 확인 중...' }));
      toast.info('중복 데이터를 확인하고 있습니다...');
      const duplicateCheck = await checkDatabaseDuplicates(processedData, uploadState.channel);
      
      console.log('중복 검증 결과:', {
        total: duplicateCheck.total,
        duplicates: duplicateCheck.duplicates,
        newItems: duplicateCheck.newItems
      });

      // 중복 데이터가 있는 경우 사용자에게 확인
      if (duplicateCheck.duplicates > 0 || duplicateCheck.statusChanged > 0) {
        const message = [
          `데이터베이스에서 ${duplicateCheck.duplicates}개의 중복 데이터가 발견되었습니다.`,
          duplicateCheck.statusChanged > 0 ? `${duplicateCheck.statusChanged}개의 주문상태 변경이 감지되었습니다.` : '',
          `새로운 데이터: ${duplicateCheck.newItems}개`,
          `중복된 데이터는 기존 데이터를 덮어쓰고, 주문상태 변경은 업데이트됩니다.`,
          `계속 진행하시겠습니까?`
        ].filter(Boolean).join('\n');
        
        const shouldContinue = confirm(message);
        
        if (!shouldContinue) {
          setUploadState(prev => ({ ...prev, isProcessing: false, processingStep: '' }));
          return;
        }
      }

      // 3단계: 데이터 저장
      setUploadState(prev => ({ ...prev, processingStep: '데이터 저장 중... (시간이 걸릴 수 있습니다)' }));
      toast.info('데이터를 저장하고 있습니다... (시간이 걸릴 수 있습니다)');
      
      // 데이터 전송 전 로그
      console.log('save-data API 호출 전 데이터 확인:', {
        processedDataLength: processedData.length,
        firstItem: processedData[0],
        secondItem: processedData[1],
        thirdItem: processedData[2],
        sampleOrderNumbers: processedData.slice(0, 5).map(item => ({
          orderNumber: item.order_number,
          productName: item.product_name,
          quantity: item.quantity
        }))
      });
      
      console.log('save-data API 호출 시작...');
      const saveResponse = await fetch('/api/upload/save-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderItems: processedData,
          channel: uploadState.channel
        }),
      });

      console.log('save-data API 응답 받음:', {
        status: saveResponse.status,
        ok: saveResponse.ok,
        statusText: saveResponse.statusText
      });

      const saveResult = await saveResponse.json();
      console.log('save-data API 응답 파싱 완료:', saveResult);

      if (!saveResponse.ok) {
        throw new Error(saveResult.error || '데이터 저장 중 오류가 발생했습니다.');
      }

      // 4단계: 매핑 및 비밀번호 저장 (백그라운드에서 처리)
      setUploadState(prev => ({ ...prev, processingStep: '설정 저장 중...' }));
      toast.info('설정을 저장하고 있습니다...');
      
      // 매핑 저장
      try {
        await fetch('/api/upload/save-mapping', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            channel: uploadState.channel,
            mapping: uploadState.mapping,
            userId: 'current-user-id' // TODO: Clerk에서 실제 사용자 ID 가져오기
          }),
        });
      } catch (mappingError) {
        console.error('매핑 저장 오류:', mappingError);
        // 매핑 저장 실패는 업로드 성공을 막지 않음
      }

      // 비밀번호 저장 (입력된 경우)
      if (uploadState.password) {
        try {
          await fetch('/api/upload/save-password', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              channel: uploadState.channel,
              password: uploadState.password,
              userId: 'current-user-id' // TODO: Clerk에서 실제 사용자 ID 가져오기
            }),
          });
        } catch (passwordError) {
          console.error('비밀번호 저장 오류:', passwordError);
          // 비밀번호 저장 실패는 업로드 성공을 막지 않음
        }
      }

      // 성공 메시지
      const successMessage = saveResult.message || 
        `${saveResult.data.inserted}개의 데이터가 성공적으로 저장되었습니다.`;
      
      toast.success(successMessage);
      
      // 상세 정보 로그
      console.log('업로드 완료 상세:', {
        total: saveResult.data.total,
        inserted: saveResult.data.inserted
      });

      // 5단계: 트리거 재활성화
      try {
        const triggerResponse = await fetch('/api/upload/disable-trigger', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ action: 'enable' }),
        });
        
        if (triggerResponse.ok) {
          console.log('트리거가 재활성화되었습니다.');
        } else {
          console.warn('트리거 재활성화 실패');
        }
      } catch (triggerError) {
        console.warn('트리거 재활성화 오류:', triggerError);
      }

      setUploadState(prev => ({ ...prev, isProcessing: false, processingStep: '' }));
      
      // 비밀번호 저장 (입력된 경우)
      if (uploadState.password) {
        setUploadState(prev => ({
          ...prev,
          savedPasswords: {
            ...prev.savedPasswords,
            [uploadState.channel]: uploadState.password
          }
        }));
      }

      // 상태 초기화
      setUploadState(prev => ({
        ...prev,
        channel: '',
        file: null,
        password: '',
        showPassword: false,
        isProcessing: false,
        preview: null,
        mapping: {},
        duplicates: {
          orderNumberDuplicates: 0,
          orderNumberDuplicateList: [],
          exactDuplicates: 0,
          exactDuplicateList: [],
          exactDuplicateOrderNumbers: []
        },
        totalRows: 0
      }));

    } catch (error) {
      console.error('업로드 오류:', error);
      if (error instanceof Error) {
        if (error.message === 'ENCRYPTED_XLSX_NOT_SUPPORTED') {
          toast.error('이 엑셀 파일은 암호화되어 있습니다. 비밀번호를 제거하거나 CSV로 저장 후 업로드해주세요.');
        } else if (error.message === 'PASSWORD_REQUIRED') {
          toast.error('이 파일은 비밀번호가 필요합니다. 비밀번호를 입력해주세요.');
        } else if (error.message === 'INVALID_PASSWORD') {
          toast.error('비밀번호가 올바르지 않습니다. 다시 확인해주세요.');
        } else if (error.message === 'FILE_CORRUPTED') {
          toast.error('파일이 손상되었거나 지원되지 않는 형식입니다.');
        } else {
          toast.error('업로드 중 오류가 발생했습니다.');
        }
      } else {
        toast.error('업로드 중 오류가 발생했습니다.');
      }
    } finally {
      setUploadState(prev => ({ ...prev, isProcessing: false }));
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">데이터 업로드</h1>
        <p className="text-muted-foreground">
          채널별 엑셀 파일을 업로드하여 데이터베이스에 저장합니다.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 업로드 설정 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              업로드 설정
            </CardTitle>
            <CardDescription>
              채널과 파일을 선택하고 업로드 설정을 구성하세요.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 채널 선택 */}
            <div className="space-y-2">
              <Label htmlFor="channel">채널 선택</Label>
              <Select value={uploadState.channel} onValueChange={handleChannelChange}>
                <SelectTrigger>
                  <SelectValue placeholder="채널을 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  {CHANNELS.map(channel => (
                    <SelectItem key={channel.id} value={channel.id}>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: channel.color }}
                        />
                        {channel.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 비밀번호 입력 */}
            <div className="space-y-2">
              <Label htmlFor="password">파일 비밀번호 (필요한 경우)</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    id="password"
                    type={uploadState.showPassword ? 'text' : 'password'}
                    placeholder="비밀번호를 입력하세요"
                    value={uploadState.password}
                    onChange={(e) => handlePasswordChange(e.target.value)}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={togglePassword}
                  >
                    {uploadState.showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                {uploadState.file && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => processFilePreview(uploadState.file!)}
                  >
                    파일 읽기
                  </Button>
                )}
              </div>
              {uploadState.savedPasswords[uploadState.channel] && (
                <p className="text-xs text-green-600 flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" />
                  저장된 비밀번호가 자동으로 적용되었습니다
                </p>
              )}
            </div>
            
            {/* 파일 업로드 */}
            <div className="space-y-2">
              <Label>파일 업로드</Label>
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                  isDragActive 
                    ? 'border-primary bg-primary/5' 
                    : 'border-muted-foreground/25 hover:border-primary/50'
                }`}
              >
                <input {...getInputProps()} />
                <FileSpreadsheet className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                {uploadState.file ? (
                  <div>
                    <p className="font-medium">{uploadState.file.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(uploadState.file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="font-medium">
                      {isDragActive ? '파일을 여기에 놓으세요' : '파일을 드래그하거나 클릭하세요'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Excel (.xlsx, .xls) 또는 CSV 파일
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* 매핑 저장 버튼 */}
            {uploadState.preview && Object.keys(uploadState.mapping).length > 0 && (
              <Button 
                onClick={async () => {
                  try {
                    const response = await fetch('/api/upload/save-mapping', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({
                        channel: uploadState.channel,
                        mapping: uploadState.mapping,
                        userId: 'current-user-id'
                      }),
                    });
                    
                    if (response.ok) {
                      toast.success('매핑이 저장되었습니다.');
                    } else {
                      toast.error('매핑 저장에 실패했습니다.');
                    }
                  } catch (error) {
                    toast.error('매핑 저장 중 오류가 발생했습니다.');
                  }
                }}
                variant="outline"
                className="w-full"
              >
                <Settings className="mr-2 h-4 w-4" />
                매핑 저장
              </Button>
            )}

            {/* 업로드 버튼 */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="w-full">
                    <Button 
                      onClick={handleUpload}
                      disabled={
                        !uploadState.channel || 
                        !uploadState.file || 
                        uploadState.isProcessing ||
                        DATABASE_COLUMNS.filter(col => 
                          ['order_number', 'order_date', 'quantity', 'product_name', 'product_option', 'customer_name', 'customer_phone'].includes(col.value) &&
                          !Object.keys(uploadState.mapping).find(key => uploadState.mapping[key] === col.value && uploadState.mapping[key] !== 'none' && uploadState.mapping[key] !== '')
                        ).length > 0
                      }
                      className="w-full"
                      onMouseEnter={() => {
                        const missingColumns = DATABASE_COLUMNS.filter(col => 
                          ['order_number', 'order_date', 'quantity', 'product_name', 'product_option', 'customer_name', 'customer_phone'].includes(col.value) &&
                          !Object.keys(uploadState.mapping).find(key => uploadState.mapping[key] === col.value && uploadState.mapping[key] !== 'none' && uploadState.mapping[key] !== '')
                        );
                        console.log('현재 매핑 상태:', {
                          mapping: uploadState.mapping,
                          missingColumns: missingColumns.map(col => col.label),
                          totalRequired: ['order_number', 'order_date', 'quantity', 'product_name', 'product_option', 'customer_name', 'customer_phone'].length,
                          mappedRequired: ['order_number', 'order_date', 'quantity', 'product_name', 'product_option', 'customer_name', 'customer_phone'].filter(col => 
                            Object.keys(uploadState.mapping).find(key => uploadState.mapping[key] === col && uploadState.mapping[key] !== 'none' && uploadState.mapping[key] !== '')
                          ).length
                        });
                      }}
                    >
                      {uploadState.isProcessing ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          {uploadState.processingStep || '업로드 중...'}
                        </>
                      ) : (
                        <>
                          <Upload className="mr-2 h-4 w-4" />
                          업로드 실행
                        </>
                      )}
                    </Button>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  {!uploadState.channel && "채널을 선택해주세요"}
                  {uploadState.channel && !uploadState.file && "파일을 업로드해주세요"}
                  {uploadState.channel && uploadState.file && 
                   DATABASE_COLUMNS.filter(col => 
                     ['order_number', 'order_date', 'quantity', 'product_name', 'product_option', 'customer_name', 'customer_phone'].includes(col.value) &&
                     !Object.keys(uploadState.mapping).find(key => uploadState.mapping[key] === col.value && uploadState.mapping[key] !== 'none' && uploadState.mapping[key] !== '')
                   ).length > 0 && 
                   `필수 컬럼 매핑을 완료해주세요 (${DATABASE_COLUMNS.filter(col => 
                     ['order_number', 'order_date', 'quantity', 'product_name', 'product_option', 'customer_name', 'customer_phone'].includes(col.value) &&
                     !Object.keys(uploadState.mapping).find(key => uploadState.mapping[key] === col.value && uploadState.mapping[key] !== 'none' && uploadState.mapping[key] !== '')
                   ).map(col => col.label).join(', ')})`}
                  {uploadState.channel && uploadState.file && 
                   DATABASE_COLUMNS.filter(col => 
                     ['order_number', 'order_date', 'quantity', 'product_name', 'product_option', 'customer_name', 'customer_phone'].includes(col.value) &&
                     !Object.keys(uploadState.mapping).find(key => uploadState.mapping[key] === col.value && uploadState.mapping[key] !== 'none' && uploadState.mapping[key] !== '')
                   ).length === 0 && 
                   "업로드를 실행합니다"}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </CardContent>
        </Card>

        {/* 미리보기 및 설정 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              데이터 미리보기
            </CardTitle>
            <CardDescription>
              업로드될 데이터의 미리보기와 컬럼 매핑을 확인하세요.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {uploadState.preview ? (
              <>
                {/* 통계 정보 */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <p className="text-2xl font-bold text-primary">{uploadState.totalRows}</p>
                    <p className="text-sm text-muted-foreground">총 행 수</p>
                  </div>
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <p className="text-2xl font-bold text-blue-500">{uploadState.duplicates.orderNumberDuplicates}</p>
                    <p className="text-sm text-muted-foreground">중복 주문번호</p>
                  </div>
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <p className="text-2xl font-bold text-orange-500">{uploadState.duplicates.exactDuplicates}</p>
                    <p className="text-sm text-muted-foreground">정확한 중복</p>
                  </div>
                </div>
                
                <div className="text-xs text-muted-foreground text-center space-y-1">
                  <p>* 업로드 시 데이터베이스 중복도 함께 확인됩니다.</p>
                  {uploadState.channel === 'smartstore' || uploadState.channel === 'YTshopping' || uploadState.channel === 'ytshopping' ? (
                    <p className="text-blue-600 font-medium">
                      중복 기준: 상품주문번호 + 주문번호 + 상품명 + 옵션명
                    </p>
                  ) : (
                    <p className="text-blue-600 font-medium">
                      중복 기준: 주문번호 + 상품명 + 옵션명
                    </p>
                  )}
                </div>

                {/* 정확한 중복 주문번호 표시 */}
                {uploadState.duplicates.exactDuplicates > 0 && (
                  <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                    <h4 className="text-sm font-medium text-orange-800 mb-2">
                      정확한 중복 주문번호 ({uploadState.duplicates.exactDuplicates}개)
                    </h4>
                    <div className="text-xs text-orange-700 space-y-1">
                      {uploadState.duplicates.exactDuplicateOrderNumbers.slice(0, 10).map((orderNumber, index) => (
                        <div key={index} className="font-mono">
                          {orderNumber}
                        </div>
                      ))}
                      {uploadState.duplicates.exactDuplicateOrderNumbers.length > 10 && (
                        <div className="text-orange-600 italic">
                          ... 외 {uploadState.duplicates.exactDuplicateOrderNumbers.length - 10}개 더
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 미리보기 테이블 */}
                <div className="space-y-2">
                  <Label>데이터 미리보기</Label>
                  <div className="border rounded-lg overflow-hidden">
                    <div className="max-h-60 overflow-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-muted sticky top-0">
                          <tr>
                            {uploadState.preview[0] && Object.keys(uploadState.preview[0]).map((key) => (
                              <th key={key} className="px-3 py-2 text-left font-medium min-w-32 max-w-48">
                                <div className="truncate" title={key}>
                                  {key}
                                </div>
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {uploadState.preview.slice(0, 5).map((row, index) => (
                            <tr key={index} className="border-t hover:bg-muted/30">
                              {Object.values(row).map((value, cellIndex) => (
                                <td key={cellIndex} className="px-3 py-2 min-w-32 max-w-48">
                                  <div className="truncate" title={String(value)}>
                                    {String(value)}
                                  </div>
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  {uploadState.preview.length > 5 && (
                    <p className="text-xs text-muted-foreground text-center">
                      상위 5행만 표시됩니다. 마우스를 올리면 전체 내용을 확인할 수 있습니다.
                    </p>
                  )}
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <FileSpreadsheet className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>파일을 업로드하면 미리보기가 표시됩니다.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 매핑 설정 */}
      {uploadState.preview && (
        <Card>
          <CardHeader>
            <CardTitle>컬럼 매핑 설정</CardTitle>
            <CardDescription>
              데이터베이스 컬럼에 엑셀 파일의 컬럼을 매핑하세요.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* 매핑 상태 요약 */}
              {uploadState.preview && (
                <div className="mb-4 p-3 bg-muted rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">매핑 상태</h4>
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded-full bg-green-500"></div>
                        <span>매핑됨</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded-full bg-red-500"></div>
                        <span>필수 미매핑</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                        <span>선택 미매핑</span>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {DATABASE_COLUMNS.filter(col => {
                          const mapped = Object.keys(uploadState.mapping).find(key => uploadState.mapping[key] === col.value);
                          return mapped && mapped !== 'none' && mapped !== '';
                        }).length}
                      </div>
                      <div className="text-muted-foreground">매핑됨</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-600">
                        {DATABASE_COLUMNS.filter(col => 
                          ['order_number', 'order_date', 'quantity', 'product_name', 'product_option', 'customer_name', 'customer_phone'].includes(col.value) &&
                          !Object.keys(uploadState.mapping).find(key => uploadState.mapping[key] === col.value && uploadState.mapping[key] !== 'none' && uploadState.mapping[key] !== '')
                        ).length}
                      </div>
                      <div className="text-muted-foreground">필수 미매핑</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-yellow-600">
                        {DATABASE_COLUMNS.filter(col => 
                          !['order_number', 'order_date', 'quantity', 'product_name', 'product_option', 'customer_name', 'customer_phone'].includes(col.value) &&
                          !Object.keys(uploadState.mapping).find(key => uploadState.mapping[key] === col.value && uploadState.mapping[key] !== 'none' && uploadState.mapping[key] !== '')
                        ).length}
                      </div>
                      <div className="text-muted-foreground">선택 미매핑</div>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {DATABASE_COLUMNS.map((dbColumn) => {
                  const mappedExcelColumn = Object.keys(uploadState.mapping).find(key => uploadState.mapping[key] === dbColumn.value);
                  const isMapped = mappedExcelColumn && mappedExcelColumn !== 'none' && mappedExcelColumn !== '';
                  const isRequired = ['order_number', 'order_date', 'quantity', 'product_name', 'product_option', 'customer_name', 'customer_phone'].includes(dbColumn.value);
                  
                  return (
                    <div 
                      key={dbColumn.value} 
                      className={`flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/30 transition-colors ${
                        isMapped 
                          ? 'border-green-200 bg-green-50/50' 
                          : isRequired 
                            ? 'border-red-200 bg-red-50/50' 
                            : 'border-yellow-200 bg-yellow-50/50'
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Label className="text-sm font-medium truncate block" title={dbColumn.label}>
                            {dbColumn.label}
                          </Label>
                          <div className="flex gap-1">
                            {isRequired && (
                              <Badge className="text-xs h-5 px-1.5 bg-red-100 text-red-700 border border-red-200 hover:bg-red-200">
                                필수
                              </Badge>
                            )}
                            {isMapped && (
                              <Badge className="text-xs h-5 px-1.5 bg-green-100 text-green-700 border border-green-200 hover:bg-green-200">
                                매핑됨
                              </Badge>
                            )}
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground mb-1">
                          {dbColumn.description}
                        </p>
                        {isMapped && (
                          <p className="text-xs text-green-600 font-medium">
                            → {mappedExcelColumn}
                          </p>
                        )}

                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground text-sm">←</span>
                        <Select
                          value={mappedExcelColumn || 'none'}
                          onValueChange={(value) => {
                            // 기존 매핑 제거
                            const newMapping = { ...uploadState.mapping };
                            Object.keys(newMapping).forEach(key => {
                              if (newMapping[key] === dbColumn.value) {
                                delete newMapping[key];
                              }
                            });
                            // 새 매핑 추가
                            if (value && value !== 'none') {
                              newMapping[value] = dbColumn.value;
                            }
                            setUploadState(prev => ({ ...prev, mapping: newMapping }));
                          }}
                        >
                          <SelectTrigger className={`w-48 ${
                            isMapped 
                              ? 'border-green-300 bg-green-50' 
                              : isRequired 
                                ? 'border-red-300 bg-red-50' 
                                : 'border-yellow-300 bg-yellow-50'
                          }`}>
                            <SelectValue placeholder="엑셀 컬럼 선택" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">매핑 안함</SelectItem>
                            {uploadState.preview[0] && Object.keys(uploadState.preview[0]).filter(col => col && col.trim() !== '').map((excelColumn) => (
                              <SelectItem key={excelColumn} value={excelColumn}>
                                {excelColumn}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 