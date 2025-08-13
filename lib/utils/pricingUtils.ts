/**
 * 기간별 가격 적용을 위한 유틸리티 함수들
 */

export interface ChannelPricing {
  id?: string;
  channel: string;
  fee: number;
  sellingPrice: number;
  supplyPrice: number;
  isAlwaysApply: boolean;
  startDate: string | null;
  endDate: string | null;
}

/**
 * 특정 날짜에 적용되는 가격 정보를 찾는 함수
 * @param channelPricing - 채널별 가격 정보 배열
 * @param channel - 찾을 채널명
 * @param targetDate - 적용할 날짜 (YYYY-MM-DD 형식)
 * @returns 해당 날짜에 적용되는 가격 정보 또는 null
 */
export function getApplicablePricing(
  channelPricing: ChannelPricing[],
  channel: string,
  targetDate: string
): ChannelPricing | null {
  // 해당 채널의 모든 가격 정보 필터링
  const channelPricings = channelPricing.filter(p => p.channel === channel);

  if (channelPricings.length === 0) {
    return null;
  }

  // 상시 적용되는 가격 정보 (fallback)
  const alwaysApplyPricing = channelPricings.find(p => p.isAlwaysApply);

  // 날짜 비교를 일(day) 단위로 정규화하여 타임존 영향 제거
  const toDateOnly = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const target = toDateOnly(new Date(targetDate));

  // 기간 후보 선별: 완전기간, 오픈엔드 시작만, 오픈엔드 종료만
  const candidates = channelPricings.filter(p => !p.isAlwaysApply).filter(p => {
    const hasStart = !!p.startDate;
    const hasEnd = !!p.endDate;

    if (!hasStart && !hasEnd) return false;

    const start = hasStart ? toDateOnly(new Date(p.startDate as string)) : null;
    const end = hasEnd ? toDateOnly(new Date(p.endDate as string)) : null;

    if (start && end) {
      // 완전기간: start <= target <= end
      return target >= start && target <= end;
    }
    if (start && !end) {
      // 오픈엔드(시작만): start <= target
      return target >= start;
    }
    if (!start && end) {
      // 오픈엔드(종료만): target <= end
      return target <= end;
    }
    return false;
  });

  if (candidates.length === 0) {
    return alwaysApplyPricing || null;
  }

  // 여러 후보가 겹치면 가장 최근에 시작한 기간 우선 (startDate 내림차순)
  candidates.sort((a, b) => {
    const aStart = a.startDate ? new Date(a.startDate).getTime() : -Infinity;
    const bStart = b.startDate ? new Date(b.startDate).getTime() : -Infinity;
    return bStart - aStart;
  });

  return candidates[0] || alwaysApplyPricing || null;
}

/**
 * 특정 날짜 범위에 적용되는 모든 가격 정보를 찾는 함수
 * @param channelPricing - 채널별 가격 정보 배열
 * @param channel - 찾을 채널명
 * @param startDate - 시작 날짜 (YYYY-MM-DD 형식)
 * @param endDate - 종료 날짜 (YYYY-MM-DD 형식)
 * @returns 해당 기간에 적용되는 가격 정보 배열
 */
export function getApplicablePricingsInRange(
  channelPricing: ChannelPricing[],
  channel: string,
  startDate: string,
  endDate: string
): ChannelPricing[] {
  const channelPricings = channelPricing.filter(p => p.channel === channel);
  
  if (channelPricings.length === 0) {
    return [];
  }

  const rangeStart = new Date(startDate);
  const rangeEnd = new Date(endDate);
  
  // 상시 적용되는 가격 정보
  const alwaysApplyPricing = channelPricings.find(p => p.isAlwaysApply);
  
  // 기간별 가격 정보 중 범위와 겹치는 것들 찾기
  const overlappingPricings = channelPricings.filter(p => {
    if (p.isAlwaysApply || !p.startDate || !p.endDate) return false;
    
    const pricingStart = new Date(p.startDate);
    const pricingEnd = new Date(p.endDate);
    
    // 날짜 범위가 겹치는지 확인
    return pricingStart <= rangeEnd && pricingEnd >= rangeStart;
  });

  const result: ChannelPricing[] = [];
  
  // 상시 적용 가격 추가
  if (alwaysApplyPricing) {
    result.push(alwaysApplyPricing);
  }
  
  // 겹치는 기간별 가격들 추가
  result.push(...overlappingPricings);
  
  return result;
}

/**
 * 특정 날짜에 적용되는 수수료율을 계산하는 함수
 * @param channelPricing - 채널별 가격 정보 배열
 * @param channel - 채널명
 * @param targetDate - 적용할 날짜 (YYYY-MM-DD 형식)
 * @returns 수수료율 (0-100)
 */
export function getApplicableFee(
  channelPricing: ChannelPricing[],
  channel: string,
  targetDate: string
): number {
  const pricing = getApplicablePricing(channelPricing, channel, targetDate);
  return pricing ? pricing.fee : 0;
}

/**
 * 특정 날짜에 적용되는 판매가를 계산하는 함수
 * @param channelPricing - 채널별 가격 정보 배열
 * @param channel - 채널명
 * @param targetDate - 적용할 날짜 (YYYY-MM-DD 형식)
 * @returns 판매가
 */
export function getApplicableSellingPrice(
  channelPricing: ChannelPricing[],
  channel: string,
  targetDate: string
): number {
  const pricing = getApplicablePricing(channelPricing, channel, targetDate);
  return pricing ? pricing.sellingPrice : 0;
}

/**
 * 특정 날짜에 적용되는 공급가를 계산하는 함수
 * @param channelPricing - 채널별 가격 정보 배열
 * @param channel - 채널명
 * @param targetDate - 적용할 날짜 (YYYY-MM-DD 형식)
 * @returns 공급가
 */
export function getApplicableSupplyPrice(
  channelPricing: ChannelPricing[],
  channel: string,
  targetDate: string
): number {
  const pricing = getApplicablePricing(channelPricing, channel, targetDate);
  return pricing ? pricing.supplyPrice : 0;
}

/**
 * 주문 날짜에 따른 매출 계산을 위한 함수
 * @param channelPricing - 채널별 가격 정보 배열
 * @param channel - 채널명
 * @param orderDate - 주문 날짜 (YYYY-MM-DD 형식)
 * @param quantity - 수량
 * @returns 매출 정보
 */
export function calculateRevenue(
  channelPricing: ChannelPricing[],
  channel: string,
  orderDate: string,
  quantity: number
): {
  revenue: number;
  cost: number;
  profit: number;
  fee: number;
  feeAmount: number;
} {
  const pricing = getApplicablePricing(channelPricing, channel, orderDate);
  
  if (!pricing) {
    return {
      revenue: 0,
      cost: 0,
      profit: 0,
      fee: 0,
      feeAmount: 0
    };
  }

  const revenue = pricing.sellingPrice * quantity;
  const cost = pricing.supplyPrice * quantity;
  const profit = revenue - cost;
  const feeAmount = revenue * (pricing.fee / 100);

  return {
    revenue,
    cost,
    profit,
    fee: pricing.fee,
    feeAmount
  };
} 