import { NextResponse } from 'next/server';

// API 키 인증 방식 설정
// 코드의 API 키를 사용하되, 환경 변수가 있으면 우선 사용
const hardcodedApiKey = 'AIzaSyD1I839Np6CFFysPqwSQlxBDYPiFzguBiM';
const API_KEY = process.env.GOOGLE_API_KEY || hardcodedApiKey;

/**
 * 구글 시트에서 데이터를 가져오는 API 엔드포인트
 * @param request - API 요청 객체
 * @returns 구글 시트 데이터
 */
export async function GET(request: Request) {
  try {
    // URL에서 쿼리 파라미터 추출
    const { searchParams } = new URL(request.url);
    const spreadsheetId = searchParams.get('spreadsheetId');
    const range = searchParams.get('range');

    // 필수 파라미터 확인
    if (!spreadsheetId || !range) {
      console.error(`필수 파라미터 누락: spreadsheetId=${spreadsheetId}, range=${range}`);
      return NextResponse.json(
        { error: 'spreadsheetId와 range 파라미터가 필요합니다.' },
        { status: 400 }
      );
    }

    console.log(`구글 시트 데이터 요청: ${spreadsheetId}, 범위: ${range}`);
    console.log(`API 키: ${API_KEY.substring(0, 10)}... (일부 표시)`);

    // range 값을 URL 인코딩
    const encodedRange = encodeURIComponent(range);
    
    // 구글 시트 API v4 직접 호출
    const googleApiUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodedRange}?key=${API_KEY}&prettyPrint=false`;
    console.log(`구글 API URL: ${googleApiUrl.replace(API_KEY, 'API_KEY_HIDDEN')}`);

    try {
      // 직접 Google Sheets API 호출
      console.log(`API 요청 시작...`);
      const response = await fetch(googleApiUrl, {
        headers: {
          'Accept': 'application/json'
        },
        // 재시도 비활성화, 타임아웃 설정
        cache: 'no-store'
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`구글 API 응답 오류 (${response.status}): ${errorText}`);
        
        // 오류 원인 분석을 위한 메시지
        let errorMessage = `구글 시트 API 오류 (${response.status})`;
        if (response.status === 403) {
          errorMessage += ': 권한이 거부되었습니다. 구글 시트가 공개 설정되어 있는지 확인하세요.';
        } else if (response.status === 404) {
          errorMessage += ': 찾을 수 없습니다. 스프레드시트 ID 또는 시트 범위를 확인하세요.';
        }
        
        return NextResponse.json(
          { 
            error: errorMessage, 
            status: response.status,
            message: response.statusText,
            details: errorText,
            url: googleApiUrl.replace(API_KEY, 'API_KEY_HIDDEN'),
            requestParams: {
              spreadsheetId,
              range,
              encodedRange
            }
          },
          { status: response.status }
        );
      }

      const data = await response.json();
      console.log('구글 API 응답 성공:', JSON.stringify(data).substring(0, 200) + '...');
      console.log('가져온 행 수:', data.values?.length || 0);
      
      // 응답 데이터 반환
      return NextResponse.json({ values: data.values || [] });
    } catch (apiError: any) {
      console.error('구글 시트 API 상세 오류:', apiError);
      
      return NextResponse.json(
        { 
          error: '구글 시트 API 오류', 
          details: {
            message: apiError.message,
            stack: apiError.stack,
            url: googleApiUrl.replace(API_KEY, 'API_KEY_HIDDEN'),
            requestParams: {
              spreadsheetId,
              range,
              encodedRange
            }
          }
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('구글 시트 API 일반 오류:', error);
    return NextResponse.json(
      { 
        error: '구글 시트 데이터를 가져오는 중 오류가 발생했습니다.',
        message: error.message
      },
      { status: 500 }
    );
  }
} 