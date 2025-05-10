'use client';

import { useState, useEffect, Fragment } from 'react';
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

export default function TotalSalesPage() {
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
    router.push(`/total-sales?year=${yearValue}`);
    
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
    return (
      <div className="container mx-auto py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">통합 매출</h1>
          <Skeleton className="h-10 w-24" />
        </div>
        
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>
              <Skeleton className="h-8 w-40" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[300px] w-full" />
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>
              <Skeleton className="h-8 w-40" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Skeleton className="h-10 w-full mb-4" />
            {[...Array(12)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full mb-2" />
            ))}
          </CardContent>
        </Card>
      </div>
    );
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
        
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-red-500">오류 발생</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{error}</p>
            <Button className="mt-4" onClick={() => loadData(selectedYear)}>다시 시도</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">통합 매출</h1>
        <div className="flex space-x-2">
          <Button variant="outline" size="icon" onClick={() => loadData(selectedYear)}>
            <RefreshCcw className="h-4 w-4" />
          </Button>
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
      </div>
      
      {/* 차트 */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>{selectedYear}년 월별 매출 추이</CardTitle>
          <CardDescription>매출 유형별 비교</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{
                  top: 20,
                  right: 30,
                  left: 20,
                  bottom: 5,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                <Legend />
                <Bar dataKey="storeSales" name="스토어 매출" fill="#8884d8" />
                <Bar dataKey="adRevenue" name="유료광고 수익" fill="#82ca9d" />
                <Bar dataKey="groupSales" name="공동구매 매출" fill="#ffc658" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
      
      {/* 테이블 */}
      <Card>
        <CardHeader>
          <CardTitle>{selectedYear}년 월별 매출</CardTitle>
          <CardDescription>각 월을 클릭하면 상세 정보를 볼 수 있습니다.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>월</TableHead>
                <TableHead className="text-right">스토어 매출</TableHead>
                <TableHead className="text-right">유료광고 수익</TableHead>
                <TableHead className="text-right">공동구매 매출</TableHead>
                <TableHead className="text-right">통합 매출</TableHead>
                <TableHead className="text-right">비고</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {monthlyData.map((month, index) => (
                <Fragment key={`month-${month.id}`}>
                  <TableRow 
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => loadMonthDetails(month, index)}
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center">
                        {month.isExpanded ? <ChevronUp className="h-4 w-4 mr-1" /> : <ChevronDown className="h-4 w-4 mr-1" />}
                        {month.month}월
                      </div>
                    </TableCell>
                    <TableCell className="text-right">{formatCurrency(month.storeSales)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(month.adRevenue)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(month.groupSales)}</TableCell>
                    <TableCell className="text-right font-bold">{formatCurrency(month.totalSales)}</TableCell>
                    <TableCell className="text-right">{month.notes}</TableCell>
                  </TableRow>
                  
                  {/* 상세 정보 */}
                  {month.isExpanded && (
                    <TableRow key={`month-${month.id}-detail`}>
                      <TableCell colSpan={6} className="p-0">
                        <div className="bg-gray-50 p-4">
                          {month.isLoadingDetails && (
                            <div className="flex justify-center p-4">
                              <p className="text-gray-500">상세 데이터 로딩 중...</p>
                            </div>
                          )}
                          
                          {!month.isLoadingDetails && month.detailView && month.detailView.length > 0 && (
                            <>
                              <h4 className="font-semibold mb-2">{month.month}월 상세 내역</h4>
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>날짜</TableHead>
                                    <TableHead>채널</TableHead>
                                    <TableHead>분류</TableHead>
                                    <TableHead className="text-right">금액</TableHead>
                                    <TableHead>설명</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {month.detailView.map((detail: any, i: number) => (
                                    <TableRow key={`month-${month.id}-detail-${i}`}>
                                      <TableCell>{detail.date}</TableCell>
                                      <TableCell>{detail.channel}</TableCell>
                                      <TableCell>{detail.category}</TableCell>
                                      <TableCell className="text-right">{formatCurrency(detail.amount)}</TableCell>
                                      <TableCell>{detail.description}</TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </>
                          )}
                          
                          {!month.isLoadingDetails && (!month.detailView || month.detailView.length === 0) && (
                            <div className="text-center p-4">
                              <p className="text-gray-500">상세 데이터가 없습니다.</p>
                            </div>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              ))}
              
              {/* 합계 행 */}
              <TableRow key="total" className="font-bold bg-gray-100">
                <TableCell>합계</TableCell>
                <TableCell className="text-right">{formatCurrency(totals.storeSales)}</TableCell>
                <TableCell className="text-right">{formatCurrency(totals.adRevenue)}</TableCell>
                <TableCell className="text-right">{formatCurrency(totals.groupSales)}</TableCell>
                <TableCell className="text-right">{formatCurrency(totals.totalSales)}</TableCell>
                <TableCell></TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
} 