import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 상품 매핑 정보 조회 시작');

    // sheet_mappings 테이블에서 매핑 정보 조회
    const { data: mappings, error: mappingsError } = await supabase
      .from('sheet_mappings')
      .select(`
        original_name,
        original_option,
        product_id,
        products!inner(
          id,
          name,
          option
        )
      `);

    if (mappingsError) {
      console.error('❌ 매핑 정보 조회 실패:', mappingsError);
      return NextResponse.json({ error: '매핑 정보 조회 실패' }, { status: 500 });
    }

    console.log(`✅ 매핑 정보 조회 완료: ${mappings?.length || 0}개`);

    // product_id 목록 추출
    const productIds = mappings?.map(m => m.product_id).filter(Boolean) || [];

    // channel_pricing 정보 조회
    const { data: pricingData, error: pricingError } = await supabase
      .from('channel_pricing')
      .select('*')
      .in('product_id', productIds);

    if (pricingError) {
      console.error('❌ 가격 정보 조회 실패:', pricingError);
      return NextResponse.json({ error: '가격 정보 조회 실패' }, { status: 500 });
    }

    console.log(`✅ 가격 정보 조회 완료: ${pricingData?.length || 0}개`);

    // 매핑 정보를 키-값 형태로 변환
    const mappingMap: Record<string, any> = {};
    
    mappings?.forEach((mapping: any) => {
      const product = mapping.products;
      if (product) {
        // 해당 상품의 가격 정보 찾기
        const productPricing = pricingData?.filter(p => p.product_id === mapping.product_id) || [];
        
        const key = `${mapping.original_name}|${mapping.original_option || ''}`;
        mappingMap[key] = {
          mappedProductName: product.name,
          mappedOptionName: product.option,
          productId: mapping.product_id,
          pricing: productPricing
        };
      }
    });

    console.log(`📊 매핑 맵 생성 완료: ${Object.keys(mappingMap).length}개`);

    return NextResponse.json({
      success: true,
      data: mappingMap,
      count: Object.keys(mappingMap).length
    });

  } catch (error) {
    console.error('❌ 상품 매핑 API 오류:', error);
    return NextResponse.json(
      { error: '상품 매핑 정보 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 