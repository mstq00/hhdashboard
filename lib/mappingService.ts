export interface SalesItem {
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
  matchingStatus?: string;
  marginRate?: string;
  operatingProfit?: number;
  operatingMarginRate?: string;
  totalSales?: number;
  type?: string;
  category?: string;
  amount?: number;
  isSettlementComplete?: boolean;
  settlementAmount?: number;
}

interface MappedProductInfo {
  product: string;
  option: string;
  price: number;
  cost: number;
  channel: string;
}

interface SheetMapping {
  id: string;
  product_id: string;
  original_name: string | null;
  original_option: string | null;
  created_at: string;
}

interface ProductInfo {
  id: string;
  name: string;
  option: string | null;
  status: string | null;
  created_at: string;
  updated_at: string;
}

export class MappingService {
  private productMappings: Record<string, MappedProductInfo> = {};
  private isLoaded: boolean = false;

  // 매핑 키 생성 함수 - 스토어 분석과 동일하게 수정
  private createMappingKey(productName: string, option: string | null | undefined): string {
    if (!productName) return '';
    const cleanedOption = option || '';
    console.log(`매핑 키 생성: 상품명=${productName}, 옵션=${cleanedOption}`);
    return `${productName}-${cleanedOption}`;  // 하이픈으로 구분
  }

  async loadMappingData() {
    if (this.isLoaded) {
      console.log('이미 로드된 매핑 데이터 반환');
      return this.productMappings;
    }

    try {
      const { supabase } = await import('@/lib/supabase');
      
      console.log('상품 정보와 가격 정보 로드 시작');
      // 1. 상품 정보와 채널 가격 정보를 함께 가져오기
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('id, name, option, status')
        .eq('status', 'active');

      if (productsError) {
        console.error('상품 정보 로드 오류:', productsError);
        return;
      }

      for (const product of products) {
        const { data: pricingData, error: pricingError } = await supabase
          .from('channel_pricing')
          .select('selling_price, channel')
          .eq('product_id', product.id);

        if (pricingError) {
          console.error('가격 정보 로드 오류:', pricingError);
          continue;
        }

        pricingData.forEach(pricing => {
          const key = this.createMappingKey(product.name, product.option || '');
          this.productMappings[key] = {
            product: product.name,
            option: product.option || '',
            price: pricing.selling_price || 0,
            cost: 0,  // 기본값 설정
            channel: pricing.channel || ''
          };
        });
      }

      this.isLoaded = true;
      console.log('매핑 데이터 로드 완료');
    } catch (error) {
      console.error('매핑 데이터 로드 중 오류:', error);
    }
  }

  getMappedProductInfo(productName: string, option: string | null | undefined, channel: string): MappedProductInfo | null {
    const key = this.createMappingKey(productName, option || '');
    const mappingInfo = this.productMappings[key];
    if (mappingInfo && mappingInfo.channel === channel) {
      return mappingInfo;
    }
    console.log(`매핑 정보 없음: 상품명=${productName}, 옵션=${option}, 채널=${channel}`);
    return null;
  }

  // 통합 매출 집계 로직 추가
  calculateTotalSales(data: SalesItem[]): number {
    return data.reduce((total, item) => {
      const mappingInfo = this.getMappedProductInfo(item.productName, item.optionName, item.channel);
      if (mappingInfo && !['취소', '미결제취소', '반품'].includes(item.status)) {
        return total + (mappingInfo.price * item.quantity);
      }
      return total;
    }, 0);
  }
}