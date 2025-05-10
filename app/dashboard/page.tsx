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
  Info
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

// 데이터 가져오기 관련 import 추가
import { 
  fetchAllSalesData, 
  filterDataByDateRange, 
  filterValidSalesData,
  aggregateProductSales,
  aggregateChannelSales,
  generatePeriodSalesData,
  generateDayOfWeekSalesData,
  calculateOrderAndCustomerCounts,
  calculateRepurchaseStats
} from "@/lib/googleSheets";

// 유틸리티 함수 import
import { formatCurrency, formatNumber } from "@/lib/utils/numberUtils";

// 판매 데이터 인터페이스 정의
interface SalesItem {
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
      const date = parseISO(label);
      formattedLabel = format(date, 'MM/dd', { locale: ko });
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
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()), // 이번달 1일부터
    to: new Date(), // 오늘까지
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
  
  // 디바운스된 날짜 범위 (API 호출 최적화)
  const debouncedDateRange = useDebounce(dateRange, 500);
  
  // 날짜 범위를 이용한 데이터 로드 함수
  const loadDataForDateRange = useCallback(async (from?: Date, to?: Date) => {
    if (!from || !to) return;
    
    try {
      console.log(`${from.toLocaleDateString()} ~ ${to.toLocaleDateString()} 범위의 데이터 로드 중...`);
      setIsLoading(true);
      
      // 선택된 기간에 대한 데이터만 로드
      const salesData = await fetchAllSalesData(from, to);
      console.log(`${salesData.length}개 판매 데이터 로드 완료`);
      
      setRawSalesData(salesData);
      setIsLoading(false);
    } catch (error) {
      console.error('데이터 로딩 오류:', error);
      setIsLoading(false);
    }
  }, []);
  
  // 초기 데이터 로딩 (컴포넌트 마운트 시 한 번)
  useEffect(() => {
    if (dateRange?.from && dateRange?.to) {
      loadDataForDateRange(dateRange.from, dateRange.to);
    }
  }, []);
  
  // 디바운스된 날짜 범위가 변경되면 데이터 다시 로드
  useEffect(() => {
    if (debouncedDateRange?.from && debouncedDateRange?.to) {
      loadDataForDateRange(debouncedDateRange.from, debouncedDateRange.to);
    }
  }, [debouncedDateRange, loadDataForDateRange]);
  
  // 날짜 범위에 따른 데이터 필터링 및 계산
  useEffect(() => {
    if (!rawSalesData.length || !dateRange?.from || !dateRange?.to) return;
    
    try {
      setIsLoading(true);
      
      // 유효한 주문 상태만 필터링 (rawSalesData는 이미 날짜로 필터링됨)
      const validSalesData = filterValidSalesData(rawSalesData);
      setFilteredData(validSalesData);
      
      // 현재 기간과 이전 기간 계산
      const currentStart = dateRange.from;
      const currentEnd = dateRange.to;
      
      // 이전 기간 계산 방식 변경 - 비교 기간은 지난달 전체로 설정
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
      
      // 이전 기간 데이터를 별도로 불러옴
      loadPreviousPeriodData(previousStart, previousEnd, validSalesData);
      
    } catch (error) {
      console.error('데이터 필터링 오류:', error);
      setIsLoading(false);
    }
  }, [rawSalesData, dateRange]);
  
  // 이전 기간 데이터 로드 및 처리
  const loadPreviousPeriodData = async (previousStart: Date, previousEnd: Date, currentPeriodData: SalesItem[]) => {
    try {
      // 이전 기간 데이터 로드
      const previousPeriodData = await fetchAllSalesData(previousStart, previousEnd);
      const validPreviousSalesData = filterValidSalesData(previousPeriodData);
      
      // 제품별 매출 집계
      const aggregatedProductSales = aggregateProductSales(currentPeriodData);
      setProductSalesData(aggregatedProductSales);
      
      // 채널별 매출 집계
      const aggregatedChannelSales = aggregateChannelSales(currentPeriodData);
      setChannelSalesData(aggregatedChannelSales);
      
      // 기간별 매출 데이터 (일간/주간/월간)
      const periodData = generatePeriodSalesData(currentPeriodData, periodType);
      setPeriodSalesData(periodData);
      
      // 요일별 매출 데이터
      const dayOfWeekData = generateDayOfWeekSalesData(currentPeriodData);
      setDayOfWeekSalesData(dayOfWeekData);
      
      // 주문 및 고객 수 계산
      const currentCounts = calculateOrderAndCustomerCounts(currentPeriodData);
      const previousCounts = calculateOrderAndCustomerCounts(validPreviousSalesData);
      
      // 재구매 통계 (현재 기간)
      const repurchaseStats = calculateRepurchaseStats(currentPeriodData);
      
      // 현재 기간 총 매출
      const currentTotalSales = currentPeriodData.reduce((sum, item) => {
        return sum + (item.totalSales || (item.price * item.quantity) || 0);
      }, 0);
      
      // 이전 기간 총 매출
      const previousTotalSales = validPreviousSalesData.reduce((sum, item) => {
        return sum + (item.totalSales || (item.price * item.quantity) || 0);
      }, 0);
      
      // 성장률 계산
      const salesGrowth = previousTotalSales ? 
        ((currentTotalSales - previousTotalSales) / previousTotalSales) * 100 : 0;
      
      const orderGrowth = previousCounts.totalOrders ? 
        ((currentCounts.totalOrders - previousCounts.totalOrders) / previousCounts.totalOrders) * 100 : 0;
      
      const customerGrowth = previousCounts.totalCustomers ? 
        ((currentCounts.totalCustomers - previousCounts.totalCustomers) / previousCounts.totalCustomers) * 100 : 0;
      
      // 요약 데이터 설정
      setSummaryData({
        sales: currentTotalSales,
        salesGrowth: parseFloat(salesGrowth.toFixed(1)),
        salesPrevious: previousTotalSales,
        orderCount: currentCounts.totalOrders,
        orderGrowth: parseFloat(orderGrowth.toFixed(1)),
        orderPrevious: previousCounts.totalOrders,
        customerCount: currentCounts.totalCustomers,
        customerGrowth: parseFloat(customerGrowth.toFixed(1)),
        customerPrevious: previousCounts.totalCustomers,
        repurchaseStats,
        // 이전 기간 정보 추가
        previousPeriod: {
          start: previousStart,
          end: previousEnd
        }
      });
      
      setIsLoading(false);
    } catch (error) {
      console.error('이전 기간 데이터 처리 오류:', error);
      setIsLoading(false);
    }
  };
  
  // 기간 타입 변경 시 차트 데이터 업데이트
  useEffect(() => {
    if (!filteredData.length) return;
    
    const newPeriodData = generatePeriodSalesData(filteredData, periodType);
    setPeriodSalesData(newPeriodData);
  }, [filteredData, periodType]);
  
  // 기간 빠른 선택 버튼 핸들러
  const handleQuickPeriod = (period: string) => {
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
        // 전체 기간 (데이터 시작부터 현재까지)
        // 데이터 중 가장 오래된 날짜를 찾거나, 임의의 충분히 이전 날짜(2년 전)로 설정
        from = subYears(today, 2);  
        to = today;
        break;
      default:
        return;
    }
    
    setDateRange({ from, to });
  };
  
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
        </div>
      )}
      
      {/* 주요 지표 카드 */}
      {!isLoading && summaryData && (
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
      {!isLoading && periodSalesData.length > 0 && dayOfWeekSalesData.length > 0 && (
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
                      return format(parseISO(value), 'MM/dd', { locale: ko });
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
                />
                {CHANNELS.filter(channel => activeChannels[channel.id]).map(channel => (
                        <Bar 
                          key={channel.id}
                          dataKey={channel.id} 
                    stackId="a"
                          name={channel.name}
                    fill={channel.color}
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
                />
                {CHANNELS.filter(channel => activeChannels[channel.id]).map(channel => (
                        <Bar 
                          key={channel.id}
                          dataKey={channel.id} 
                    stackId="a"
                          name={channel.name}
                    fill={channel.color}
                        />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
          </ChartContainer>
        </div>
      )}
      
      {/* 제품별 판매 데이터 */}
      {!isLoading && productSalesData && productSalesData.length > 0 && (
        <ChartContainer
          title="제품별 판매 데이터"
          description="각 제품의 판매량과 매출 현황을 확인할 수 있습니다."
          type="table"
        >
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[180px]">제품명</TableHead>
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
                {productSalesData.map((product, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <div 
                          className={`w-3 h-3 rounded-full ${product.matchingStatus === '매칭 성공' ? 'bg-green-500' : 'bg-red-500'}`} 
                          title={product.matchingStatus === '매칭 성공' ? '매핑 완료' : '매핑 필요'}
                        />
                        {product.productName}
                      </div>
                    </TableCell>
                    <TableCell>{product.option}</TableCell>
                    <TableCell className="text-right">{formatNumber(product.quantity)}개</TableCell>
                    <TableCell className="text-right">{formatCurrency(product.sales)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(product.netProfit)}</TableCell>
                    <TableCell className="text-right">{product.marginRate}%</TableCell>
                    <TableCell className="text-right">{formatCurrency(product.operatingProfit)}</TableCell>
                    <TableCell className="text-right">{product.operatingMarginRate}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </ChartContainer>
      )}
      
      {/* 판매처별 판매현황 섹션 */}
      {!isLoading && channelSalesData && channelSalesData.length > 0 && (
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
                      <TableCell className="text-right">{channel.percentage.toFixed(1)}%</TableCell>
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