"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { format, startOfWeek, endOfWeek, subWeeks } from "date-fns";
import { ko } from "date-fns/locale";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  TrendingUp,
  TrendingDown,
  ChevronRight,
  Sparkles,
  ShoppingBag,
  Video,
  ArrowUpRight,
  LayoutDashboard,
  Target,
  FileText,
  Search,
  Flame,
  Globe,
  Rocket,
  Plus,
  Settings2,
  Check,
  Star,
  Activity,
  Lightbulb,
  ExternalLink,
  Package,
  Users,
  DollarSign,
  BarChart3,
  Clock,
  Zap,
  BookOpen,
  Chrome,
  Calendar,
  RefreshCcw,
  Music,
  ImageIcon,
  Mic,
  PenTool,
  Link2,
  ThumbsUp,
  ThumbsDown,
  Newspaper,
  ChevronLeft,
  PieChart as PieChartIcon,
  Trash2,
  MessageSquare,
  MessageCircle,
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { useRightPanel } from "@/lib/context/right-panel-context";
import { HomeRightPanel } from "@/components/home/HomeRightPanel";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils/numberUtils";
import { toast } from "sonner";

const ICON_MAP: Record<string, any> = {
  LayoutDashboard, Sparkles, Target, FileText, ShoppingBag, Video, Rocket, DollarSign, Package, Mic, Music, ImageIcon, PenTool, Link2, Upload: FileText,
};

// --- Mock Data for Naver Insights ---
const DEMAND_FORECAST_DATA = [
  { date: '12.21', search: 45, sales: 30 },
  { date: '12.22', search: 52, sales: 35 },
  { date: '12.23', search: 48, sales: 42 },
  { date: '12.24', search: 70, sales: 45 },
  { date: '12.25', search: 85, sales: 55 },
  { date: '12.26', search: 75, sales: 62 },
  { date: '12.27', search: 90, sales: 68 },
];

const GENDER_DATA = [
  { name: '여성', value: 68, color: '#F9A8D4' },
  { name: '남성', value: 32, color: '#A5B4FC' },
];

const AGE_DATA = [
  { name: '10대', value: 5 },
  { name: '20대', value: 28 },
  { name: '30대', value: 42 },
  { name: '40대', value: 18 },
  { name: '50대+', value: 7 },
];
// ------------------------------------

// 리포트 타입별 스타일 정의
const getReportStyle = (type: string) => {
  switch (type) {
    case 'brand':
      return { label: '브랜드 성과 분석', color: 'bg-blue-50 text-blue-600 border-blue-100' };
    case 'inventory':
      return { label: '재고 및 운영 인사이트', color: 'bg-emerald-50 text-emerald-600 border-emerald-100' };
    case 'special':
      return { label: '특별 리포트', color: 'bg-rose-50 text-rose-600 border-rose-100' };
    default: // market
      return { label: '시장 트렌드 분석', color: 'bg-purple-50 text-purple-600 border-purple-100' };
  }
};

