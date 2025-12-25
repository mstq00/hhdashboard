'use client';

import * as React from "react";
import { useState, useEffect, useMemo } from 'react';
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
import { ChevronDown, ChevronUp, Download, RefreshCcw, TrendingUp, DollarSign, Calendar, Info, PieChart, BarChart3, Target } from "lucide-react";
import { ComposedChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Line, Cell, PieChart as RePie, Pie } from 'recharts';
import { useRightPanel } from "@/lib/context/right-panel-context";

// 타입 정의
interface MonthlyData {
  id: string;
  month: number;
  storeSales: number;
  adRevenue: number;
  groupSales: number;
  totalSales: number;
  expectedProfit: number;
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
  expectedProfit: number;
}

type InsightType = 'total' | 'store' | 'ad' | 'group' | 'profit';

// 숫자 포맷 함수
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(value);
};

// 퍼센트 포맷 함수
const formatPercent = (value: number) => {
  return `${value.toFixed(1)}%`;
};

// 전년 대비 증감률 계산 함수
const calculateGrowthRate = (current: number, previous: number): number => {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
};

// 증감률 표시 함수
const formatGrowthRate = (current: number, previous: number) => {
  const rate = calculateGrowthRate(current, previous);
  const isPositive = rate >= 0;
  const color = isPositive ? 'text-[var(--pastel-trend-up-fg)]' : 'text-[var(--pastel-trend-down-fg)]';
  const icon = isPositive ? '↗' : '↘';

  return {
    rate: Math.abs(rate),
    color,
    icon,
    isPositive
  };
};

