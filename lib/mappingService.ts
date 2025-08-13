import { getApplicablePricing, calculateRevenue, ChannelPricing as PricingInfo } from './utils/pricingUtils';

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
  fee: number; // 수수료율 추가
  channel: string;
  pricingData?: PricingInfo[]; // 기간별 가격 정보 추가
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
    return `${productName}-${cleanedOption}`;  // 하이픈으로 구분
  }

  async loadMappingData() {
    if (this.isLoaded) {
      return this.productMappings;
    }

    try {
      const { supabase } = await import('@/lib/supabase');
      
      // 1. sheet_mappings 테이블에서 매핑 정보 가져오기
      const { data: mappings, error: mappingsError } = await supabase
        .from('sheet_mappings')
        .select('*');

      if (mappingsError) {
        console.error('매핑 정보 로드 오류:', mappingsError);
        return;
      }

      // 2. products 테이블에서 상품 정보 가져오기
      const productIds = mappings.map(m => m.product_id).filter(Boolean);
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('*')
        .in('id', productIds);

      if (productsError) {
        console.error('상품 정보 로드 오류:', productsError);
        return;
      }

      // 3. channel_pricing 테이블에서 가격 정보 가져오기
      const { data: pricingData, error: pricingError } = await supabase
        .from('channel_pricing')
        .select('*')
        .in('product_id', productIds);

      if (pricingError) {
        console.error('가격 정보 로드 오류:', pricingError);
        return;
      }

      // 4. 매핑 정보 생성
      mappings.forEach(mapping => {
        const product = products.find(p => p.id === mapping.product_id);
        if (!product) {
          console.log(`상품 정보 없음: product_id=${mapping.product_id}`);
          return;
        }

        // original_name과 original_option으로 매핑 키 생성
        const key = this.createMappingKey(mapping.original_name || '', mapping.original_option);
        
        // 해당 상품의 가격 정보 찾기
        const productPricing = pricingData.filter(p => p.product_id === mapping.product_id);
        
        // 기본 가격 정보 (상시 적용되는 가격)
        const defaultPricing = productPricing.find(p => !p.start_date && !p.end_date) || productPricing[0];
        
        if (defaultPricing) {
          this.productMappings[key] = {
            product: product.name,
            option: product.option || '',
            price: defaultPricing.selling_price || 0,
            cost: defaultPricing.supply_price || 0,
            fee: defaultPricing.fee || 0,
            channel: defaultPricing.channel || '',
            pricingData: productPricing.map(p => ({
              id: p.id,
              channel: p.channel,
              fee: p.fee || 0,
              sellingPrice: p.selling_price || 0,
              supplyPrice: p.supply_price || 0,
              isAlwaysApply: !p.start_date && !p.end_date,
              startDate: p.start_date,
              endDate: p.end_date
            }))
          };
        }
      });

      this.isLoaded = true;
    } catch (error) {
      console.error('매핑 데이터 로드 중 오류:', error);
    }
  }

  getMappedProductInfo(productName: string, option: string | null | undefined, channel: string, orderDate?: string): MappedProductInfo | null {
    const key = this.createMappingKey(productName, option || '');
    const mappingInfo = this.productMappings[key];
    
    if (!mappingInfo) {
      return null;
    }

    // 주문 날짜가 있고 기간별 가격 정보가 있는 경우
    if (orderDate && mappingInfo.pricingData) {
      const applicablePricing = getApplicablePricing(mappingInfo.pricingData, channel, orderDate);
      if (applicablePricing) {
        return {
          ...mappingInfo,
          price: applicablePricing.sellingPrice,
          cost: applicablePricing.supplyPrice,
          fee: applicablePricing.fee,
          channel: applicablePricing.channel
        };
      }
    }

    // 채널별 가격 정보 찾기 (기간별 가격이 없는 경우)
    if (mappingInfo.pricingData) {
      const channelPricing = mappingInfo.pricingData.find(p => p.channel === channel);
      if (channelPricing) {
        return {
          ...mappingInfo,
          price: channelPricing.sellingPrice,
          cost: channelPricing.supplyPrice,
          fee: channelPricing.fee,
          channel: channelPricing.channel
        };
      }
    }

    // 기본 매핑 정보 반환 (채널이 일치하는 경우)
    if (mappingInfo.channel === channel) {
      return mappingInfo;
    }

    // 채널이 일치하지 않아도 기본 정보 반환 (가격 정보는 기본값 사용)
    return mappingInfo;
  }

  // 주문 날짜에 따른 매출 계산
  calculateRevenueWithDate(productName: string, option: string | null | undefined, channel: string, orderDate: string, quantity: number) {
    const key = this.createMappingKey(productName, option || '');
    const mappingInfo = this.productMappings[key];
    
    if (!mappingInfo || !mappingInfo.pricingData) {
      return {
        revenue: 0,
        cost: 0,
        profit: 0,
        fee: 0,
        feeAmount: 0
      };
    }

    return calculateRevenue(mappingInfo.pricingData, channel, orderDate, quantity);
  }

  // 통합 매출 집계 로직 추가 (기간별 가격 적용)
  calculateTotalSales(data: SalesItem[]): number {
    return data.reduce((total, item) => {
      if (['취소', '미결제취소', '반품'].includes(item.status)) {
        return total;
      }

      const mappingInfo = this.getMappedProductInfo(item.productName, item.optionName, item.channel, item.orderDate || undefined);
      if (mappingInfo) {
        return total + (mappingInfo.price * item.quantity);
      }
      return total;
    }, 0);
  }

  // 기간별 수수료 계산
  calculateCommissionWithDate(productName: string, option: string | null | undefined, channel: string, orderDate: string, quantity: number): number {
    const key = this.createMappingKey(productName, option || '');
    const mappingInfo = this.productMappings[key];
    
    if (!mappingInfo || !mappingInfo.pricingData) {
      return 0;
    }

    const revenueInfo = calculateRevenue(mappingInfo.pricingData, channel, orderDate, quantity);
    return revenueInfo.feeAmount;
  }
}