export default function HomePage() {
  const router = useRouter();
  const { setContent, open } = useRightPanel();
  const [userName, setUserName] = useState<string>("사용자");
  const [goals, setGoals] = useState<any[]>([]);
  const [favorites, setFavorites] = useState<any[]>([]);
  const [isEditFavOpen, setIsEditFavOpen] = useState(false);
  const [loadingGoals, setLoadingGoals] = useState(true);
  const [portalData, setPortalData] = useState<any>(null);
  const [loadingPortal, setLoadingPortal] = useState(true);
  const [weeklyStats, setWeeklyStats] = useState<any>(null);
  const [hotProducts, setHotProducts] = useState<any[]>([]);
  const [loadingWeekly, setLoadingWeekly] = useState(true);
  const [lowStockCount, setLowStockCount] = useState<number>(0);
  const [topLowStockProducts, setTopLowStockProducts] = useState<any[]>([]);
  const [selectedSummary, setSelectedSummary] = useState<any>(null);
  const [isSummaryDialogOpen, setIsSummaryDialogOpen] = useState(false);
  const [isLowStockDialogOpen, setIsLowStockDialogOpen] = useState(false);
  const [summaryPage, setSummaryPage] = useState(1);
  const [newsPage, setNewsPage] = useState(1);
  const [commerceData, setCommerceData] = useState<any>(null);
  const [loadingCommerce, setLoadingCommerce] = useState(true);
  const ITEMS_PER_PAGE = { summary: 5, news: 5 };

  const handleDelete = async (type: 'summary' | 'news', id: string) => {
    try {
      const endpoint = type === 'summary' ? '/api/home/intelligence/delete' : '/api/home/news/delete';
      const res = await fetch(`${endpoint}?id=${id}`, { method: 'DELETE' });
      const result = await res.json();

      if (result.success) {
        toast.success(type === 'summary' ? "리포트가 삭제되었습니다." : "뉴스가 삭제되었습니다.");
        // UI 즉시 업데이트
        if (type === 'summary') {
          setPortalData((prev: any) => ({
            ...prev,
            summaries: prev.summaries.filter((s: any) => s.id !== id)
          }));
        } else {
          setPortalData((prev: any) => ({
            ...prev,
            news: Array.isArray(prev.news)
              ? prev.news.filter((n: any) => n.id !== id)
              : prev.news // 객체 형태일 경우의 처리는 구조에 따라 추가 필요
          }));
        }
      } else {
        throw new Error(result.error);
      }
    } catch (e: any) {
      toast.error(`삭제 실패: ${e.message}`);
    }
  };

  // 마크다운 인라인 렌더링 함수 (백슬래시 제거 및 볼드체 처리)
  const renderMarkdownInline = (text: string) => {
    if (!text) return "";
    const cleanText = text.replace(/\\/g, '');
    return (
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ node, ...props }) => <span {...props} />,
          strong: ({ node, ...props }) => <strong className="font-black text-primary" {...props} />
        }}
      >
        {cleanText}
      </ReactMarkdown>
    );
  };

  // 카테고리별 배지 색상 설정 함수
  const getCategoryColor = (category: string) => {
    switch (category) {
      case '유통/마케팅':
        return "bg-blue-50 text-blue-600 border-blue-100";
      case '기술/혁신':
        return "bg-purple-50 text-purple-600 border-purple-100";
      case '트렌드/소비':
        return "bg-emerald-50 text-emerald-600 border-emerald-100";
      case '정책/규제':
        return "bg-orange-50 text-orange-600 border-orange-100";
      case '인사/조직':
        return "bg-indigo-50 text-indigo-600 border-indigo-100";
      case '재무/실적':
        return "bg-rose-50 text-rose-600 border-rose-100";
      default:
        return "bg-slate-50 text-slate-600 border-slate-100";
    }
  };

  const handleFeedback = async (summaryId: string, type: 'helpful' | 'unhelpful') => {
    try {
      const res = await fetch('/api/home/intelligence/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: summaryId, type })
      });

      const result = await res.json();
      if (result.success) {
        // 서버에서 계산된 정확한 숫자로 UI 업데이트
        const updateSummary = (s: any) => s.id === summaryId ? {
          ...s,
          helpful_count: result.helpful,
          unhelpful_count: result.unhelpful
        } : s;

        if (selectedSummary?.id === summaryId) {
          setSelectedSummary({ ...selectedSummary, helpful_count: result.helpful, unhelpful_count: result.unhelpful });
        }

        if (portalData?.summaries) {
          setPortalData({ ...portalData, summaries: portalData.summaries.map(updateSummary) });
        }

        if (result.action === 'removed') toast.info("피드백이 취소되었습니다.");
        else toast.success("피드백이 반영되었습니다.");
      }
    } catch (e) {
      toast.error("처리 중 오류가 발생했습니다.");
    }
  };

  const isInitialized = React.useRef(false);

  useEffect(() => {
    // 우측 패널 내용 설정 (최초 1회만)
    setContent(<HomeRightPanel />);

    const init = async () => {
      if (isInitialized.current) return;
      isInitialized.current = true;

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUserName(session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || "사용자");
        }

        // 목표 데이터 로드
        const { data: goalsData } = await supabase
          .from('goals')
          .select('*')
          .limit(3);

        if (goalsData) {
          const goalsWithProgress = goalsData.map(g => ({
            ...g,
            progress: g.target_value > 0 ? Math.min(Math.round((g.current_value / g.target_value) * 100), 100) : 0
          }));
          setGoals(goalsWithProgress);
        }
        setLoadingGoals(false);

        // 포털 인사이트 로드
        const portalRes = await fetch('/api/home/portal', { cache: 'no-store' });
        const portalJson = await portalRes.json();
        if (portalJson.success) setPortalData(portalJson.data);
        setLoadingPortal(false);

        // 저재고 상품 로드 (Supabase 내부 데이터)
        const { data: stockData } = await supabase
          .from('products')
          .select('name, stock_quantity')
          .eq('is_representative', true)
          .lt('stock_quantity', 15)
          .order('stock_quantity', { ascending: true });

        if (stockData) {
          setLowStockCount(stockData.length);
          setTopLowStockProducts(stockData.slice(0, 3));
        }

        // 유통 채널 인사이트 로드 (Naver/Coupang API)
        try {
          setLoadingCommerce(true);
          console.log('Fetching commerce insights from /api/home/commerce-insights...');
          const commerceRes = await fetch('/api/home/commerce-insights');
          const commerceJson = await commerceRes.json();
          console.log('Commerce Insight Response:', commerceJson);
          if (commerceJson.success) setCommerceData(commerceJson.data);
        } catch (e) {
          console.error('Commerce Insight fetch error:', e);
        } finally {
          setLoadingCommerce(false);
        }

      } catch (e) {
        console.error('Init error:', e);
      }

      // 주간 통계 로드
      try {
        setLoadingWeekly(true);
        const now = new Date();
        const currentStart = startOfWeek(now, { weekStartsOn: 1 });
        const currentEnd = endOfWeek(now, { weekStartsOn: 1 });
        const prevStart = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
        const prevEnd = endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });

        const startDateStr = format(currentStart, 'yyyy-MM-dd');
        const endDateStr = format(currentEnd, 'yyyy-MM-dd');
        const prevStartDateStr = format(prevStart, 'yyyy-MM-dd');
        const prevEndDateStr = format(prevEnd, 'yyyy-MM-dd');

        const [currentRes, prevRes] = await Promise.all([
          fetch(`/api/analytics/sales-data?startDate=${startDateStr}&endDate=${endDateStr}&channel=all`),
          fetch(`/api/analytics/sales-data?startDate=${prevStartDateStr}&endDate=${prevEndDateStr}&channel=all`)
        ]);

        const currentData = await currentRes.json();
        const prevData = await prevRes.json();

        if (currentData.success && prevData.success) {
          const cur = currentData.data || [];
          const prev = prevData.data || [];

          const curSales = cur.reduce((sum: number, item: any) => sum + (item.totalSales || (item.price * item.quantity) || 0), 0);
          const prevSales = prev.reduce((sum: number, item: any) => sum + (item.totalSales || (item.price * item.quantity) || 0), 0);

          const curOrders = new Set(cur.map((item: any) => item.orderNumber)).size;
          const curCustomers = new Set(cur.map((item: any) => `${item.customerName}##${item.customerID}`)).size;

          const growth = prevSales > 0 ? ((curSales - prevSales) / prevSales * 100).toFixed(1) : "0.0";

          // AOV (Average Order Value) 계산
          const aov = curOrders > 0 ? Math.round(curSales / curOrders) : 0;

          setWeeklyStats({
            revenue: curSales,
            growth: growth,
            orders: curOrders,
            customers: curCustomers,
            aov: aov,
          });

          // Hot Products (상위 5개 상품) 추출 로직
          const getProductSales = (data: any[]) => {
            const map = new Map();
            data.forEach(item => {
              const name = item.mappedProductName || item.productName || '알 수 없는 상품';
              const sales = item.totalSales || (item.price * item.quantity) || 0;
              map.set(name, (map.get(name) || 0) + sales);
            });
            return map;
          };

          const curProdMap = getProductSales(cur);
          const prevProdMap = getProductSales(prev);

          const sortedProducts = Array.from(curProdMap.entries())
            .map(([name, sales]) => {
              const prevSales = prevProdMap.get(name) || 0;
              const trend = prevSales > 0 ? ((sales - prevSales) / prevSales * 100).toFixed(0) : "100";
              return {
                name,
                sales: sales >= 10000 ? `${(sales / 10000).toFixed(0)}만` : sales.toLocaleString(),
                trend: `${Number(trend) >= 0 ? '+' : ''}${trend}%`,
                up: Number(trend) >= 0,
                rawSales: sales
              };
            })
            .sort((a, b) => b.rawSales - a.rawSales)
            .slice(0, 5);

          setHotProducts(sortedProducts);
        }
      } catch (e) {
        console.error('Weekly stats load error:', e);
      } finally {
        setLoadingWeekly(false);
      }
    };

    init();

    const saved = localStorage.getItem('home_favorites');
    if (saved) setFavorites(JSON.parse(saved));
    else setFavorites(DEFAULT_FAVS);
  }, [setContent, open, router]);

  const saveFavorites = (newFavs: any[]) => {
    setFavorites(newFavs);
    localStorage.setItem('home_favorites', JSON.stringify(newFavs));
  };

  const allPossibleFavs = [
    { name: '홈', path: '/home', icon: 'Home' },
    { name: '스토어 분석', path: '/analytics', icon: 'LayoutDashboard' },
    { name: '통합 매출', path: '/sales', icon: 'DollarSign' },
    { name: '상품 매핑', path: '/products', icon: 'Package' },
    { name: '데이터 업로드', path: '/upload', icon: 'Upload' },
    { name: '목표 관리', path: '/goals', icon: 'Target' },
    { name: '숏폼 분석', path: '/shortform', icon: 'Video' },
    { name: 'OSMU 스튜디오', path: '/osmu', icon: 'Sparkles' },
    { name: 'TTS STUDIO', path: '/tts', icon: 'Mic' },
    { name: 'SUNO 프롬프트', path: '/suno', icon: 'Music' },
    { name: '썸네일 생성기', path: '/thumbnail', icon: 'ImageIcon' },
    { name: '라인아트 스튜디오', path: '/lineart', icon: 'PenTool' },
    { name: 'URL 단축기', path: '/url-shortener', icon: 'Link2' },
    { name: 'PDF to JPG', path: '/pdf-to-jpg', icon: 'FileText' },
  ];

  const DEFAULT_FAVS = [
    { name: '스토어 분석', path: '/analytics', icon: 'LayoutDashboard' },
    { name: '통합 매출', path: '/sales', icon: 'DollarSign' },
    { name: '상품 매핑', path: '/products', icon: 'Package' },
    { name: 'OSMU 제작', path: '/osmu', icon: 'Sparkles' },
  ];

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto animate-in fade-in duration-700">
      {/* 상단 통합 대시보드 그리드 */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">

        {/* 왼쪽 섹션: 핵심 지표 및 운영 현황 (8컬럼) */}
        <div className="xl:col-span-8 space-y-6">

          {/* 주간 요약 통계 */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-[var(--pastel-blue-bg)] p-4 rounded-3xl border border-white/40 shadow-sm relative overflow-hidden group hover:shadow-md transition-all duration-300">
              {loadingWeekly && <div className="absolute inset-0 bg-white/50 animate-pulse z-10" />}
              <div className="flex items-start justify-between mb-3">
                <div className="p-2 bg-white/60 rounded-xl">
                  <DollarSign className="w-4 h-4 text-[var(--pastel-blue-fg)]" />
                </div>
                <Badge className={cn(
                  "border-none text-[10px] font-black px-2 py-0.5",
                  Number(weeklyStats?.growth) >= 0 ? "bg-[var(--pastel-trend-up)] text-[var(--pastel-trend-up-fg)]" : "bg-red-100 text-red-600"
                )}>
                  {Number(weeklyStats?.growth) >= 0 ? '+' : ''}{weeklyStats?.growth}%
                </Badge>
              </div>
              <p className="text-[11px] font-bold text-[var(--pastel-blue-fg)]/70 uppercase tracking-wider mb-1">주간 매출</p>
              <h3 className="text-xs sm:text-sm md:text-base lg:text-lg font-black text-[var(--pastel-blue-fg)] tracking-tight leading-tight break-keep">
                {loadingWeekly ? "---" : formatCurrency(weeklyStats?.revenue || 0)}
              </h3>
            </div>

            <div className="bg-[var(--pastel-purple-bg)] p-4 rounded-3xl border border-white/40 shadow-sm relative overflow-hidden group hover:shadow-md transition-all duration-300">
              {loadingWeekly && <div className="absolute inset-0 bg-white/50 animate-pulse z-10" />}
              <div className="p-2 bg-white/60 rounded-xl w-fit mb-3">
                <ShoppingBag className="w-4 h-4 text-[var(--pastel-purple-fg)]" />
              </div>
              <p className="text-[11px] font-bold text-[var(--pastel-purple-fg)]/70 uppercase tracking-wider mb-1">주문 건수</p>
              <h3 className="text-xs sm:text-sm md:text-base lg:text-lg font-black text-[var(--pastel-purple-fg)] tracking-tight leading-tight break-keep">
                {loadingWeekly ? "---" : (weeklyStats?.orders || 0)}<span className="text-[10px] sm:text-xs font-black ml-0.5">건</span>
              </h3>
            </div>

            <div className="bg-[var(--pastel-green-bg)] p-4 rounded-3xl border border-white/40 shadow-sm relative overflow-hidden group hover:shadow-md transition-all duration-300">
              {loadingWeekly && <div className="absolute inset-0 bg-white/50 animate-pulse z-10" />}
              <div className="p-2 bg-white/60 rounded-xl w-fit mb-3">
                <Users className="w-4 h-4 text-[var(--pastel-green-fg)]" />
              </div>
              <p className="text-[11px] font-bold text-[var(--pastel-green-fg)]/70 uppercase tracking-wider mb-1">구매자</p>
              <h3 className="text-xs sm:text-sm md:text-base lg:text-lg font-black text-[var(--pastel-green-fg)] tracking-tight leading-tight break-keep">
                {loadingWeekly ? "---" : (weeklyStats?.customers || 0)}<span className="text-[10px] sm:text-xs font-black ml-0.5">명</span>
              </h3>
            </div>

            <div className="bg-[var(--pastel-yellow-bg)] p-4 rounded-3xl border border-white/40 shadow-sm relative overflow-hidden group hover:shadow-md transition-all duration-300">
              {loadingWeekly && <div className="absolute inset-0 bg-white/50 animate-pulse z-10" />}
              <div className="p-2 bg-white/60 rounded-xl w-fit mb-3">
                <Activity className="w-4 h-4 text-[var(--pastel-yellow-fg)]" />
              </div>
              <p className="text-[11px] font-bold text-[var(--pastel-yellow-fg)]/70 uppercase tracking-wider mb-1">주문 단가</p>
              <h3 className="text-xs sm:text-sm md:text-base lg:text-lg font-black text-[var(--pastel-yellow-fg)] tracking-tight leading-tight break-keep">
                {loadingWeekly ? "---" : formatCurrency(weeklyStats?.aov || 0)}
              </h3>
            </div>
          </div>

          {/* 운영 센터 (Operational Insights) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative">
            {loadingCommerce && <div className="absolute inset-0 bg-white/50 animate-pulse z-10 rounded-3xl" />}
            <Card
              className="border-slate-100/60 shadow-sm rounded-3xl overflow-hidden cursor-pointer hover:border-emerald-200 hover:shadow-md transition-all group"
              onClick={() => setIsLowStockDialogOpen(true)}
            >
              <div className="p-5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-emerald-50 rounded-2xl group-hover:bg-emerald-100 transition-colors">
                    <Package className="w-5 h-5 text-emerald-500" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">재고 경보</p>
                    <h4 className="text-base font-black text-slate-700">품절 임박 <span className="text-emerald-500">{(commerceData?.naver?.lowStock || 0) + (commerceData?.coupang?.lowStock || 0)}</span>건</h4>
                  </div>
                </div>
                <div className="p-2 bg-slate-50 rounded-xl text-slate-300 group-hover:text-emerald-500 group-hover:bg-emerald-50 transition-all">
                  <ArrowUpRight className="w-4 h-4" />
                </div>
              </div>
            </Card>

            <Card className="border-slate-100/60 shadow-sm rounded-3xl overflow-hidden hover:shadow-md transition-all">
              <div className="p-5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-50 rounded-2xl">
                    <MessageSquare className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">네이버 CS</p>
                    <h4 className="text-base font-black text-slate-700">미답변 문의 <span className="text-blue-500">{commerceData?.naver?.cs || 0}</span>건</h4>
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="h-9 w-9 text-slate-300 hover:text-blue-500 hover:bg-blue-50 rounded-xl" onClick={() => window.open('https://sell.smartstore.naver.com', '_blank')}>
                  <ArrowUpRight className="w-4 h-4" />
                </Button>
              </div>
            </Card>

            <Card className="border-slate-100/60 shadow-sm rounded-3xl overflow-hidden hover:shadow-md transition-all">
              <div className="p-5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-orange-50 rounded-2xl">
                    <MessageCircle className="w-5 h-5 text-orange-500" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">쿠팡 CS</p>
                    <h4 className="text-base font-black text-slate-700">미답변 문의 <span className="text-orange-500">{commerceData?.coupang?.cs || 0}</span>건</h4>
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="h-9 w-9 text-slate-300 hover:text-orange-500 hover:bg-orange-50 rounded-xl" onClick={() => window.open('https://wing.coupang.com', '_blank')}>
                  <ArrowUpRight className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          </div>

          {/* AI Market Intelligence */}
          <Card className="border-slate-100 shadow-sm rounded-2xl overflow-hidden flex flex-col min-h-[850px]">
            <CardHeader className="py-5 px-6 border-b border-slate-50 shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-emerald-50 rounded-lg">
                    <Globe className="w-4 h-4 text-emerald-500" />
                  </div>
                  <CardTitle className="text-sm font-black text-slate-700 uppercase tracking-wide">AI Market Intelligence</CardTitle>
                  <Badge variant="outline" className="text-[8px] font-bold text-slate-400 border-slate-200 px-2 py-0 ml-2">Live</Badge>
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-slate-600" onClick={() => router.push('/settings')}>
                  <Settings2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0 flex-1 flex flex-col">
              <Tabs defaultValue="summary" className="w-full flex-1 flex flex-col">
                <TabsList className="bg-slate-50/50 p-1 rounded-none border-b border-slate-50 h-12 w-full justify-start px-6 shrink-0">
                  <TabsTrigger value="summary" className="rounded-md data-[state=active]:bg-white text-[10px] font-bold gap-1.5 h-8 px-4">
                    <BookOpen className="w-3 h-3 text-purple-500" /> 종합 리포트
                  </TabsTrigger>
                  <TabsTrigger value="news" className="rounded-md data-[state=active]:bg-white text-[10px] font-bold gap-1.5 h-8 px-4">
                    <Newspaper className="w-3 h-3 text-blue-500" /> 실시간 뉴스피드
                  </TabsTrigger>
                </TabsList>

                {/* 종합 리포트 탭 */}
                <TabsContent value="summary" className="p-0 mt-0 flex-1 flex flex-col">
                  {loadingPortal ? (
                    <div className="py-20 text-center m-6">
                      <div className="w-16 h-16 mx-auto mb-4 bg-slate-50 rounded-2xl flex items-center justify-center">
                        <RefreshCcw className="w-8 h-8 text-slate-300 animate-spin" />
                      </div>
                      <p className="text-sm font-bold text-slate-400">데이터를 불러오는 중입니다...</p>
                    </div>
                  ) : portalData?.summaries && portalData.summaries.length > 0 ? (
                    <div className="flex flex-col h-full">
                      <div className="divide-y divide-slate-50 flex-1">
                        {portalData.summaries.slice((summaryPage - 1) * ITEMS_PER_PAGE.summary, summaryPage * ITEMS_PER_PAGE.summary).map((summary: any) => (
                          <div
                            key={summary.id}
                            className="group p-5 hover:bg-slate-50/50 transition-all cursor-pointer relative"
                            onClick={() => {
                              setSelectedSummary(summary);
                              setIsSummaryDialogOpen(true);
                            }}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <Badge className={cn("border-none text-[9px] font-black px-2 py-0.5 shadow-sm", getReportStyle(summary.report_type).color)}>
                                  {getReportStyle(summary.report_type).label}
                                </Badge>
                                <Badge variant="outline" className="bg-white text-slate-400 border-slate-200 text-[8px] font-black px-1.5 py-0">
                                  {summary.period_type === 'weekly' ? '주간' : '일간'}
                                </Badge>
                                <span className="text-[10px] text-slate-400 font-bold ml-1">
                                  {format(new Date(summary.created_at), 'MM.dd HH:mm')}
                                </span>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-slate-200 hover:text-red-500 rounded-lg shrink-0"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (confirm("이 리포트를 정말 삭제하시겠습니까? 삭제된 데이터는 복구할 수 없습니다.")) {
                                    handleDelete('summary', summary.id);
                                  }
                                }}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                            <h4 className="text-sm font-black text-slate-800 mb-2 group-hover:text-primary transition-colors line-clamp-2 leading-tight">
                              {summary.title}
                            </h4>
                            <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                              {summary.key_takeaways?.slice(0, 3).map((point: string, idx: number) => (
                                <div key={idx} className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100/50 shrink-0">
                                  <Check className="w-2.5 h-2.5 text-emerald-500 shrink-0" />
                                  <div className="text-[10px] font-bold text-slate-500 truncate max-w-[150px]">
                                    <ReactMarkdown components={{ p: ({ node, ...props }) => <span {...props} /> }}>
                                      {point.replace(/\\/g, '')}
                                    </ReactMarkdown>
                                  </div>
                                </div>
                              ))}
                              {summary.key_takeaways?.length > 3 && (
                                <span className="text-[10px] text-slate-300 font-bold self-center shrink-0">+{summary.key_takeaways.length - 3}</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* 종합 리포트 페이지네이션 */}
                      <div className="flex items-center justify-center gap-2 p-6 shrink-0 border-t border-slate-50">
                        <Button
                          variant="outline" size="sm"
                          disabled={summaryPage === 1}
                          onClick={() => setSummaryPage(p => p - 1)}
                          className="h-8 w-8 p-0 rounded-lg"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </Button>
                        <span className="text-xs font-bold text-slate-500">{summaryPage}</span>
                        <Button
                          variant="outline" size="sm"
                          disabled={summaryPage * ITEMS_PER_PAGE.summary >= (portalData?.summaries?.length || 0)}
                          onClick={() => setSummaryPage(p => p + 1)}
                          className="h-8 w-8 p-0 rounded-lg"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="py-20 text-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-100 m-6">
                      <div className="w-16 h-16 mx-auto mb-4 bg-purple-50 rounded-2xl flex items-center justify-center">
                        <BookOpen className="w-8 h-8 text-purple-500 animate-pulse" />
                      </div>
                      <p className="text-sm font-bold text-slate-400">아직 생성된 종합 리포트가 없습니다.</p>
                      <p className="text-[10px] text-slate-300 mt-1">n8n 워크플로우를 통해 데이터가 수집되면 자동으로 생성됩니다.</p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-4 h-8 text-[10px] rounded-xl font-black"
                        onClick={async () => {
                          setLoadingPortal(true);
                          const portalRes = await fetch('/api/home/portal', { cache: 'no-store' });
                          const portalJson = await portalRes.json();
                          if (portalJson.success) setPortalData(portalJson.data);
                          setLoadingPortal(false);
                        }}
                      >
                        <RefreshCcw className="w-3 h-3 mr-1.5" /> 다시 확인하기
                      </Button>
                    </div>
                  )}
                </TabsContent>

                {/* 실시간 뉴스피드 탭 */}
                <TabsContent value="news" className="p-0 mt-0 flex-1 flex flex-col">
                  {portalData?.news && (Array.isArray(portalData.news) ? portalData.news.length > 0 : Object.keys(portalData.news).length > 0) ? (
                    <div className="flex flex-col h-full">
                      <div className="divide-y divide-slate-50 flex-1">
                        {(Array.isArray(portalData.news)
                          ? portalData.news
                          : Object.values(portalData.news).flat()
                        ).slice((newsPage - 1) * ITEMS_PER_PAGE.news, newsPage * ITEMS_PER_PAGE.news).map((news: any, i: number) => (
                          <div key={i} className="group p-5 hover:bg-slate-50/50 transition-all cursor-pointer relative" onClick={() => window.open(news.url, '_blank')}>
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className={cn("text-[9px] font-black px-2 py-0.5", getCategoryColor(news.category))}>
                                  {news.category || '기타'}
                                </Badge>
                                <span className="text-[10px] text-slate-400 font-bold ml-1">{news.source}</span>
                                <span className="text-[10px] text-slate-400 font-bold ml-1">
                                  {news.published_at ? format(new Date(news.published_at), 'MM.dd HH:mm') : ''}
                                </span>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-slate-200 hover:text-red-500 rounded-lg shrink-0"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (confirm("이 뉴스를 정말 삭제하시겠습니까? 삭제된 데이터는 복구할 수 없습니다.")) {
                                    handleDelete('news', news.id);
                                  }
                                }}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                            <h4 className="text-sm font-black text-slate-800 mb-2 group-hover:text-primary transition-colors line-clamp-2 leading-tight">
                              {renderMarkdownInline(news.title)}
                            </h4>
                            {news.content && (
                              <div className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed font-medium">
                                <ReactMarkdown components={{ p: ({ node, ...props }) => <span {...props} /> }}>
                                  {news.content.replace(/\\/g, '')}
                                </ReactMarkdown>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* 뉴스피드 페이지네이션 */}
                      <div className="flex items-center justify-center gap-2 p-6 shrink-0 border-t border-slate-50">
                        <Button
                          variant="outline" size="sm"
                          disabled={newsPage === 1}
                          onClick={() => setNewsPage(p => p - 1)}
                          className="h-8 w-8 p-0 rounded-lg"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </Button>
                        <span className="text-xs font-bold text-slate-500">{newsPage}</span>
                        <Button
                          variant="outline" size="sm"
                          disabled={newsPage * ITEMS_PER_PAGE.news >= (Array.isArray(portalData.news) ? portalData.news.length : Object.values(portalData.news).flat().length)}
                          onClick={() => setNewsPage(p => p + 1)}
                          className="h-8 w-8 p-0 rounded-lg"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="py-20 text-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-100 m-6">
                      <div className="w-16 h-16 mx-auto mb-4 bg-blue-50 rounded-2xl flex items-center justify-center">
                        <Newspaper className="w-8 h-8 text-blue-500 animate-pulse" />
                      </div>
                      <p className="text-sm font-bold text-slate-400">수집된 최신 뉴스가 없습니다.</p>
                      <p className="text-[10px] text-slate-300 mt-1">n8n을 통해 실시간 뉴스피드가 업데이트됩니다.</p>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* 목표 진행 현황 - 2열 차지하도록 수정 */}
          <Card className="border-slate-100 shadow-sm rounded-2xl">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-[var(--pastel-green-fg)]" />
                  <h3 className="text-sm font-black text-slate-900">Goal Progress</h3>
                </div>
                <Button variant="ghost" size="sm" className="h-7 text-xs font-bold text-slate-400 hover:text-[var(--pastel-blue-fg)]" onClick={() => router.push('/goals')}>
                  전체보기 <ChevronRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </div>
              {loadingGoals ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {[1, 2, 3].map(i => <div key={i} className="h-24 bg-slate-50 animate-pulse rounded-xl" />)}
                </div>
              ) : goals.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {goals.map((goal, i) => (
                    <div key={i} className="bg-slate-50 p-4 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer border border-transparent hover:border-slate-200 shadow-sm" onClick={() => router.push('/goals')}>
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1 min-w-0 mr-2">
                          <Badge className="bg-white text-slate-500 border-none text-[8px] font-black uppercase px-1.5 py-0 mb-1.5 shadow-sm">{goal.organization || 'TASK'}</Badge>
                          <h4 className="text-xs font-black text-slate-800 line-clamp-1">{goal.title}</h4>
                        </div>
                        <span className="text-xl font-black text-slate-900 leading-none">{goal.progress}<span className="text-[10px] text-slate-400 font-bold ml-0.5">%</span></span>
                      </div>
                      <Progress value={goal.progress} className="h-2 bg-white mb-2 shadow-inner" />
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] font-bold text-slate-400">{goal.metric_name}</p>
                        <p className="text-[10px] font-black text-slate-700">{goal.current_value?.toLocaleString()} / {goal.target_value?.toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <Target className="w-10 h-10 text-slate-200 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-400">설정된 목표가 없습니다</p>
                  <Button variant="outline" size="sm" className="mt-3 h-8 text-[10px] rounded-xl font-black" onClick={() => router.push('/goals')}>목표 추가하기</Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* 오른쪽 사이드바 (4컬럼) */}
        <div className="xl:col-span-4 space-y-4">
          {/* HOT PRODUCTS */}
          <Card className="border-slate-100 shadow-sm rounded-2xl">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Flame className="w-4 h-4 text-orange-500" />
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">Hot Products</h3>
                </div>
                <Badge variant="secondary" className="bg-orange-50 text-orange-600 border-none text-[10px] font-black px-2 py-0">Weekly Top</Badge>
              </div>
              <div className="space-y-3">
                {loadingWeekly ? (
                  [1, 2, 3].map(i => <div key={i} className="h-14 bg-slate-50 animate-pulse rounded-2xl" />)
                ) : hotProducts.length > 0 ? (
                  hotProducts.map((item, i) => (
                    <div key={i} className="flex items-center justify-between gap-2 p-3 bg-slate-50 rounded-2xl">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-xs font-black shadow-sm border border-slate-100 shrink-0">{i + 1}</div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-black text-slate-800 truncate">{item.name}</p>
                          <p className="text-[10px] font-bold text-slate-400">{item.sales}원</p>
                        </div>
                      </div>
                      <div className={cn("flex items-center gap-1 text-[10px] font-black shrink-0", item.up ? "text-[var(--pastel-trend-up-fg)]" : "text-red-500")}>
                        {item.up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        {item.trend}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-8 text-center text-[10px] text-slate-400 font-bold">이번 주 판매 데이터가 없습니다</div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* CHANNEL CVR */}
          <Card className="border-slate-100 shadow-sm rounded-2xl">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-blue-500" />
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">Channel CVR</h3>
                </div>
              </div>
              <div className="space-y-4">
                {[
                  { name: "스마트스토어", rate: 4.2, orders: 34, color: "bg-green-500" },
                  { name: "오늘의집", rate: 3.8, orders: 28, color: "bg-blue-400" },
                ].map((item, i) => (
                  <div key={i} className="space-y-2">
                    <div className="flex justify-between items-end">
                      <p className="text-[10px] font-black text-slate-500 uppercase">{item.name}</p>
                      <p className="text-xs font-black text-slate-900">{item.orders}<span className="text-[10px] text-slate-400 font-bold ml-0.5">건</span> <span className="ml-2 text-sm">{item.rate}%</span></p>
                    </div>
                    <Progress value={item.rate * 10} className={cn("h-1.5", item.color)} />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 종합 리포트 상세 팝업 */}
      <Dialog open={isSummaryDialogOpen} onOpenChange={setIsSummaryDialogOpen}>
        <DialogContent className="max-w-[95vw] md:max-w-4xl h-[90vh] flex flex-col p-0 rounded-3xl border-none shadow-2xl overflow-hidden">
          {selectedSummary && (
            <>
              <DialogHeader className="p-8 pb-4 bg-slate-50/50 shrink-0">
                <div className="flex items-center gap-2 mb-2">
                  <Badge className={cn("border-none text-[10px] font-black px-2 py-0.5 shadow-sm", getReportStyle(selectedSummary.report_type).color)}>
                    {getReportStyle(selectedSummary.report_type).label}
                  </Badge>
                  <Badge variant="outline" className="bg-white text-slate-400 border-slate-200 text-[10px] font-black">
                    {selectedSummary.period_type === 'weekly' ? '주간' : '일간'}
                  </Badge>
                  <span className="text-[11px] text-slate-400 font-bold ml-2">
                    {format(new Date(selectedSummary.created_at), 'yyyy.MM.dd HH:mm')} 발행
                  </span>
                </div>
                <DialogTitle className="text-2xl font-black text-slate-900 leading-tight">
                  {selectedSummary.title}
                </DialogTitle>
              </DialogHeader>

              <div className="flex-1 overflow-y-auto px-8 py-4 custom-scrollbar">
                <div className="space-y-8 pb-12">
                  {/* 요약 포인트 */}
                  {selectedSummary.key_takeaways && selectedSummary.key_takeaways.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {selectedSummary.key_takeaways.map((point: string, idx: number) => (
                        <div key={idx} className="bg-[var(--pastel-purple-bg)]/30 p-4 rounded-2xl border border-[var(--pastel-purple-bg)]/50 flex items-start gap-3">
                          <div className="w-5 h-5 rounded-full bg-[var(--pastel-purple-fg)] flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                            <Check className="w-3 h-3 text-white" />
                          </div>
                          <div className="text-[12px] font-black text-slate-700 leading-snug">
                            <ReactMarkdown
                              remarkPlugins={[remarkGfm]}
                              components={{
                                p: ({ node, ...props }) => <span {...props} />,
                                strong: ({ node, ...props }) => <strong className="font-black text-[var(--pastel-purple-fg)]" {...props} />
                              }}
                            >
                              {point.replace(/\\/g, '')}
                            </ReactMarkdown>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* 본문 콘텐츠 */}
                  <div className="prose prose-slate max-w-none prose-sm md:prose-base prose-headings:font-black prose-headings:text-slate-900 prose-p:text-slate-700 prose-p:leading-relaxed prose-strong:text-[var(--pastel-purple-fg)] prose-strong:font-black">
                    {selectedSummary.combined_content?.trim().startsWith('<!DOCTYPE') || selectedSummary.combined_content?.trim().startsWith('<html') ? (
                      <div className="rounded-3xl border border-slate-100 overflow-hidden shadow-sm bg-white min-h-[600px]">
                        <iframe
                          srcDoc={selectedSummary.combined_content}
                          className="w-full min-h-[600px] border-none"
                          title="AI Intelligence Report Detail"
                          sandbox="allow-popups allow-popups-to-escape-sandbox allow-scripts"
                        />
                      </div>
                    ) : (
                      <div className="bg-white rounded-3xl border border-slate-100 p-6 md:p-12 shadow-sm">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            h1: ({ node, ...props }) => <h1 className="text-2xl md:text-3xl font-black text-slate-900 mb-8 pb-4 border-b-4 border-[var(--pastel-purple-bg)]" {...props} />,
                            h2: ({ node, ...props }) => <h2 className="text-xl md:text-2xl font-black text-slate-800 mt-12 mb-6 flex items-center gap-3 before:content-[''] before:w-1.5 before:h-8 before:bg-[var(--pastel-purple-fg)] before:rounded-full" {...props} />,
                            h3: ({ node, ...props }) => <h3 className="text-lg md:text-xl font-black text-slate-800 mt-8 mb-4 bg-slate-50 p-3 rounded-xl border-l-4 border-[var(--pastel-blue-fg)]" {...props} />,
                            h4: ({ node, ...props }) => <h4 className="text-base md:text-lg font-bold text-[var(--pastel-purple-fg)] mt-6 mb-3" {...props} />,
                            p: ({ node, ...props }) => <p className="text-sm md:text-base text-slate-600 leading-[1.8] mb-6 font-medium" {...props} />,
                            ul: ({ node, ...props }) => <ul className="space-y-3 mb-8 ml-4" {...props} />,
                            li: ({ node, ...props }) => (
                              <li className="flex items-start gap-3 text-sm md:text-base text-slate-600 leading-relaxed mb-2">
                                <div className="mt-2.5 w-1.5 h-1.5 rounded-full bg-[var(--pastel-purple-fg)] shrink-0" />
                                <div className="font-medium flex-1">{props.children}</div>
                              </li>
                            ),
                            hr: () => <hr className="my-12 border-0 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />,
                            strong: ({ node, ...props }) => <strong className="font-black text-[var(--pastel-purple-fg)] bg-[var(--pastel-purple-bg)]/30 px-1 rounded" {...props} />,
                            blockquote: ({ node, ...props }) => (
                              <blockquote className="border-l-4 border-slate-200 pl-6 my-8 italic text-slate-500 font-medium" {...props} />
                            )
                          }}
                        >
                          {selectedSummary.combined_content.replace(/\\/g, '')}
                        </ReactMarkdown>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-6 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-4">
                  <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Was this helpful?</span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9 px-4 text-xs font-black text-slate-600 border-slate-200 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"
                      onClick={() => handleFeedback(selectedSummary.id, 'helpful')}
                    >
                      <ThumbsUp className="w-4 h-4 mr-2" /> {selectedSummary.helpful_count || 0}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9 px-4 text-xs font-black text-slate-600 border-slate-200 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                      onClick={() => handleFeedback(selectedSummary.id, 'unhelpful')}
                    >
                      <ThumbsDown className="w-4 h-4 mr-2" /> {selectedSummary.unhelpful_count || 0}
                    </Button>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-[11px] font-bold text-slate-400 bg-white px-3 py-1.5 rounded-lg border border-slate-100 shadow-sm">
                  <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                  <span>AI Model: {selectedSummary.ai_model_version || 'Gemini 2.0 Flash'}</span>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* 저재고 상품 목록 팝업 */}
      <Dialog open={isLowStockDialogOpen} onOpenChange={setIsLowStockDialogOpen}>
        <DialogContent className="max-w-[90vw] md:max-w-3xl max-h-[85vh] flex flex-col p-0 overflow-hidden border-none rounded-3xl">
          <DialogHeader className="p-6 bg-gradient-to-r from-emerald-500 to-teal-600 text-white shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                <Package className="w-5 h-5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-black">품절 임박 상품 리스트</DialogTitle>
                <p className="text-emerald-50/80 text-xs font-bold mt-1">현재 재고가 20개 미만인 모든 품목입니다.</p>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-6 bg-slate-50/30">
            {commerceData?.totalLowStockItems && commerceData.totalLowStockItems.length > 0 ? (
              <div className="grid grid-cols-1 gap-3">
                {commerceData.totalLowStockItems.map((item: any, idx: number) => (
                  <div key={idx} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-emerald-200 transition-all">
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <Badge className={cn(
                        "text-[10px] font-black px-2 py-0.5 rounded-lg border-none shrink-0",
                        item.platform === 'naver' ? "bg-emerald-100 text-emerald-600" : "bg-orange-100 text-orange-600"
                      )}>
                        {item.platform === 'naver' ? 'NAVER' : 'COUPANG'}
                      </Badge>
                      <span className="text-sm font-black text-slate-700 truncate">{item.name}</span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 self-end md:self-center">
                      <span className="text-[11px] font-bold text-slate-400">실시간 재고</span>
                      <Badge variant="outline" className={cn(
                        "text-base font-black px-4 py-1 rounded-xl shadow-sm",
                        item.stock <= 5 ? "bg-red-50 text-red-600 border-red-100" : "bg-emerald-50 text-emerald-600 border-emerald-100"
                      )}>
                        {item.stock}개
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-20 text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-emerald-50 rounded-2xl flex items-center justify-center">
                  <Check className="w-8 h-8 text-emerald-500" />
                </div>
                <p className="text-sm font-black text-slate-400">품절 임박 상품이 없습니다. 완벽해요!</p>
              </div>
            )}
          </div>

          <div className="p-4 bg-white border-t border-slate-100 flex justify-end shrink-0">
            <Button variant="outline" onClick={() => setIsLowStockDialogOpen(false)} className="rounded-xl font-black text-xs h-10 px-6">
              닫기
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

