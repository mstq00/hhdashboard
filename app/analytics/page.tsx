"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { DateRange } from "react-day-picker";
import { format, subDays, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, parseISO, isBefore, isAfter, subYears } from "date-fns";
import { ko } from "date-fns/locale";
import { 
  BarChart as BarChartIcon, 
  LineChart as LineChartIcon, 
  Loader2,
  ChevronUp,
  ChevronDown,
  Info,
  ChevronRight
} from "lucide-react";
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  PieChart as RechartsPie,
  Pie,
  Cell,
  TooltipProps
} from "recharts";
import { cn } from "@/lib/utils";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue 
} from "@/components/ui/select";

// 데이터 가져오기 관련 import 추가 (DB 기반)
import { 
  filterDataByDateRange, 
  filterValidSalesData,
  aggregateProductSales,
  aggregateChannelSales,
  generatePeriodSalesData,
  generateDayOfWeekSalesData,
  calculateOrderAndCustomerCounts,
  calculateRepurchaseStats
} from "@/lib/databaseService";

// 유틸리티 함수 import
import { formatCurrency, formatNumber } from "@/lib/utils/numberUtils";
import { toKoreanTime } from "@/lib/utils/dateUtils";

// 판매 데이터 인터페이스 정의
interface SalesItem {
  channel: string;
  orderNumber: string;
  orderDate: string | null;
  customerName: string;
  customerID: string;
  productName: string;
  optionName: string;
  mappedProductName?: string;
  mappedOptionName?: string;
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
}

// 유틸 함수들
const getGrowthClass = (growth: number) => {
  return growth > 0 ? 'text-emerald-600' : growth < 0 ? 'text-red-600' : 'text-gray-500';
};

// CHANNELS 변수 정의 - 채널별 색상 및 ID 매핑
const CHANNELS = [
  { id: 'smartstore', name: '스마트스토어', color: '#03C75A' },
  { id: 'ohouse', name: '오늘의집', color: '#4D8DFF' },
  { id: 'ytshopping', name: '유튜브쇼핑', color: '#FF0000' },
  { id: 'coupang', name: '쿠팡', color: '#F39C12' }
];

// 채널명 가져오기 함수
const getChannelName = (channelId: string): string => {
  const channel = CHANNELS.find(ch => ch.id === channelId);
  return channel ? channel.name : channelId;
};

// 채널 ID로 색상 가져오기
const getChannelColor = (channelId: string): string => {
  const channel = CHANNELS.find(ch => ch.id === channelId);
  return channel ? channel.color : "#cccccc"; // 기본 색상
};

