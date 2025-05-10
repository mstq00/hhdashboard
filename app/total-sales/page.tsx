'use client';

import { useState, useEffect, Fragment, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronDown, ChevronUp, Download, RefreshCcw } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// 타입 정의
interface MonthlyData {
  id: string;
  month: number;
  storeSales: number;
  adRevenue: number;
  groupSales: number;
  totalSales: number;
  notes: string;
  isExpanded?: boolean;
  detailView?: any[];
  isLoadingDetails?: boolean;
}

interface TotalData {
  storeSales: number;
  adRevenue: number;
  groupSales: number;
  totalSales: number;
}

// 숫자 포맷 함수
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(value);
};

// 퍼센트 포맷 함수
const formatPercent = (value: number) => {
  return `${value.toFixed(1)}%`;
};

// 페이지 컨텐츠 컴포넌트
function TotalSalesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const yearParam = searchParams.get('year');
  
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<number>(yearParam ? parseInt(yearParam) : currentYear);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [totals, setTotals] = useState<TotalData>({ storeSales: 0, adRevenue: 0, groupSales: 0, totalSales: 0 });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // 데이터 로드 함수
  const loadData = async (year: number) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/notion/total-sales?year=${year}`);
      
      if (!response.ok) {
        throw new Error(`데이터 로드 실패: ${response.status} ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || '데이터를 가져오는 중 오류가 발생했습니다.');
      }
      
      // 확장 상태 추가
      const dataWithState = result.data.map((item: MonthlyData) => ({
        ...item,
        isExpanded: false,
        detailView: null,
        isLoadingDetails: false,
      }));
      
      setMonthlyData(dataWithState);
      setTotals(result.totals);
    } catch (err: any) {
      console.error('데이터 로드 오류:', err);
      setError(err.message || '데이터를 가져오는 중 오류가 발생했습니다.');
      setMonthlyData([]);
      setTotals({ storeSales: 0, adRevenue: 0, groupSales: 0, totalSales: 0 });
    } finally {
      setIsLoading(false);
    }
  };

  // 월별 상세 데이터 로드
  const loadMonthDetails = async (monthData: MonthlyData, index: number) => {
    // 이미 로드된 경우 토글 상태만 변경
    if (monthData.detailView) {
      const updatedData = [...monthlyData];
      updatedData[index] = {
        ...updatedData[index],
        isExpanded: !updatedData[index].isExpanded,
      };
      setMonthlyData(updatedData);
      return;
    }
    
    // 로딩 상태 설정
    const updatedData = [...monthlyData];
    updatedData[index] = {
      ...updatedData[index],
      isExpanded: true,
      isLoadingDetails: true,
    };
    setMonthlyData(updatedData);
    
    try {
      const response = await fetch(`/api/notion/total-sales?year=${selectedYear}&month=${monthData.month}`);
      
      if (!response.ok) {
        throw new Error(`상세 데이터 로드 실패: ${response.status} ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || '상세 데이터를 가져오는 중 오류가 발생했습니다.');
      }
      
      // 상세 데이터 업데이트
      const finalUpdatedData = [...monthlyData];
      finalUpdatedData[index] = {
        ...finalUpdatedData[index],
        detailView: result.data,
        isLoadingDetails: false,
      };
      setMonthlyData(finalUpdatedData);
    } catch (err: any) {
      console.error('상세 데이터 로드 오류:', err);
      
      // 오류 상태 업데이트
      const finalUpdatedData = [...monthlyData];
      finalUpdatedData[index] = {
        ...finalUpdatedData[index],
        isLoadingDetails: false,
        detailView: [{ error: err.message || '상세 데이터를 가져오는 중 오류가 발생했습니다.' }],
      };
      setMonthlyData(finalUpdatedData);
    }
  };

  // 연도 변경 처리
  const handleYearChange = (newYear: string) => {
    const yearValue = parseInt(newYear);
    setSelectedYear(yearValue);
    
    // URL 업데이트
    router.push(`/total-sales?year=${yearValue}&skip_auth=true`);
    
    // 데이터 로드
    loadData(yearValue);
  };

  // 초기 데이터 로드
  useEffect(() => {
    loadData(selectedYear);
  }, []);

  // 연도 선택 옵션 생성 (최근 5년)
  const yearOptions = [];
  for (let year = currentYear; year >= currentYear - 4; year--) {
    yearOptions.push(year);
  }

  // 차트 데이터 포맷
  const chartData = monthlyData.map(item => ({
    name: `${item.month}월`,
    storeSales: item.storeSales,
    adRevenue: item.adRevenue,
    groupSales: item.groupSales,
  }));

  // 로딩 상태 컴포넌트
  if (isLoading) {
    return <TotalSalesLoading />;
  }

  // 에러 상태 컴포넌트
  if (error) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">통합 매출</h1>
          <Select value={selectedYear.toString()} onValueChange={handleYearChange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="연도 선택" />
            </SelectTrigger>
            <SelectContent>
              {yearOptions.map(year => (
                <SelectItem key={year} value={year.toString()}>{year}년</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <Card className="p-6 bg-red-50 border-red-200 mb-6">
          <div className="flex flex-col items-center text-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-red-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <h2 className="text-xl font-semibold text-red-700 mb-2">데이터를 불러올 수 없습니다</h2>
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={() => loadData(selectedYear)} variant="outline" className="flex items-center">
              <RefreshCcw className="mr-2 h-4 w-4" />
              다시 시도
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // 정상 데이터 표시
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold">통합 매출</h1>
        <Select value={selectedYear.toString()} onValueChange={handleYearChange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="연도 선택" />
          </SelectTrigger>
          <SelectContent>
            {yearOptions.map(year => (
              <SelectItem key={year} value={year.toString()}>{year}년</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      {/* 요약 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">스토어 매출</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totals.storeSales)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">광고 매출</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totals.adRevenue)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">그룹 매출</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totals.groupSales)}</div>
          </CardContent>
        </Card>
      </div>
      
      {/* 차트 */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>월별 매출 추이</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full overflow-x-auto">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip 
                  formatter={(value: number) => [formatCurrency(value), '']}
                  labelFormatter={(label) => `${label} 매출`}
                />
                <Legend />
                <Bar dataKey="storeSales" name="스토어 매출" fill="#8884d8" />
                <Bar dataKey="adRevenue" name="광고 매출" fill="#82ca9d" />
                <Bar dataKey="groupSales" name="그룹 매출" fill="#ffc658" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
      
      {/* 테이블 */}
      <Card>
        <CardHeader>
          <CardTitle>월별 매출 상세</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>월</TableHead>
                <TableHead className="text-right">스토어 매출</TableHead>
                <TableHead className="text-right">광고 매출</TableHead>
                <TableHead className="text-right">그룹 매출</TableHead>
                <TableHead className="text-right">총 매출</TableHead>
                <TableHead>비고</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {monthlyData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-4">데이터가 없습니다</TableCell>
                </TableRow>
              ) : (
                monthlyData.map((month, index) => (
                  <Fragment key={month.id || index}>
                    <TableRow>
                      <TableCell>{month.month}월</TableCell>
                      <TableCell className="text-right">{formatCurrency(month.storeSales)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(month.adRevenue)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(month.groupSales)}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(month.totalSales)}</TableCell>
                      <TableCell>{month.notes}</TableCell>
                      <TableCell>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => loadMonthDetails(month, index)}
                          disabled={month.isLoadingDetails}
                        >
                          {month.isLoadingDetails ? (
                            <RefreshCcw className="h-4 w-4 animate-spin" />
                          ) : month.isExpanded ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                    
                    {/* 상세 정보 표시 */}
                    {month.isExpanded && month.detailView && (
                      <TableRow className="bg-muted/50">
                        <TableCell colSpan={7} className="p-0">
                          <div className="p-4">
                            {!month.detailView.length ? (
                              <p className="text-center text-muted-foreground py-2">상세 데이터가 없습니다</p>
                            ) : (
                              <div>
                                <h4 className="font-semibold mb-2">상세 내역</h4>
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead className="py-2">채널</TableHead>
                                      <TableHead className="py-2">분류</TableHead>
                                      <TableHead className="text-right py-2">금액</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {month.detailView.map((detail: any, i: number) => (
                                      <TableRow key={`detail-${i}`}>
                                        <TableCell className="py-2">{detail.channel}</TableCell>
                                        <TableCell className="py-2">{detail.category}</TableCell>
                                        <TableCell className="text-right py-2">{formatCurrency(detail.amount)}</TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </div>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                ))
              )}
              
              {/* 합계 행 */}
              <TableRow className="font-bold border-t-2">
                <TableCell>합계</TableCell>
                <TableCell className="text-right">{formatCurrency(totals.storeSales)}</TableCell>
                <TableCell className="text-right">{formatCurrency(totals.adRevenue)}</TableCell>
                <TableCell className="text-right">{formatCurrency(totals.groupSales)}</TableCell>
                <TableCell className="text-right">{formatCurrency(totals.totalSales)}</TableCell>
                <TableCell></TableCell>
                <TableCell></TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

// 로딩 상태 컴포넌트
function TotalSalesLoading() {
  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">통합 매출</h1>
        <Skeleton className="h-10 w-24" />
      </div>
      
      {/* 스켈레톤 로딩 UI */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-32 mb-2" />
              <Skeleton className="h-4 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
      
      <Card className="mb-6">
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-full" />
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-12 w-full mt-2" />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

// 메인 export 컴포넌트 - Suspense 경계 포함
export default function TotalSalesPage() {
  return (
    <Suspense fallback={<TotalSalesLoading />}>
      <TotalSalesContent />
    </Suspense>
  );
} 