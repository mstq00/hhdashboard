import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// 환경 변수 확인
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Supabase 환경 변수가 설정되지 않았습니다:', {
    url: supabaseUrl,
    hasServiceKey: !!supabaseServiceKey
  });
}

const supabase = createClient(supabaseUrl!, supabaseServiceKey!, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

export async function POST(request: NextRequest) {
  try {
    console.log('매핑 저장 API 호출됨');
    
    const body = await request.json();
    console.log('요청 본문:', body);
    
    const { channel, mapping, userId } = body;

    if (!channel || !mapping || typeof mapping !== 'object') {
      console.log('필수 데이터 누락:', { channel, mapping, userId });
      return NextResponse.json(
        { error: '필수 데이터가 누락되었습니다.' },
        { status: 400 }
      );
    }

    console.log('Supabase 연결 확인:', {
      url: process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY
    });

    // 기존 매핑 삭제 (해당 채널의 모든 매핑)
    const deleteResult = await supabase
      .from('channel_mappings')
      .delete()
      .eq('channel', channel);

    if (deleteResult.error) {
      console.error('기존 매핑 삭제 오류:', deleteResult.error);
      return NextResponse.json(
        { error: `기존 매핑 삭제 오류: ${deleteResult.error.message}` },
        { status: 500 }
      );
    }

    console.log('기존 매핑 삭제 완료');

    // 새 매핑 데이터 삽입 (upsert 방식 사용)
    const mappingData = Object.entries(mapping).map(([excelColumn, databaseColumn]) => ({
      channel,
      excel_column: excelColumn,
      database_column: databaseColumn as string,
      is_default: false
    }));

    console.log('삽입할 매핑 데이터:', mappingData);

    if (mappingData.length > 0) {
      const { data, error } = await supabase
        .from('channel_mappings')
        .upsert(mappingData, {
          onConflict: 'channel,excel_column,database_column',
          ignoreDuplicates: false
        })
        .select();

      if (error) {
        console.error('매핑 저장 오류:', error);
        return NextResponse.json(
          { error: `매핑 저장 중 오류가 발생했습니다: ${error.message}` },
          { status: 500 }
        );
      }

      console.log('매핑 저장 성공:', data);
    }

    return NextResponse.json({
      success: true,
      message: '매핑이 저장되었습니다.'
    });

  } catch (error) {
    console.error('매핑 저장 예외 오류:', error);
    return NextResponse.json(
      { error: `매핑 저장 중 예외가 발생했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}` },
      { status: 500 }
    );
  }
}

// 저장된 매핑 조회
export async function GET(request: NextRequest) {
  try {
    console.log('매핑 조회 API 호출됨');
    
    const { searchParams } = new URL(request.url);
    const channel = searchParams.get('channel');
    
    console.log('요청된 채널:', channel);

    if (!channel) {
      return NextResponse.json(
        { error: '채널이 필요합니다.' },
        { status: 400 }
      );
    }

    // 기본 매핑과 사용자 정의 매핑 조회
    const { data, error } = await supabase
      .from('channel_mappings')
      .select('excel_column, database_column, is_default')
      .eq('channel', channel)
      .order('is_default', { ascending: false });

    if (error) {
      console.error('매핑 조회 오류:', error);
      return NextResponse.json(
        { error: '매핑 조회 중 오류가 발생했습니다.' },
        { status: 500 }
      );
    }

    console.log('데이터베이스에서 조회된 매핑:', data);

    // 매핑 객체로 변환 (사용자 정의 매핑이 우선)
    const mapping: Record<string, string> = {};
    data?.forEach(item => {
      if (!mapping[item.excel_column]) {
        mapping[item.excel_column] = item.database_column;
      }
    });

    console.log('변환된 매핑 객체:', mapping);

    return NextResponse.json({
      success: true,
      data: mapping
    });

  } catch (error) {
    console.error('매핑 조회 예외 오류:', error);
    return NextResponse.json(
      { error: '매핑 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 