// 차트 컨테이너 컴포넌트 - 향상된 툴팁과 인터랙티브 기능을 위한 래퍼
const ChartContainer = ({ 
  title, 
  description, 
  children, 
  actions,
  type = "chart" // 차트 또는 테이블 타입
}: { 
  title: string;
  description?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  type?: "chart" | "table";
}) => {
  const [expanded, setExpanded] = useState(true);
  const [showInfo, setShowInfo] = useState(false);
  
  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <div className="flex items-center space-x-2">
          <CardTitle className="text-base">{title}</CardTitle>
          {description && (
            <div className="relative">
              <Info 
                size={16} 
                className="text-muted-foreground cursor-pointer" 
                onMouseEnter={() => setShowInfo(true)}
                onMouseLeave={() => setShowInfo(false)}
              />
              {showInfo && (
                <div className="absolute z-50 top-6 left-0 w-64 p-3 text-xs bg-white border rounded-md shadow-md">
                  {description}
                </div>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center space-x-2">
          {actions}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </Button>
        </div>
      </CardHeader>
      <CardContent className={cn(
        "transition-all",
        expanded 
          ? type === "chart" 
            ? "h-[300px] overflow-hidden" 
            : "overflow-visible" 
          : "h-0 py-0 overflow-hidden"
      )}>
        {children}
      </CardContent>
    </Card>
  );
};

// 고급 차트 툴팁 컴포넌트
const ChartTooltip = ({ active, payload, label, formatter, labelFormatter }: any) => {
  if (!active || !payload || payload.length === 0) return null;
  
  return (
    <div className="bg-white p-3 border rounded-lg shadow-md text-sm">
      <div className="font-semibold mb-2">
        {labelFormatter ? labelFormatter(label, payload) : label}
      </div>
      {payload.map((entry: any, index: number) => (
        <div key={`tooltip-item-${index}`} className="flex items-center mb-1">
          <div
            className="w-3 h-3 mr-2 rounded-sm"
            style={{ backgroundColor: entry.color }}
          />
          <span className="mr-2">{entry.name}:</span>
          <span className="font-medium">
            {formatter ? formatter(entry.value, entry.name) : entry.value}
          </span>
          </div>
      ))}
      {payload.length > 1 && (
        <div className="mt-2 pt-2 border-t border-gray-200">
          <div className="flex justify-between">
            <span>합계:</span>
            <span className="font-semibold">
              {formatter 
                ? formatter(payload.reduce((sum: number, entry: any) => sum + entry.value, 0), 'total')
                : payload.reduce((sum: number, entry: any) => sum + entry.value, 0)
              }
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

// 차트 툴팁 콘텐츠 커스텀 컴포넌트
const ChartTooltipContent = (props: TooltipProps<number, string>) => {
  const { active, payload, label } = props;
  
  if (!active || !payload || !payload.length) {
    return null;
  }
  
  // 날짜 포맷팅 적용
  let formattedLabel = label;
  try {
    if (typeof label === 'string' && label.includes('-')) {
      // parseISO 대신 직접 날짜 파싱 (시간대 변환 없이)
      const [year, month, day] = label.split('-');
      formattedLabel = `${month}/${day}`;
    }
  } catch (error) {
    console.error('날짜 포맷팅 오류:', error);
  }
  
  // 채널별로 정렬하여 일관된 순서 유지
  const sortedPayload = [...payload].sort((a, b) => {
    const indexA = CHANNELS.findIndex(c => c.id === a.dataKey);
    const indexB = CHANNELS.findIndex(c => c.id === b.dataKey);
    return indexA - indexB;
  });
  
  return (
    <div className="custom-tooltip bg-white p-3 border rounded-lg shadow-md">
      <p className="font-semibold mb-2">{formattedLabel}</p>
      {sortedPayload.map((entry, index) => (
        <div key={`item-${index}`} className="flex items-center mb-1">
          <div
            className="w-3 h-3 mr-2 rounded-sm"
            style={{ backgroundColor: entry.color }}
          />
          <span className="mr-2">{getChannelName(entry.dataKey as string)}:</span>
          <span className="font-medium">
            {formatCurrency(entry.value as number)}
          </span>
        </div>
      ))}
      <div className="mt-2 pt-2 border-t border-gray-200">
        <div className="flex justify-between">
          <span>총 매출:</span>
          <span className="font-semibold">
            {formatCurrency(
              sortedPayload.reduce((sum, entry) => sum + (entry.value as number), 0)
            )}
          </span>
        </div>
      </div>
    </div>
  );
};

// 제품별 판매 데이터 테이블 컴포넌트
interface ProductSalesTableProps {
  data: any[];
}

const ProductSalesTable: React.FC<ProductSalesTableProps> = ({ data }) => {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  
  // 제품명별로 그룹화 (매핑된 상품명 우선 사용)
  const groupedData = useMemo(() => {
    const groups: Record<string, any[]> = {};
    
    data.forEach(product => {
      // 매핑된 상품명 우선 사용, 없으면 원본 사용
      const productName = product.mappedProductName || product.productName;
      if (!groups[productName]) {
        groups[productName] = [];
      }
      groups[productName].push(product);
    });
    
    // 제품별 총 매출액 기준으로 정렬
    const sortedGroups: Record<string, any[]> = {};
    const sortedProductNames = Object.keys(groups).sort((a, b) => {
      const totalSalesA = groups[a].reduce((sum, p) => sum + (p.sales || 0), 0);
      const totalSalesB = groups[b].reduce((sum, p) => sum + (p.sales || 0), 0);
      return totalSalesB - totalSalesA; // 내림차순 정렬
    });
    
    sortedProductNames.forEach(productName => {
      sortedGroups[productName] = groups[productName];
    });
    
    return sortedGroups;
  }, [data]);
  
  // 그룹별 합계 계산
  const groupTotals = useMemo(() => {
    const totals: Record<string, any> = {};
    
    Object.entries(groupedData).forEach(([productName, products]) => {
      const totalQuantity = products.reduce((sum, p) => sum + (p.quantity || 0), 0);
      const totalSales = products.reduce((sum, p) => sum + (p.sales || 0), 0);
      const totalNetProfit = products.reduce((sum, p) => sum + (p.netProfit || 0), 0);
      const totalOperatingProfit = products.reduce((sum, p) => sum + (p.operatingProfit || 0), 0);
      
      // 매핑 상태 확인 - mappedProductName이 있으면 매핑완료로 간주
      const isMapped = products.some(p => p.mappedProductName || p.matchingStatus === '매핑완료');
      
      totals[productName] = {
        quantity: totalQuantity,
        sales: totalSales,
        netProfit: totalNetProfit,
        operatingProfit: totalOperatingProfit,
        marginRate: totalSales > 0 ? ((totalNetProfit / totalSales) * 100).toFixed(1) : '0.0',
        operatingMarginRate: totalSales > 0 ? ((totalOperatingProfit / totalSales) * 100).toFixed(1) : '0.0',
        matchingStatus: isMapped ? '매핑완료' : '미매핑'
      };
    });
    
    return totals;
  }, [groupedData]);
  
  // 전체 합계 계산
  const grandTotal = useMemo(() => {
    const totalQuantity = data.reduce((sum, p) => sum + p.quantity, 0);
    const totalSales = data.reduce((sum, p) => sum + p.sales, 0);
    const totalNetProfit = data.reduce((sum, p) => sum + p.netProfit, 0);
    const totalOperatingProfit = data.reduce((sum, p) => sum + (p.operatingProfit || 0), 0);
    
    return {
      quantity: totalQuantity,
      sales: totalSales,
      netProfit: totalNetProfit,
      operatingProfit: totalOperatingProfit,
      marginRate: totalSales > 0 ? ((totalNetProfit / totalSales) * 100).toFixed(1) : '0.0',
      operatingMarginRate: totalSales > 0 ? ((totalOperatingProfit / totalSales) * 100).toFixed(1) : '0.0'
    };
  }, [data]);
  
  // 그룹 접기/펼치기 토글
  const toggleGroup = (productName: string) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(productName)) {
        newSet.delete(productName);
      } else {
        newSet.add(productName);
      }
      return newSet;
    });
  };
  
  // 모든 그룹 펼치기/접기
  const toggleAllGroups = (expand: boolean) => {
    if (expand) {
      setExpandedGroups(new Set(Object.keys(groupedData)));
    } else {
      setExpandedGroups(new Set());
    }
  };
  
  return (
    <div className="space-y-2">
      {/* 전체 제어 버튼 */}
      <div className="flex justify-end gap-2 mb-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => toggleAllGroups(true)}
          className="text-xs"
        >
          모두 펼치기
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => toggleAllGroups(false)}
          className="text-xs"
        >
          모두 접기
        </Button>
      </div>
      
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[200px]">제품명</TableHead>
              <TableHead>옵션</TableHead>
              <TableHead className="text-right">판매량</TableHead>
              <TableHead className="text-right">매출액</TableHead>
              <TableHead className="text-right">순이익</TableHead>
              <TableHead className="text-right">마진율</TableHead>
              <TableHead className="text-right">영업이익</TableHead>
              <TableHead className="text-right">영업이익률</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Object.entries(groupedData).map(([productName, products]) => {
              const isExpanded = expandedGroups.has(productName);
              const hasMultipleOptions = products.length > 1;
              const groupTotal = groupTotals[productName];
              
              return (
                <React.Fragment key={productName}>
                  {/* 그룹 헤더 행 */}
                  <TableRow className="bg-gray-50 hover:bg-gray-100">
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <div 
                          className={`w-3 h-3 rounded-full ${groupTotal.matchingStatus === '매핑완료' ? 'bg-green-500' : 'bg-red-500'}`} 
                          title={groupTotal.matchingStatus === '매핑완료' ? '매핑 완료' : '미매핑'}
                        />
                        {hasMultipleOptions && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => toggleGroup(productName)}
                          >
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                        <span className="font-semibold">{productName}</span>
                        {hasMultipleOptions && (
                          <span className="text-xs text-muted-foreground">
                            ({products.length}개 옵션)
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {hasMultipleOptions ? (
                        <span className="text-muted-foreground">-</span>
                      ) : (
                        products[0].mappedOptionName || products[0].optionName
                      )}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatNumber(groupTotal.quantity)}개
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(groupTotal.sales)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(groupTotal.netProfit)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {groupTotal.marginRate}%
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(groupTotal.operatingProfit)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {groupTotal.operatingMarginRate}%
                    </TableCell>
                  </TableRow>
                  
                  {/* 옵션별 상세 행 (펼쳐진 상태에서만 표시) */}
                  {isExpanded && hasMultipleOptions && products.map((product, index) => (
                    <TableRow key={`${productName}-${index}`} className="bg-gray-25">
                      <TableCell className="pl-8">
                        <div className="flex items-center gap-2">
                          <div 
                            className={`w-2 h-2 rounded-full ${product.matchingStatus === '매핑완료' ? 'bg-green-500' : 'bg-red-500'}`} 
                            title={product.matchingStatus === '매핑완료' ? '매핑 완료' : '미매핑'}
                          />
                          <span className="text-sm text-muted-foreground">└ {product.mappedOptionName || product.optionName}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{product.mappedOptionName || product.optionName}</TableCell>
                      <TableCell className="text-right text-sm">
                        {formatNumber(product.quantity)}개
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {formatCurrency(product.sales)}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {formatCurrency(product.netProfit)}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {product.marginRate}%
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {formatCurrency(product.operatingProfit)}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {product.operatingMarginRate}%
                      </TableCell>
                    </TableRow>
                  ))}
                </React.Fragment>
              );
            })}
            
            {/* 전체 합계 행 */}
            <TableRow className="font-bold border-t-2 bg-blue-50">
              <TableCell colSpan={2}>전체 합계</TableCell>
              <TableCell className="text-right">
                {formatNumber(grandTotal.quantity)}개
              </TableCell>
              <TableCell className="text-right">
                {formatCurrency(grandTotal.sales)}
              </TableCell>
              <TableCell className="text-right">
                {formatCurrency(grandTotal.netProfit)}
              </TableCell>
              <TableCell className="text-right">
                {grandTotal.marginRate}%
              </TableCell>
              <TableCell className="text-right">
                {formatCurrency(grandTotal.operatingProfit)}
              </TableCell>
              <TableCell className="text-right">
                {grandTotal.operatingMarginRate}%
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

// 디바운스 함수
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    
    timerRef.current = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [value, delay]);
  
  return debouncedValue;
}

export default function DashboardPage() {
  // 기간 선택 상태 관리
  const [dateRange, setDateRange] = useState<DateRange>({
    from: startOfMonth(new Date()), // 이번달 1일부터 (시스템 시간 기준)
    to: new Date(), // 오늘까지 (시스템 시간 기준)
  });
  const [isLoading, setIsLoading] = useState(true);
  const [periodType, setPeriodType] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  
  // 데이터 상태 관리
  const [rawSalesData, setRawSalesData] = useState<any[]>([]);
  const [filteredData, setFilteredData] = useState<any[]>([]);
  const [productSalesData, setProductSalesData] = useState<any[]>([]);
  const [channelSalesData, setChannelSalesData] = useState<any[]>([]);
  const [periodSalesData, setPeriodSalesData] = useState<any[]>([]);
  const [dayOfWeekSalesData, setDayOfWeekSalesData] = useState<any[]>([]);
  const [summaryData, setSummaryData] = useState<any>(null);
  
  // 선택된 구매 고객 상세 타입
  const [customerDetailType, setCustomerDetailType] = useState<'new' | 'repeated'>('new');
  
  // 현재 데이터에 표시할 채널 선택 (기본값: 모든 채널 활성화)
  const [activeChannels, setActiveChannels] = useState<Record<string, boolean>>(
    CHANNELS.reduce((acc, channel) => ({ ...acc, [channel.id]: true }), {})
  );
  
  // 로딩 오류 상태 추가
  const [loadError, setLoadError] = useState<string | null>(null);
  
  // 중복 로드 방지를 위한 상태 추가
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);
  
  // 디바운스된 날짜 범위 (API 호출 최적화)
  const debouncedDateRange = useDebounce(dateRange, 500);
  
  // API에서 데이터 가져오기 함수
  const fetchSalesDataFromAPI = async (startDate: Date, endDate: Date) => {
    try {
      const startDateStr = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}-${String(startDate.getDate()).padStart(2, '0')}`;
      const endDateStr = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`;
      
      const params = new URLSearchParams({
        startDate: startDateStr,
        endDate: endDateStr,
        channel: 'all'
      });

      const response = await fetch(`/api/analytics/sales-data?${params}`, { cache: 'no-store' });
      
      if (!response.ok) {
        throw new Error(`API 호출 실패: ${response.status}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || '데이터 조회 실패');
      }

      const data = result.data || [];
      


      return data;
    } catch (error) {
      console.error('API 데이터 조회 오류:', error);
      throw error;
    }
  };
  
  // 최적화된 데이터 로드 함수 - 현재와 이전 기간을 한 번에 처리
  const loadDataForDateRange = useCallback(async (from?: Date, to?: Date) => {
    if (!from || !to) return;
    
    // 중복 로드 방지
    if (isDataLoading) {

      return;
    }
    
    try {
      // 한국시간 기준으로 날짜 로깅
      const formatKoreanDate = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}+09:00`;
      };
      

      setIsDataLoading(true);
      setLoadError(null);
      
      const startTime = Date.now();
      
      // 이전 기간 계산 (캐시 키 확인용)
      const currentStart = from;
      const currentEnd = to;
      
      let previousStart, previousEnd;
      
      // 현재가 '이번달'인 경우, 이전 비교 기간은 '지난달'로 설정
      if (currentStart.getDate() === 1 && 
          currentEnd.getMonth() === new Date().getMonth() && 
          currentEnd.getFullYear() === new Date().getFullYear()) {
        // 지난달 전체
        const lastMonth = subMonths(currentStart, 1);
        previousStart = startOfMonth(lastMonth);
        previousEnd = endOfMonth(lastMonth);
      } else {
        // 그외 경우 - 현재 선택한 기간과 동일한 길이의 이전 기간
        const diffTime = currentEnd.getTime() - currentStart.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        
        previousStart = new Date(currentStart);
        previousStart.setDate(previousStart.getDate() - diffDays);
        
        previousEnd = new Date(currentStart);
        previousEnd.setDate(previousEnd.getDate() - 1);
      }
      
      // 💡 성능 최적화: 캐시된 데이터가 없을 때만 로딩 상태 표시
      setIsLoading(true);
      
      // 🎯 최적화: 현재와 이전 기간 데이터를 한 번에 로드 (DB에서)
      const [currentPeriodData, previousPeriodData] = await Promise.all([
        fetchSalesDataFromAPI(currentStart, currentEnd),
        fetchSalesDataFromAPI(previousStart, previousEnd)
      ]);
      
      const loadTime = Date.now() - startTime;

      
      // 현재 기간 데이터 설정
      setRawSalesData(currentPeriodData);
      
      // 유효한 데이터만 필터링
      const validCurrentData = filterValidSalesData(currentPeriodData);
      const validPreviousData = filterValidSalesData(previousPeriodData);

      // 안전장치: 서버가 반환한 범위에 예외가 섞여 있어도 KST 기준으로 한 번 더 날짜 범위 필터링
      const validCurrentDataInRange = filterDataByDateRange(validCurrentData, currentStart, currentEnd);
      const validPreviousDataInRange = filterDataByDateRange(validPreviousData, previousStart, previousEnd);
      
      setFilteredData(validCurrentDataInRange);
      
      // 즉시 모든 데이터 처리
      await processAllDashboardData(validCurrentDataInRange, validPreviousDataInRange, previousStart, previousEnd);
      
      setIsLoading(false);
    } catch (error) {
      console.error('❌ 데이터 로딩 오류:', error);
      setLoadError('데이터를 불러오는 중 오류가 발생했습니다.');
      setIsLoading(false);
    } finally {
      setIsDataLoading(false);
    }
    }, [isDataLoading]);

  // 모든 대시보드 데이터 처리 함수
  const processAllDashboardData = useCallback(async (
    currentPeriodData: SalesItem[], 
    previousPeriodData: SalesItem[], 
    previousStart: Date, 
    previousEnd: Date
  ) => {
    try {
      setIsLoading(true);
      
      // 마이크로 딜레이로 UI 응답성 개선
      const microDelay = () => new Promise(resolve => setTimeout(resolve, 1));
      
      // 제품별 매출 집계
      await microDelay();

      
      // 매핑된 상품명과 옵션명을 먼저 적용한 후 집계
      const mappedData = currentPeriodData.map(item => ({
        ...item,
        productName: item.mappedProductName || item.productName,
        optionName: item.mappedOptionName || item.optionName
      }));
      

      
      const aggregatedProductSales = aggregateProductSales(mappedData);
      setProductSalesData(aggregatedProductSales);
      
      // 채널별 매출 집계
      await microDelay();
      const aggregatedChannelSales = aggregateChannelSales(currentPeriodData);
      
      // 차트용 데이터로 변환
      const totalSales = aggregatedChannelSales.reduce((sum, channel) => sum + channel.sales, 0);
      const chartChannelData = aggregatedChannelSales.map(channel => ({
        channel: channel.channel,
        channelName: getChannelName(channel.channel),
        sales: channel.sales,
        percentage: totalSales > 0 ? (channel.sales / totalSales) * 100 : 0
      }));
      
      setChannelSalesData(chartChannelData);
      
      // 기간별 매출 데이터 (일간/주간/월간)
      await microDelay();
      const periodData = generatePeriodSalesData(currentPeriodData, periodType);
      

      
      setPeriodSalesData(periodData);
      
      // 요일별 매출 데이터
      await microDelay();
      const dayOfWeekData = generateDayOfWeekSalesData(currentPeriodData);
      setDayOfWeekSalesData(dayOfWeekData);
      
      // 주문 및 고객 수 계산 (현재 기간)
      await microDelay();
      const currentCounts = calculateOrderAndCustomerCounts(currentPeriodData);
      
      // 재구매 통계 (현재 기간)
      await microDelay();
      const repurchaseStats = calculateRepurchaseStats(currentPeriodData);
      
      // 현재 기간 총 매출
      await microDelay();
      const currentTotalSales = currentPeriodData.reduce((sum, item) => {
        return sum + (item.totalSales || (item.price * item.quantity) || 0);
      }, 0);
      
      // 이전 기간 데이터 처리
      const previousCounts = calculateOrderAndCustomerCounts(previousPeriodData);
      const previousTotalSales = previousPeriodData.reduce((sum, item) => {
        return sum + (item.totalSales || (item.price * item.quantity) || 0);
      }, 0);
      
      // 성장률 계산
      const salesGrowth = previousTotalSales ? 
        ((currentTotalSales - previousTotalSales) / previousTotalSales) * 100 : 0;
      
      const orderGrowth = previousCounts.orderCount ? 
        ((currentCounts.orderCount - previousCounts.orderCount) / previousCounts.orderCount) * 100 : 0;
      
      const customerGrowth = previousCounts.customerCount ? 
        ((currentCounts.customerCount - previousCounts.customerCount) / previousCounts.customerCount) * 100 : 0;
      
      // 요약 데이터 설정
      setSummaryData({
        sales: currentTotalSales || 0,
        salesGrowth: parseFloat((salesGrowth || 0).toFixed(1)),
        salesPrevious: previousTotalSales || 0,
        orderCount: currentCounts?.orderCount || 0,
        orderGrowth: parseFloat((orderGrowth || 0).toFixed(1)),
        orderPrevious: previousCounts?.orderCount || 0,
        customerCount: currentCounts?.customerCount || 0,
        customerGrowth: parseFloat((customerGrowth || 0).toFixed(1)),
        customerPrevious: previousCounts?.customerCount || 0,
        repurchaseStats,
        // 이전 기간 정보 추가
        previousPeriod: {
          start: previousStart,
          end: previousEnd
        }
      });
      

    } catch (error) {
      console.error('❌ 대시보드 데이터 처리 오류:', error);
      throw error;
    }
  }, [periodType]);

  // 초기 데이터 로딩 (컴포넌트 마운트 시 한 번만)
  useEffect(() => {
    if (!hasInitialized && dateRange?.from && dateRange?.to) {

      setHasInitialized(true);
      loadDataForDateRange(dateRange.from, dateRange.to);
    }
  }, [dateRange?.from, dateRange?.to, hasInitialized, loadDataForDateRange]);
  
  // 이전 디바운스된 값을 추적하여 실제 변경시에만 로드
  const prevDebouncedDateRangeRef = useRef<DateRange | undefined>(undefined);
  
  useEffect(() => {
    if (hasInitialized && debouncedDateRange?.from && debouncedDateRange?.to) {
      const prev = prevDebouncedDateRangeRef.current;
      const current = debouncedDateRange;
      
      // 이전 디바운스된 값과 비교 (실제 변경 확인)
      const hasChanged = !prev ||
        prev.from?.getTime() !== current.from?.getTime() ||
        prev.to?.getTime() !== current.to?.getTime();
      
      if (hasChanged) {
        // 한국시간 기준으로 날짜 로깅
        const formatKoreanDate = (date: Date) => {
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          const hours = String(date.getHours()).padStart(2, '0');
          const minutes = String(date.getMinutes()).padStart(2, '0');
          const seconds = String(date.getSeconds()).padStart(2, '0');
          return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}+09:00`;
        };
        

        loadDataForDateRange(current.from!, current.to!);
        prevDebouncedDateRangeRef.current = current;
      }
    }
  }, [debouncedDateRange, hasInitialized]);
  
  // ⚠️ 기존 useEffect 제거됨 - 최적화된 loadDataForDateRange에서 모든 처리 완료
  
  // ⚠️ 기존 loadPreviousPeriodData 제거됨 - processAllDashboardData로 통합
  

  
  // 기간 빠른 선택 버튼 핸들러 (최적화됨)
  const handleQuickPeriod = useCallback((period: string) => {
    const today = new Date();
    let from, to;
    
    switch (period) {
      case 'today':
        from = today;
        to = today;
        break;
      case 'yesterday':
        from = subDays(today, 1);
        to = subDays(today, 1);
        break;
      case '7days':
        from = subDays(today, 6);
        to = today;
        break;
      case '30days':
        from = subDays(today, 29);
        to = today;
        break;
      case 'this-month':
        from = startOfMonth(today);
        to = today;
        break;
      case 'last-month':
        const lastMonth = subMonths(today, 1);
        from = startOfMonth(lastMonth);
        to = endOfMonth(lastMonth);
        break;
      case 'this-week':
        from = startOfWeek(today, { weekStartsOn: 1 }); // 월요일 시작
        to = today;
        break;
      case '3months':
        from = subMonths(today, 3);
        to = today;
        break;
      case '6months':
        from = subMonths(today, 6);
        to = today;
        break;
      case 'all':
        // 전체 기간 (2023년 6월 1일부터 현재까지)
        from = new Date(2023, 5, 1); // 2023년 6월 1일 (월은 0부터 시작하므로 5)
        to = today;
        break;
      default:
        return;
    }
    
    // 현재 선택된 날짜와 같으면 무시 (불필요한 리로드 방지)
    const currentFrom = dateRange?.from?.getTime();
    const currentTo = dateRange?.to?.getTime();
    const newFrom = from.getTime();
    const newTo = to.getTime();
    
    if (currentFrom === newFrom && currentTo === newTo) {

      return;
    }
    

    setDateRange({ from, to });
  }, [dateRange]);
  
  // 채널 토글 핸들러
  const toggleChannel = (channelId: string) => {
    setActiveChannels(prev => ({
      ...prev,
      [channelId]: !prev[channelId]
    }));
  };
  
  // 선택된 기간의 포맷된 문자열
  const dateRangeText = useMemo(() => {
    if (!dateRange?.from) return '';
    if (!dateRange.to) return format(dateRange.from, 'PPP', { locale: ko });
    
    if (format(dateRange.from, 'yyyy-MM-dd') === format(dateRange.to, 'yyyy-MM-dd')) {
      return format(dateRange.from, 'PPP', { locale: ko });
    }
    
    return `${format(dateRange.from, 'PPP', { locale: ko })} ~ ${format(dateRange.to, 'PPP', { locale: ko })}`;
  }, [dateRange]);

  return (
    <div className="space-y-4 sm:space-y-6 p-3 sm:p-4 pb-16">
      {/* 기간 선택 섹션 */}
      <div className="flex flex-col sm:flex-row justify-between items-start gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">스토어 분석</h1>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <div className="flex gap-1 flex-wrap">
          <Button
            variant="outline"
            size="sm"
              className="text-xs px-2 py-1 h-7 sm:h-9 sm:text-sm"
              onClick={() => handleQuickPeriod('today')}
          >
            오늘
          </Button>
          <Button
            variant="outline"
            size="sm"
              className="text-xs px-2 py-1 h-7 sm:h-9 sm:text-sm"
              onClick={() => handleQuickPeriod('yesterday')}
          >
            어제
          </Button>
          <Button
            variant="outline"
            size="sm"
              className="text-xs px-2 py-1 h-7 sm:h-9 sm:text-sm"
              onClick={() => handleQuickPeriod('7days')}
          >
              7일
          </Button>
          <Button
            variant="outline"
            size="sm"
              className="text-xs px-2 py-1 h-7 sm:h-9 sm:text-sm"
              onClick={() => handleQuickPeriod('this-month')}
          >
              이번달
          </Button>
          <Button
            variant="outline"
            size="sm"
              className="text-xs px-2 py-1 h-7 sm:h-9 sm:text-sm"
              onClick={() => handleQuickPeriod('last-month')}
          >
              지난달
          </Button>
          <Button
            variant="outline"
            size="sm"
              className="text-xs px-2 py-1 h-7 sm:h-9 sm:text-sm"
              onClick={() => handleQuickPeriod('3months')}
          >
              이전 3개월
          </Button>
          <Button
            variant="outline"
            size="sm"
              className="text-xs px-2 py-1 h-7 sm:h-9 sm:text-sm"
              onClick={() => handleQuickPeriod('6months')}
          >
              이전 6개월
          </Button>
          <Button
            variant="outline"
            size="sm"
              className="text-xs px-2 py-1 h-7 sm:h-9 sm:text-sm"
              onClick={() => handleQuickPeriod('all')}
          >
              전체
          </Button>
          </div>
          <div className="w-full sm:w-auto">
            <DateRangePicker
              dateRange={dateRange}
              setDateRange={setDateRange}
              align="end"
              className="w-full sm:w-auto"
            />
          </div>
        </div>
      </div>

      {/* 로딩 표시 */}
      {isLoading && (
        <div className="flex justify-center items-center py-6 sm:py-8">
          <Loader2 className="h-6 w-6 sm:size-8 animate-spin text-muted-foreground" />
          <span className="ml-2 text-sm text-muted-foreground">데이터 로드 중...</span>
        </div>
      )}
      
      {/* 오류 메시지 */}
      {loadError && !isLoading && (
        <div className="p-4 my-4 bg-red-50 border border-red-200 rounded-md text-red-600">
          <p className="text-center">{loadError}</p>
          <p className="text-center text-sm mt-2">
            다시 시도하려면 페이지를 새로고침하거나 다른 날짜 범위를 선택하세요.
          </p>
        </div>
      )}
      
      {/* 데이터 없음 메시지 */}
      {!isLoading && !loadError && rawSalesData.length === 0 && (
        <div className="p-4 my-4 bg-blue-50 border border-blue-200 rounded-md text-blue-600">
          <p className="text-center">선택한 기간에 데이터가 없습니다.</p>
          <p className="text-center text-sm mt-2">
            다른 날짜 범위를 선택하거나 데이터가 있는지 확인하세요.
          </p>
        </div>
      )}
      
      {/* 주요 지표 카드 */}
      {!isLoading && !loadError && summaryData && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mt-3 sm:mt-4">
          {/* 총 매출 카드 */}
            <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground">총 매출</p>
                  <h2 className="text-xl sm:text-2xl md:text-3xl font-bold mt-1">{formatCurrency(summaryData.sales)}</h2>
                </div>
                <div className={`flex flex-col items-end ${getGrowthClass(summaryData.salesGrowth)}`}>
                  <span className="font-medium text-sm sm:text-base">{summaryData.salesGrowth > 0 ? '+' : ''}{summaryData.salesGrowth}%</span>
                  <span className="text-xs opacity-70">vs 이전</span>
                </div>
              </div>
              <div className="text-xs text-muted-foreground mt-2 sm:mt-3 break-words">
                이전 기간 ({format(summaryData.previousPeriod.start, 'yyyy.MM.dd', { locale: ko })} ~ {format(summaryData.previousPeriod.end, 'yyyy.MM.dd', { locale: ko })}): {formatCurrency(summaryData.salesPrevious)}
                </div>
              </CardContent>
            </Card>

          {/* 총 구매자 수 카드 */}
            <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground">총 구매자 수</p>
                  <h2 className="text-xl sm:text-2xl md:text-3xl font-bold mt-1">{formatNumber(summaryData.customerCount)}명</h2>
                </div>
                <div className={`flex flex-col items-end ${getGrowthClass(summaryData.customerGrowth)}`}>
                  <span className="font-medium text-sm sm:text-base">{summaryData.customerGrowth > 0 ? '+' : ''}{summaryData.customerGrowth}%</span>
                  <span className="text-xs opacity-70">vs 이전</span>
                </div>
              </div>
              <div className="text-xs text-muted-foreground mt-2 sm:mt-3 break-words">
                이전 기간 ({format(summaryData.previousPeriod.start, 'yyyy.MM.dd', { locale: ko })} ~ {format(summaryData.previousPeriod.end, 'yyyy.MM.dd', { locale: ko })}): {formatNumber(summaryData.customerPrevious)}명
                </div>
              </CardContent>
            </Card>

          {/* 총 구매 건수 카드 */}
            <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground">총 구매 건수</p>
                  <h2 className="text-xl sm:text-2xl md:text-3xl font-bold mt-1">{formatNumber(summaryData.orderCount)}건</h2>
                </div>
                <div className={`flex flex-col items-end ${getGrowthClass(summaryData.orderGrowth)}`}>
                  <span className="font-medium text-sm sm:text-base">{summaryData.orderGrowth > 0 ? '+' : ''}{summaryData.orderGrowth}%</span>
                  <span className="text-xs opacity-70">vs 이전</span>
                </div>
              </div>
              <div className="text-xs text-muted-foreground mt-2 sm:mt-3 break-words">
                이전 기간 ({format(summaryData.previousPeriod.start, 'yyyy.MM.dd', { locale: ko })} ~ {format(summaryData.previousPeriod.end, 'yyyy.MM.dd', { locale: ko })}): {formatNumber(summaryData.orderPrevious)}건
                </div>
              </CardContent>
            </Card>
          </div>
      )}

          {/* 차트 영역 */}
      {!isLoading && !loadError && periodSalesData.length > 0 && dayOfWeekSalesData.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mt-4 sm:mt-6">

          {/* 기간별 매출 차트 */}
          <ChartContainer
            title="기간별 매출 추이"
            description="선택한 기간 동안의 매출 추이를 채널별로 확인할 수 있습니다."
            actions={
              <div className="flex items-center space-x-1 sm:space-x-2">
                  <Button
                  variant={periodType === 'daily' ? 'default' : 'outline'} 
                    size="sm"
                  className="text-xs px-2 py-1 h-7 sm:h-9 sm:text-sm"
                  onClick={() => setPeriodType('daily')}
                  >
                  일간
                  </Button>
                  <Button
                  variant={periodType === 'weekly' ? 'default' : 'outline'} 
                    size="sm"
                  className="text-xs px-2 py-1 h-7 sm:h-9 sm:text-sm"
                  onClick={() => setPeriodType('weekly')}
                  >
                  주간
                  </Button>
                  <Button
                  variant={periodType === 'monthly' ? 'default' : 'outline'} 
                    size="sm"
                  className="text-xs px-2 py-1 h-7 sm:h-9 sm:text-sm"
                  onClick={() => setPeriodType('monthly')}
                  >
                  월간
                  </Button>
                </div>
            }
          >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={periodSalesData}
                      margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                      barGap={0}
                      barCategoryGap="30%"
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
                      <XAxis 
                        dataKey="period" 
                        tick={{ fontSize: 11 }}
                        tickFormatter={(value) => {
                          try {
                            if (periodType === 'daily') {
                              // parseISO 대신 직접 날짜 파싱 (시간대 변환 없이)
                              const [year, month, day] = value.split('-');
                              return `${month}/${day}`;
                            } else if (periodType === 'weekly') {
                              return value.replace('W', '주 ');
                            } else if (periodType === 'monthly') {
                              // 월간도 직접 파싱
                              const [year, month] = value.split('-');
                              return `${year}/${month}`;
                            }
                            return value;
                          } catch (error) {
                            return value;
                          }
                        }}
                      />
                      <YAxis 
                        tickFormatter={(value) => `${value / 10000}만`} 
                        width={45}
                        tick={{ fontSize: 11 }}
                      />
                      <Tooltip content={<ChartTooltipContent />} />
                      <Legend
                        formatter={(value) => getChannelName(value)}
                        iconType="square"
                        iconSize={10}
                        wrapperStyle={{ paddingTop: 10, fontSize: 11 }}
                        onClick={(data) => {
                          if (typeof data.dataKey === 'string') {
                            toggleChannel(data.dataKey);
                          }
                        }}
                        inactiveColor="#CCCCCC"
                        payload={
                          CHANNELS.map(channel => ({
                            value: getChannelName(channel.id),
                            id: channel.id,
                            type: 'square',
                            color: activeChannels[channel.id] ? channel.color : '#CCCCCC',
                            dataKey: channel.id,
                            inactive: !activeChannels[channel.id]
                          }))
                        }
                      />
                      {CHANNELS.map(channel => (
                        <Bar 
                          key={channel.id}
                          dataKey={channel.id} 
                          stackId="a"
                          name={channel.name}
                          fill={channel.color}
                          hide={!activeChannels[channel.id]}
                        />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
          </ChartContainer>
          
          {/* 요일별 매출 분석 */}
          <ChartContainer
            title="요일별 매출 분석"
            description="요일별 판매 패턴을 분석하여 마케팅 전략을 수립하는 데 활용하세요."
          >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={dayOfWeekSalesData}
                      margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                      barGap={0}
                      barCategoryGap="30%"
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
                      <XAxis 
                        dataKey="dayName" 
                        tick={{ fontSize: 11 }}
                      />
                      <YAxis 
                        tickFormatter={(value) => `${value / 10000}만`} 
                        width={45}
                        tick={{ fontSize: 11 }}
                      />
                      <Tooltip content={<ChartTooltipContent />} />
                      <Legend 
                        formatter={(value) => getChannelName(value)}
                        iconType="square"
                        iconSize={10}
                        wrapperStyle={{ paddingTop: 10, fontSize: 11 }}
                        onClick={(data) => {
                          if (typeof data.dataKey === 'string') {
                            toggleChannel(data.dataKey);
                          }
                        }}
                        inactiveColor="#CCCCCC"
                        payload={
                          CHANNELS.map(channel => ({
                            value: getChannelName(channel.id),
                            id: channel.id,
                            type: 'square',
                            color: activeChannels[channel.id] ? channel.color : '#CCCCCC',
                            dataKey: channel.id,
                            inactive: !activeChannels[channel.id]
                          }))
                        }
                      />
                      {CHANNELS.map(channel => (
                        <Bar 
                          key={channel.id}
                          dataKey={channel.id} 
                          stackId="a"
                          name={channel.name}
                          fill={channel.color}
                          hide={!activeChannels[channel.id]}
                        />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
          </ChartContainer>
        </div>
      )}
      
      {/* 차트 데이터 없음 메시지 */}
      {!isLoading && !loadError && (periodSalesData.length === 0 || dayOfWeekSalesData.length === 0) && (
        <div className="p-4 my-4 bg-yellow-50 border border-yellow-200 rounded-md text-yellow-600">
          <p className="text-center">차트 데이터를 생성할 수 없습니다.</p>
        </div>
      )}
      
      {/* 제품별 판매 데이터 */}
      {!isLoading && !loadError && productSalesData && productSalesData.length > 0 && (
        <ChartContainer
          title="제품별 판매 데이터"
          description="각 제품의 판매량과 매출 현황을 확인할 수 있습니다. 같은 제품명의 옵션별 상세 내역을 접기/펼치기할 수 있습니다."
          type="table"
        >
          <ProductSalesTable data={productSalesData} />
        </ChartContainer>
      )}
      
      {/* 판매처별 판매현황 섹션 */}
      {!isLoading && !loadError && channelSalesData && channelSalesData.length > 0 && (
        <ChartContainer
          title="판매처별 판매현황"
          description="각 판매 채널별 매출 비중을 확인할 수 있습니다."
        >
          <div className="flex flex-col md:flex-row justify-between items-center h-full">
            {/* 도넛 차트 영역 */}
            <div className="w-full md:w-1/2 h-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height={280}>
                <RechartsPie>
                  <Pie
                    data={channelSalesData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="sales"
                    nameKey="channelName"
                    label={(entry) => `${entry.channelName}: ${Math.round(entry.percentage)}%`}
                    labelLine={false}
                  >
                    {channelSalesData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={CHANNELS.find(ch => ch.id === entry.channel)?.color || '#ccc'} 
                      />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => formatCurrency(value)} 
                    content={<ChartTooltipContent />}
                  />
                </RechartsPie>
              </ResponsiveContainer>
            </div>
            
            {/* 테이블 영역 */}
            <div className="w-full md:w-1/2">
                  <Table>
                    <TableHeader>
                      <TableRow>
                    <TableHead>판매처</TableHead>
                    <TableHead className="text-right">매출액</TableHead>
                    <TableHead className="text-right">비율</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                  {channelSalesData.map((channel, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: CHANNELS.find(ch => ch.id === channel.channel)?.color || '#ccc' }} />
                          {channel.channelName}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(channel.sales)}</TableCell>
                      <TableCell className="text-right">{(channel.percentage || 0).toFixed(1)}%</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                </div>
        </ChartContainer>
      )}
    </div>
  );
}