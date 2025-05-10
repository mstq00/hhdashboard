'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { RefreshCcw, ChevronDown, ChevronUp } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDate, formatCurrency, formatNumber } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface OrderItem {
  id: string;
  발주코드: string;
  발주명: string;
  발주차수: string;
  발주일: string;
  발주수량: number;
  단가: number;
  발주액: number;
  선금송금액: number;
  선금환율: number;
  잔금송금액: number;
  잔금환율: number;
  입항후비용: number;
  원화발주액: number;
  상태: string;
  입항예정일: string;
  최종입고일: string;
}

interface OrderGroup {
  발주코드: string;
  총발주액: number;
  총발주수량: number;
  차수목록: string[];
  최초발주일: string;
  최근발주일: string;
  상태: string;
  items: OrderItem[];
}

interface OrderListProps {
  orderGroups: OrderGroup[];
  isLoading: boolean;
  error: string | null;
  onRefresh: () => void;
}

type OrderStatus = '대기' | '진행중' | '완료' | '취소';

const STATUS_COLORS = {
  '대기': 'bg-yellow-100 text-yellow-800',
  '진행중': 'bg-blue-100 text-blue-800',
  '완료': 'bg-green-100 text-green-800',
  '취소': 'bg-gray-100 text-gray-800'
} as const;

function calculateOrderDetails(item: OrderItem) {
  // 발주액 = 단가 x 발주수량
  const 발주액 = item.단가 * item.발주수량;
  
  // 선금 원화 = 선금 x 선금환율
  const 선금원화 = item.선금송금액 * item.선금환율;
  
  // 잔금 송금 예정 금액 = 발주액 - 선금송금액
  const 잔금송금예정액 = item.잔금송금액 === 0 ? 발주액 - item.선금송금액 : item.잔금송금액;
  
  // 잔금 원화 = 잔금 x 잔금환율
  const 잔금원화 = item.잔금송금액 * item.잔금환율;

  // 제품원가 = (원화발주액 + 선금x선금환율 + 잔금x잔금환율 + 입항후비용) / 발주수량
  const 제품원가 = (item.원화발주액 + 선금원화 + 잔금원화 + item.입항후비용) / item.발주수량;
  
  // 송금상태 확인
  let 송금상태 = '송금전';
  if (item.선금송금액 > 0) {
    송금상태 = '선금완료';
    if (item.잔금송금액 > 0 && 잔금송금예정액 === item.잔금송금액) {
      송금상태 = '송금완료';
    }
  }

  return {
    발주액,
    선금원화,
    잔금송금예정액,
    잔금원화,
    제품원가,
    송금상태
  };
}

function OrderDetailRow({ item }: { item: OrderItem }) {
  const details = calculateOrderDetails(item);
  
  return (
    <div className="grid grid-cols-3 gap-4 p-4 text-sm bg-gray-50">
      <div>
        <h4 className="font-semibold mb-2">발주 정보</h4>
        <div className="space-y-1">
          <p>단가: {formatCurrency(item.단가, 'USD')}</p>
          <p>수량: {formatNumber(item.발주수량)}개</p>
          <p>발주액: {formatCurrency(details.발주액, 'USD')}</p>
          <p>원화발주액: {formatCurrency(item.원화발주액)}</p>
          <p>제품원가: {formatCurrency(details.제품원가)}</p>
        </div>
      </div>
      <div>
        <h4 className="font-semibold mb-2">송금 정보 <Badge variant="outline">{details.송금상태}</Badge></h4>
        <div className="space-y-1">
          <p>선금(USD): {formatCurrency(item.선금송금액, 'USD')}</p>
          <p>선금(KRW): {formatCurrency(details.선금원화)}</p>
          <p>잔금(USD): {formatCurrency(item.잔금송금액 || details.잔금송금예정액, 'USD')}</p>
          <p>잔금(KRW): {formatCurrency(details.잔금원화)}</p>
        </div>
      </div>
      <div>
        <h4 className="font-semibold mb-2">입항 정보</h4>
        <div className="space-y-1">
          <p>입항예정일: {formatDate(item.입항예정일)}</p>
          <p>최종입고일: {formatDate(item.최종입고일)}</p>
          <p>입항후비용: {formatCurrency(item.입항후비용)}</p>
        </div>
      </div>
    </div>
  );
}

export default function OrderList({ orderGroups, isLoading, error, onRefresh }: OrderListProps) {
  const [expandedDetails, setExpandedDetails] = useState<Set<string>>(new Set());

  const toggleDetails = (id: string) => {
    const newExpandedDetails = new Set(expandedDetails);
    if (expandedDetails.has(id)) {
      newExpandedDetails.delete(id);
    } else {
      newExpandedDetails.add(id);
    }
    setExpandedDetails(newExpandedDetails);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-48 w-full" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-500 mb-4">{error}</p>
        <Button onClick={onRefresh} variant="outline" size="sm">
          <RefreshCcw className="h-4 w-4 mr-2" />
          다시 시도
        </Button>
      </div>
    );
  }

  if (orderGroups.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        검색 조건에 맞는 발주 내역이 없습니다.
      </div>
    );
  }

  return (
    <ScrollArea className="h-[calc(100vh-200px)]">
      <div className="space-y-4">
        {orderGroups.map((group) => (
          <Card key={group.발주코드}>
            <CardHeader>
              <div className="flex-1">
                <CardTitle>{group.발주코드}</CardTitle>
                <div className="grid grid-cols-3 gap-4 mt-2 text-sm text-muted-foreground">
                  <p>{formatDate(group.최초발주일)} ~ {formatDate(group.최근발주일)}</p>
                  <p className="text-right">총 발주액: {formatCurrency(group.총발주액, 'USD')}</p>
                  <p className="text-right">총 수량: {formatNumber(group.총발주수량)}개</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {group.items.map((item) => {
                  const details = calculateOrderDetails(item);
                  return (
                    <div key={item.id} className="border rounded-lg overflow-hidden">
                      <div 
                        className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50"
                        onClick={() => toggleDetails(item.id)}
                      >
                        <div className="grid grid-cols-6 flex-1 gap-4">
                          <div>
                            <div className="font-medium">{item.발주차수}</div>
                            <div className="text-sm text-muted-foreground">{formatDate(item.발주일)}</div>
                          </div>
                          <div className="text-sm">
                            {item.발주명}
                          </div>
                          <div className="text-right">
                            <div className="font-medium">{formatNumber(item.발주수량)}개</div>
                            <div className="text-sm text-muted-foreground">수량</div>
                          </div>
                          <div className="text-right">
                            <div className="font-medium">{formatCurrency(details.발주액, 'USD')}</div>
                            <div className="text-sm text-muted-foreground">발주액</div>
                          </div>
                          <div>
                            <Badge variant="outline">
                              {details.송금상태}
                            </Badge>
                          </div>
                          <div>
                            <Badge variant="secondary" className={STATUS_COLORS[item.상태 as OrderStatus]}>
                              {item.상태}
                            </Badge>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleDetails(item.id);
                          }}
                        >
                          {expandedDetails.has(item.id) ? 
                            <ChevronUp className="h-4 w-4" /> : 
                            <ChevronDown className="h-4 w-4" />
                          }
                        </Button>
                      </div>
                      {expandedDetails.has(item.id) && (
                        <OrderDetailRow item={item} />
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </ScrollArea>
  );
} 