// 페이지 컨텐츠 컴포넌트
function TotalSalesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const yearParam = searchParams.get('year');

  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<number>(yearParam ? parseInt(yearParam) : currentYear);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [totals, setTotals] = useState<TotalData>({ storeSales: 0, adRevenue: 0, groupSales: 0, totalSales: 0, expectedProfit: 0 });
  const [prevYearTotals, setPrevYearTotals] = useState<TotalData>({ storeSales: 0, adRevenue: 0, groupSales: 0, totalSales: 0, expectedProfit: 0 });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { setContent } = useRightPanel();
  const [selectedInsight, setSelectedInsight] = useState<InsightType>('total');

  // 데이터 로드 함수
  const loadData = async (year: number) => {
    setIsLoading(true);
    setError(null);

    try {
      // 현재 연도 데이터 가져오기
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

      // 전년 데이터 가져오기
      try {
        const prevYearResponse = await fetch(`/api/notion/total-sales?year=${year - 1}`);
        if (prevYearResponse.ok) {
          const prevYearResult = await prevYearResponse.json();
          if (prevYearResult.success) {
            setPrevYearTotals(prevYearResult.totals);
          }
        }
      } catch (prevYearError) {
        setPrevYearTotals({ storeSales: 0, adRevenue: 0, groupSales: 0, totalSales: 0, expectedProfit: 0 });
      }
    } catch (err: any) {
      setError(err.message || '데이터를 가져오는 중 오류가 발생했습니다.');
      setMonthlyData([]);
      setTotals({ storeSales: 0, adRevenue: 0, groupSales: 0, totalSales: 0, expectedProfit: 0 });
      setPrevYearTotals({ storeSales: 0, adRevenue: 0, groupSales: 0, totalSales: 0, expectedProfit: 0 });
    } finally {
      setIsLoading(false);
    }
  };

  // 월별 상세 데이터 로드
  const loadMonthDetails = async (monthData: MonthlyData, index: number) => {
    if (monthData.detailView) {
      setMonthlyData(prevData => {
        const updatedData = [...prevData];
        updatedData[index] = {
          ...updatedData[index],
          isExpanded: !updatedData[index].isExpanded,
        };
        return updatedData;
      });
      return;
    }

    setMonthlyData(prevData => {
      const updatedData = [...prevData];
      updatedData[index] = {
        ...updatedData[index],
        isExpanded: true,
        isLoadingDetails: true,
      };
      return updatedData;
    });

    try {
      const response = await fetch(`/api/notion/total-sales?year=${selectedYear}&month=${monthData.month}`);

      if (!response.ok) {
        throw new Error(`상세 데이터 로드 실패: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || '상세 데이터를 가져오는 중 오류가 발생했습니다.');
      }

      const finalData = result.details || [];

      setMonthlyData(prevData => {
        const finalUpdatedData = [...prevData];
        finalUpdatedData[index] = {
          ...finalUpdatedData[index],
          detailView: finalData,
          isLoadingDetails: false,
          isExpanded: true,
        };
        return finalUpdatedData;
      });
    } catch (err: any) {
      const errorData = [];
      const totalRevenue = monthData.storeSales + monthData.adRevenue + monthData.groupSales;

      if (monthData.storeSales > 0) {
        const storeProfit = totalRevenue > 0 ? (monthData.storeSales / totalRevenue) * monthData.expectedProfit : 0;
        errorData.push({ channel: '스토어', category: '스토어 매출', amount: monthData.storeSales, profit: storeProfit });
      }

      if (monthData.adRevenue > 0) {
        errorData.push({ channel: '유료 광고', category: '광고 수익', amount: monthData.adRevenue, profit: monthData.adRevenue });
      }

      if (monthData.groupSales > 0) {
        errorData.push({ channel: '공동구매', category: '공동구매 매출', amount: monthData.groupSales, profit: monthData.groupSales * 0.3 });
      }

      setMonthlyData(prevData => {
        const finalUpdatedData = [...prevData];
        finalUpdatedData[index] = {
          ...finalUpdatedData[index],
          isLoadingDetails: false,
          detailView: errorData,
          isExpanded: true,
        };
        return finalUpdatedData;
      });
    }
  };

  const handleYearChange = (newYear: string) => {
    const yearValue = parseInt(newYear);
    setSelectedYear(yearValue);
    router.push(`/sales?year=${yearValue}`);
    loadData(yearValue);
  };

  useEffect(() => {
    loadData(selectedYear);
  }, [selectedYear]);

  const yearOptions = [];
  for (let year = currentYear; year >= currentYear - 4; year--) {
    yearOptions.push(year);
  }

  const chartData = monthlyData.map(item => ({
    name: `${item.month}월`,
    storeSales: item.storeSales,
    adRevenue: item.adRevenue,
    groupSales: item.groupSales,
    expectedProfit: Math.floor(item.expectedProfit),
  }));

  if (isLoading) {
    return <TotalSalesLoading />;
  }

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
            <RefreshCcw className="h-12 w-12 text-red-500 mb-4" />
            <h2 className="text-xl font-semibold text-red-700 mb-2">데이터를 불러올 수 없습니다</h2>
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={() => loadData(selectedYear)} variant="outline">다시 시도</Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 max-w-full px-4 sm:px-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[var(--pastel-blue-bg)] flex items-center justify-center text-[var(--pastel-blue-fg)] shadow-sm">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">통합 매출</h1>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{selectedYear}년 퍼포먼스</p>
          </div>
        </div>
        <Select value={selectedYear.toString()} onValueChange={handleYearChange}>
          <SelectTrigger className="w-[180px] h-10 rounded-xl border-slate-200 font-bold">
            <SelectValue placeholder="연도 선택" />
          </SelectTrigger>
          <SelectContent className="rounded-xl border-none shadow-xl">
            {yearOptions.map(year => (
              <SelectItem key={year} value={year.toString()}>{year}년</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        <Card
          className={`shadow-sm cursor-pointer transition-all duration-300 hover:scale-[1.02] active:scale-95 ${selectedInsight === 'store' ? 'ring-1 ring-[var(--pastel-purple-fg)]/30 bg-[var(--pastel-purple-bg)]/40' : 'bg-white border border-[var(--pastel-purple-bg)]'}`}
          onClick={() => setSelectedInsight('store')}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black text-[var(--pastel-purple-fg)]/60 uppercase tracking-wider">자사 브랜드 매출</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-lg font-black ${selectedInsight === 'store' ? 'text-[var(--pastel-purple-fg)]' : 'text-slate-900'}`}>{formatCurrency(totals.storeSales)}</div>
            {(() => {
              const growth = formatGrowthRate(totals.storeSales, prevYearTotals.storeSales);
              return <div className={`text-[10px] font-bold ${growth.color} mt-1`}>{growth.icon} {growth.rate.toFixed(1)}%</div>;
            })()}
          </CardContent>
        </Card>
        <Card
          className={`shadow-sm cursor-pointer transition-all duration-300 hover:scale-[1.02] active:scale-95 ${selectedInsight === 'ad' ? 'ring-1 ring-[var(--pastel-blue-fg)]/30 bg-[var(--pastel-blue-bg)]/40' : 'bg-white border border-[var(--pastel-blue-bg)]'}`}
          onClick={() => setSelectedInsight('ad')}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black text-[var(--pastel-blue-fg)]/60 uppercase tracking-wider">광고 대행 수익</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-lg font-black ${selectedInsight === 'ad' ? 'text-[var(--pastel-blue-fg)]' : 'text-slate-900'}`}>{formatCurrency(totals.adRevenue)}</div>
            {(() => {
              const growth = formatGrowthRate(totals.adRevenue, prevYearTotals.adRevenue);
              return <div className={`text-[10px] font-bold ${growth.color} mt-1`}>{growth.icon} {growth.rate.toFixed(1)}%</div>;
            })()}
          </CardContent>
        </Card>
        <Card
          className={`shadow-sm cursor-pointer transition-all duration-300 hover:scale-[1.02] active:scale-95 ${selectedInsight === 'group' ? 'ring-1 ring-[var(--pastel-yellow-fg)]/30 bg-[var(--pastel-yellow-bg)]/40' : 'bg-white border border-[var(--pastel-yellow-bg)]'}`}
          onClick={() => setSelectedInsight('group')}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black text-[var(--pastel-yellow-fg)]/60 uppercase tracking-wider">유통 대행 매출</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-lg font-black ${selectedInsight === 'group' ? 'text-[var(--pastel-yellow-fg)]' : 'text-slate-900'}`}>{formatCurrency(totals.groupSales)}</div>
            {(() => {
              const growth = formatGrowthRate(totals.groupSales, prevYearTotals.groupSales);
              return <div className={`text-[10px] font-bold ${growth.color} mt-1`}>{growth.icon} {growth.rate.toFixed(1)}%</div>;
            })()}
          </CardContent>
        </Card>
        <Card
          className={`shadow-sm cursor-pointer transition-all duration-300 hover:scale-[1.02] active:scale-95 ${selectedInsight === 'total' ? 'ring-1 ring-slate-300 bg-slate-100' : 'bg-white border border-slate-200'}`}
          onClick={() => setSelectedInsight('total')}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black text-slate-400 uppercase tracking-wider">총 원천 매출</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-black text-slate-900">{formatCurrency(totals.totalSales)}</div>
            {(() => {
              const growth = formatGrowthRate(totals.totalSales, prevYearTotals.totalSales);
              return <div className={`text-[10px] font-bold ${growth.color} mt-1`}>{growth.icon} {growth.rate.toFixed(1)}%</div>;
            })()}
          </CardContent>
        </Card>
        <Card
          className={`shadow-sm cursor-pointer transition-all duration-300 hover:scale-[1.02] active:scale-95 ${selectedInsight === 'profit' ? 'ring-1 ring-[var(--pastel-green-fg)]/30 bg-[var(--pastel-green-bg)]/40' : 'bg-white border border-[var(--pastel-green-bg)]'}`}
          onClick={() => setSelectedInsight('profit')}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black text-[var(--pastel-green-fg)]/60 uppercase tracking-wider">예상이익액</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-lg font-black ${selectedInsight === 'profit' ? 'text-[var(--pastel-green-fg)]' : 'text-[var(--pastel-green-fg)]'}`}>{formatCurrency(Math.floor(totals.expectedProfit))}</div>
            {(() => {
              const growth = formatGrowthRate(totals.expectedProfit, prevYearTotals.expectedProfit);
              return <div className={`text-[10px] font-bold ${growth.color} mt-1`}>{growth.icon} {growth.rate.toFixed(1)}%</div>;
            })()}
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-sm bg-white rounded-2xl border border-slate-100 overflow-hidden">
        <CardHeader className="border-b border-slate-50 bg-slate-50/30">
          <CardTitle className="text-sm font-bold text-slate-800">월별 매출 추이</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                <Tooltip
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  formatter={(value: any, name: any) => [name === "예상이익" ? formatCurrency(Math.floor(value)) : formatCurrency(value), name]}
                />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '11px', fontWeight: 700 }} />
                <Bar dataKey="storeSales" name="자사 브랜드" fill="#E1BEE7" fillOpacity={0.8} stackId="a" radius={[0, 0, 0, 0]} />
                <Bar dataKey="adRevenue" name="광고 대행" fill="#C8E6C9" fillOpacity={0.8} stackId="a" radius={[0, 0, 0, 0]} />
                <Bar dataKey="groupSales" name="유통 대행" fill="#FFF9C4" fillOpacity={0.8} stackId="a" radius={[4, 4, 0, 0]} />
                <Line type="monotone" dataKey="expectedProfit" name="예상이익" stroke="#81C784" strokeWidth={3} dot={{ r: 4, fill: '#81C784', strokeWidth: 2, stroke: '#fff' }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card className="border-none shadow-sm bg-white rounded-2xl border border-slate-100 overflow-hidden">
        <CardHeader className="border-b border-slate-50 bg-slate-50/30">
          <CardTitle className="text-sm font-bold text-slate-800">월별 상세 실적표</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow className="hover:bg-transparent border-slate-100">
                  <TableHead className="w-[100px] text-[11px] font-black text-slate-400 uppercase tracking-widest pl-6">월</TableHead>
                  <TableHead className="text-right text-[11px] font-black text-slate-400 uppercase tracking-widest">자사 브랜드</TableHead>
                  <TableHead className="text-right text-[11px] font-black text-slate-400 uppercase tracking-widest">광고 대행</TableHead>
                  <TableHead className="text-right text-[11px] font-black text-slate-400 uppercase tracking-widest">유통 대행</TableHead>
                  <TableHead className="text-right text-[11px] font-black text-slate-900 uppercase tracking-widest">합계</TableHead>
                  <TableHead className="text-right text-[11px] font-black text-[var(--pastel-trend-up-fg)] uppercase tracking-widest pr-6">예상이익</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {monthlyData.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-10 text-slate-400 font-bold">데이터가 없습니다</TableCell></TableRow>
                ) : (
                  monthlyData.map((month, index) => (
                    <React.Fragment key={month.id || index}>
                      <TableRow className="hover:bg-slate-50 transition-colors border-b border-slate-100">
                        <TableCell className="font-bold text-slate-700">{month.month}월</TableCell>
                        <TableCell className="text-right text-xs font-medium text-slate-600">{formatCurrency(month.storeSales)}</TableCell>
                        <TableCell className="text-right text-xs font-medium text-slate-600">{formatCurrency(month.adRevenue)}</TableCell>
                        <TableCell className="text-right text-xs font-medium text-slate-600">{formatCurrency(month.groupSales)}</TableCell>
                        <TableCell className="text-right text-sm font-black text-slate-900">{formatCurrency(month.totalSales)}</TableCell>
                        <TableCell className="text-right text-sm font-black text-[var(--pastel-trend-up-fg)]">{formatCurrency(month.expectedProfit)}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-lg" onClick={() => loadMonthDetails(month, index)}>
                            {month.isLoadingDetails ? <RefreshCcw className="h-4 w-4 animate-spin" /> : month.isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </Button>
                        </TableCell>
                      </TableRow>
                      {month.isExpanded && (
                        <TableRow className="bg-slate-50/50">
                          <TableCell colSpan={7} className="p-0">
                            <div className="p-6 bg-white/50 border-y border-slate-100 divide-y divide-slate-100 animate-in fade-in duration-300">
                              {month.isLoadingDetails ? (
                                <div className="flex justify-center py-10"><RefreshCcw className="h-6 w-6 animate-spin text-primary" /></div>
                              ) : !month.detailView?.length ? (
                                <p className="text-center text-slate-400 py-4 font-bold text-xs">상세 데이터가 없습니다</p>
                              ) : (
                                <div className="space-y-4">
                                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">채널별 상세 분석</h4>
                                  <Table>
                                    <TableHeader>
                                      <TableRow className="border-none">
                                        <TableHead className="h-8 text-[10px] font-bold text-slate-400">채널명</TableHead>
                                        <TableHead className="h-8 text-[10px] font-bold text-slate-400 text-right">매출액</TableHead>
                                        <TableHead className="h-8 text-[10px] font-bold text-slate-400 text-right">이익액</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {month.detailView.map((detail: any, i: number) => (
                                        <TableRow key={i} className="border-none hover:bg-transparent">
                                          <TableCell className="py-2 text-xs font-bold text-slate-700">{detail.channel}</TableCell>
                                          <TableCell className="py-2 text-xs font-medium text-slate-600 text-right">{formatCurrency(detail.amount)}</TableCell>
                                          <TableCell className="py-2 text-xs font-black text-[var(--pastel-trend-up-fg)] text-right">{formatCurrency(detail.profit || 0)}</TableCell>
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
                    </React.Fragment>
                  ))
                )}
                <TableRow className="bg-slate-50/80 border-none transition-colors">
                  <TableCell className="font-black text-slate-800 py-4 rounded-bl-2xl">전체 소계</TableCell>
                  <TableCell className="text-right text-xs font-bold text-slate-400">{formatCurrency(totals.storeSales)}</TableCell>
                  <TableCell className="text-right text-xs font-bold text-slate-400">{formatCurrency(totals.adRevenue)}</TableCell>
                  <TableCell className="text-right text-xs font-bold text-slate-400">{formatCurrency(totals.groupSales)}</TableCell>
                  <TableCell className="text-right text-lg font-black text-slate-900">{formatCurrency(totals.totalSales)}</TableCell>
                  <TableCell className="text-right text-lg font-black text-[var(--pastel-trend-up-fg)]">{formatCurrency(totals.expectedProfit)}</TableCell>
                  <TableCell className="rounded-br-2xl"></TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      <PanelUpdater totals={totals} prevYearTotals={prevYearTotals} selectedYear={selectedYear} setContent={setContent} selectedInsight={selectedInsight} />
    </div>
  );
}

// 패널 업데이트만을 위한 별도 컴포넌트
// 패널 업데이트만을 위한 별도 컴포넌트
function PanelUpdater({ totals, prevYearTotals, selectedYear, setContent, selectedInsight }: any) {
  useEffect(() => {
    const growth = ((totals.expectedProfit - prevYearTotals.expectedProfit) / (prevYearTotals.expectedProfit || 1)) * 100;
    const isPositive = growth >= 0;
    const icon = isPositive ? '↗' : '↘';

    const renderInsightContent = () => {
      switch (selectedInsight) {
        case 'store':
          // 실제 채널별 데이터가 있으면 사용, 없으면 빈 배열
          const channels = totals.channelTotals ? Object.entries(totals.channelTotals).map(([label, value]: [string, any]) => ({
            label,
            value,
            color: label === '스마트스토어' ? '#C8E6C9' : label === '쿠팡' ? '#FFE0B2' : label === '오늘의집' ? '#BBDEFB' : '#E1BEE7'
          })).sort((a, b) => b.value - a.value) : [];

          const topChannel = channels[0];

          return (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-1.5 h-5 bg-[var(--pastel-purple-fg)] rounded-full"></div>
                <h3 className="text-lg font-bold">자사 브랜드 실적 상세</h3>
              </div>
              <div className="space-y-5">
                <div className="bg-white/60 p-5 rounded-2xl border border-white shadow-sm space-y-3">
                  <div className="flex items-center gap-2 text-slate-400 text-[10px] font-black uppercase tracking-wider">
                    <PieChart className="w-3 h-3" />
                    유통 채널별 비중
                  </div>
                  <div className="space-y-4">
                    {channels.length > 0 ? channels.map((item, i) => {
                      const percent = totals.storeSales > 0 ? (item.value / totals.storeSales) * 100 : 0;
                      return (
                        <div key={i} className="space-y-1">
                          <div className="flex justify-between text-[11px] font-bold">
                            <span className="text-slate-500">{item.label}</span>
                            <span className="text-slate-900">{percent.toFixed(1)}%</span>
                          </div>
                          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${percent}%`, backgroundColor: item.color }} />
                          </div>
                        </div>
                      );
                    }) : (
                      <p className="text-[11px] text-slate-400 font-bold py-4 text-center">집계된 채널 데이터가 없습니다</p>
                    )}
                  </div>
                </div>
                {topChannel && (
                  <div className="p-4 bg-[var(--pastel-purple-bg)]/30 rounded-2xl border border-[var(--pastel-purple-bg)]/50">
                    <h4 className="text-xs font-black text-[var(--pastel-purple-fg)] uppercase tracking-widest mb-2 flex items-center gap-2">
                      <Info className="w-3 h-3" /> BRAND INSIGHT
                    </h4>
                    <p className="text-[11px] leading-relaxed font-medium text-[var(--pastel-purple-fg)]/70">
                      자사 브랜드 제품이 <b>{topChannel.label}</b>를 통해 활발히 유통되고 있습니다. 향후 B2B 공급 및 외부 인플루언서 협업(자사 공구) 매출이 추가될 경우 이 섹션에서 통합 관리가 가능합니다.
                    </p>
                  </div>
                )}
              </div>
            </div>
          );
        case 'ad':
          return (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-1.5 h-5 bg-[var(--pastel-blue-fg)] rounded-full"></div>
                <h3 className="text-lg font-bold">광고 서비스 실적</h3>
              </div>
              <div className="space-y-5">
                <div className="bg-white/60 p-5 rounded-2xl border border-white shadow-sm space-y-4">
                  <div className="flex items-center gap-2 text-slate-400 text-[10px] font-black uppercase tracking-wider">
                    <Target className="w-3 h-3" />
                    광고 대행 매출 요약
                  </div>
                  <div className="p-4 rounded-xl bg-slate-50/50 space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500 font-bold">연간 대행 수익 총액</span>
                      <span className="text-slate-900 font-black">{formatCurrency(totals.adRevenue)}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500 font-bold">월평균 서비스 매출</span>
                      <span className="text-slate-900 font-black">{formatCurrency(totals.adRevenue / 12)}</span>
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-400 font-bold leading-tight">
                    * 광고주로부터 의뢰받아 수행한 캠페인에 대한 대행 수익 집계입니다.
                  </p>
                </div>
                <div className="p-4 bg-[var(--pastel-blue-bg)]/30 rounded-2xl border border-[var(--pastel-blue-bg)]/50">
                  <h4 className="text-xs font-black text-[var(--pastel-blue-fg)] uppercase tracking-widest mb-2 flex items-center gap-2">
                    <TrendingUp className="w-3 h-3" /> SERVICE INSIGHT
                  </h4>
                  <p className="text-[11px] leading-relaxed font-medium text-[var(--pastel-blue-fg)]/70">
                    전체 원천 매출 중 광고 서비스 비중은 <b>{((totals.adRevenue / totals.totalSales) * 100).toFixed(1)}%</b>입니다.
                    주요 광고주의 만족도를 관리하여 고정적인 월간 대행 수익 구조를 강화하는 전략이 유효합니다.
                  </p>
                </div>
              </div>
            </div>
          );
        case 'group':
          return (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-1.5 h-5 bg-[var(--pastel-yellow-fg)] rounded-full"></div>
                <h3 className="text-lg font-bold">유통/공구 대행 현황</h3>
              </div>
              <div className="space-y-5">
                <div className="bg-white/60 p-5 rounded-2xl border border-white shadow-sm space-y-3">
                  <div className="flex items-center gap-2 text-slate-400 text-[10px] font-black uppercase tracking-wider">
                    <Calendar className="w-3 h-3" />
                    타사 제품 공동구매 실적
                  </div>
                  <div className="p-4 rounded-xl bg-slate-50/50 space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500 font-bold">연간 유통 매출 총액</span>
                      <span className="text-slate-900 font-black">{formatCurrency(totals.groupSales)}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500 font-bold">전체 매출 기여도</span>
                      <span className="text-slate-900 font-black">{((totals.groupSales / totals.totalSales) * 100).toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
                <div className="p-4 bg-[var(--pastel-yellow-bg)]/30 rounded-2xl border border-[var(--pastel-yellow-bg)]/50">
                  <h4 className="text-xs font-black text-[var(--pastel-yellow-fg)] uppercase tracking-widest mb-2 flex items-center gap-2">
                    <Info className="w-3 h-3" /> AGENCY INSIGHT
                  </h4>
                  <p className="text-[11px] leading-relaxed font-medium text-[var(--pastel-yellow-fg)]/70">
                    타 브랜드 제품의 유통을 대행하여 창출된 매출입니다. 자사 브랜드 판매와 상충되지 않는 제품군을 확보하여 추가 수익원으로 활용하고 있습니다.
                  </p>
                </div>
              </div>
            </div>
          );
        case 'profit':
          return (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-1.5 h-5 bg-[var(--pastel-green-fg)] rounded-full"></div>
                <h3 className="text-lg font-bold">수익성 인사이트</h3>
              </div>
              <div className="space-y-5">
                <div className="bg-[var(--pastel-green-bg)]/50 p-5 rounded-2xl text-slate-900 border border-[var(--pastel-green-bg)] shadow-sm space-y-1">
                  <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">연간 총 예상이익</p>
                  <h4 className="text-2xl font-black text-[var(--pastel-green-fg)]">{formatCurrency(Math.floor(totals.expectedProfit))}</h4>
                  <p className="text-[10px] font-bold text-slate-500">전체 영업 이익률: {(totals.expectedProfit / totals.totalSales * 100).toFixed(1)}%</p>
                </div>
                <div className="bg-white/60 p-5 rounded-2xl border border-white shadow-sm space-y-4">
                  <div className="flex items-center gap-2 text-slate-400 text-[10px] font-black uppercase tracking-wider">
                    <BarChart3 className="w-3 h-3" />
                    수익 기여 소스 (이익 기반)
                  </div>
                  <div className="space-y-4">
                    {[
                      { label: '자사 브랜드 기여', value: totals.storeProfit || 0, color: '#E1BEE7' },
                      { label: '광고 대행 기여', value: totals.adProfit || 0, color: '#C8E6C9' },
                      { label: '유통 대행 기여', value: totals.groupProfit || 0, color: '#FFF9C4' }
                    ].sort((a, b) => b.value - a.value).map((item, i) => (
                      <div key={i} className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                          <span className="text-xs font-bold text-slate-600">{item.label}</span>
                        </div>
                        <div className="text-right">
                          <div className="text-xs font-black text-slate-900">{formatCurrency(Math.floor(item.value))}</div>
                          <div className="text-[10px] font-bold text-slate-400">{(totals.expectedProfit > 0 ? (item.value / totals.expectedProfit) * 100 : 0).toFixed(1)}%</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
        default:
          const sourceMix = [
            { label: '자사 브랜드', value: totals.storeSales, percent: (totals.storeSales / totals.totalSales) * 100, color: '#E1BEE7' },
            { label: '광고 대행', value: totals.adRevenue, percent: (totals.adRevenue / totals.totalSales) * 100, color: '#C8E6C9' },
            { label: '유통 대행', value: totals.groupSales, percent: (totals.groupSales / totals.totalSales) * 100, color: '#FFF9C4' }
          ].sort((a, b) => b.value - a.value);

          // 다각화 지수 계산 (단순 헤르핀달-히르슈만 지수 응용: 낮을수록 다각화 우수)
          const hhi = sourceMix.reduce((acc, curr) => acc + Math.pow(curr.percent / 100, 2), 0);
          const diversificationScore = Math.max(0, Math.min(100, (1 - hhi) * 150)); // 0~100 스케일링
          const healthStatus = diversificationScore > 60 ? '안정적' : diversificationScore > 30 ? '균형 필요' : '집중됨';
          const healthColor = diversificationScore > 60 ? 'text-[var(--pastel-trend-up-fg)]' : diversificationScore > 30 ? 'text-[var(--pastel-yellow-fg)]' : 'text-[var(--pastel-trend-down-fg)]';

          return (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-1.5 h-5 bg-slate-400 rounded-full"></div>
                <h3 className="text-lg font-bold">{selectedYear}년 매출 포트폴리오</h3>
              </div>

              <div className="space-y-4">
                {/* 1. 매출 원천 구성비 */}
                <div className="bg-white/60 p-5 rounded-2xl border border-white shadow-sm space-y-4">
                  <div className="flex items-center gap-2 text-slate-400 text-[10px] font-black uppercase tracking-wider">
                    <PieChart className="w-3 h-3" />
                    원천별 매출 구성비
                  </div>
                  <div className="space-y-4">
                    {sourceMix.map((item, i) => (
                      <div key={i} className="space-y-1.5">
                        <div className="flex justify-between items-center text-[11px] font-bold">
                          <span className="text-slate-500">{item.label}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-slate-400 font-medium">{formatCurrency(item.value)}</span>
                            <span className="text-slate-900 font-black">{item.percent.toFixed(1)}%</span>
                          </div>
                        </div>
                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${item.percent}%`, backgroundColor: item.color }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 2. 비즈니스 건전성 진단 (추가 인사이트) */}
                <div className="p-5 bg-[var(--pastel-blue-bg)] rounded-[32px] text-slate-900 space-y-4 shadow-sm relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/40 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-white/60 transition-all duration-700"></div>
                  <div className="flex justify-between items-center relative z-10">
                    <h4 className="text-xs font-black uppercase tracking-widest text-slate-500">Portfolio Health</h4>
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full bg-white/60 shadow-sm ${healthColor}`}>{healthStatus}</span>
                  </div>
                  <div className="flex items-end gap-3 relative z-10">
                    <div className="text-3xl font-black text-slate-900">{diversificationScore.toFixed(0)}</div>
                    <div className="text-[10px] font-bold text-slate-400 pb-1">/ 100 PTS</div>
                  </div>
                  <div className="space-y-3 pt-2 relative z-10">
                    <div className="p-3 bg-white/40 rounded-2xl space-y-1 transition-hover hover:bg-white/60 border border-white/20">
                      <div className="flex items-center gap-2 text-[10px] font-black text-[var(--pastel-blue-fg)]">
                        <TrendingUp className="w-3 h-3" /> STRATEGIC REVIEW
                      </div>
                      <p className="text-[11px] leading-relaxed text-slate-600 font-medium">
                        {diversificationScore > 50
                          ? '현재 수익 구조가 여러 채널에 잘 분산되어 있어 외부 리스크에 강한 구조입니다.'
                          : `${sourceMix[0].label}에 대한 의존도가 높습니다. 장기적인 성장을 위해 타 소스의 비중을 20% 이상으로 끌어올리는 전략을 권장합니다.`}
                      </p>
                    </div>
                  </div>
                </div>

                {/* 3. 총괄 성장 지표 */}
                <div className="bg-white/60 p-5 rounded-2xl border border-white shadow-sm space-y-3">
                  <div className="flex items-center gap-2 text-slate-400 text-[10px] font-black uppercase tracking-wider">
                    <TrendingUp className="w-3 h-3" />
                    전년 대비 성장 모멘텀
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-black text-slate-900">{formatCurrency(totals.totalSales)}</div>
                    <div className={`text-xs font-black ${isPositive ? 'text-[var(--pastel-trend-up-fg)]' : 'text-[var(--pastel-trend-down-fg)]'} flex items-center gap-1`}>
                      {icon} {Math.abs(growth).toFixed(1)}%
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-400 font-bold leading-tight">
                    * 전체 파이프라인의 연간 성장세입니다. 월평균 매출액은 약 {formatCurrency(totals.totalSales / 12)}으로 집계됩니다.
                  </p>
                </div>
              </div>
            </div>
          );
      }
    };

    setContent(renderInsightContent());
    return () => setContent(null);
  }, [totals, prevYearTotals, selectedYear, setContent, selectedInsight]);
  return null;
}

// 로딩 상태 컴포넌트
function TotalSalesLoading() {
  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex justify-between items-center mb-6">
        <Skeleton className="h-10 w-48 rounded-xl" />
        <Skeleton className="h-10 w-24 rounded-xl" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
      </div>
      <Skeleton className="h-[300px] w-full rounded-2xl" />
      <Skeleton className="h-[400px] w-full rounded-2xl" />
    </div>
  );
}

// 메인 export 컴포넌트
export default function TotalSalesPage() {
  return (
    <React.Suspense fallback={<TotalSalesLoading />}>
      <TotalSalesContent />
    </React.Suspense>
  );
}