"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Link2, Copy, Check, ExternalLink, Clock, Trash2, Search, Filter,
  RefreshCcw, BarChart3, ChevronLeft, ChevronRight, MoreHorizontal,
  MousePointer2, Calendar, FileText, ArrowUpRight
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { useRightPanel } from '@/lib/context/right-panel-context';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

interface ShortenedUrl {
  id: string;
  short_code: string;
  original_url: string;
  title: string | null;
  description: string | null;
  click_count: number;
  created_at: string;
  expires_at: string | null;
  is_active: boolean;
  short_url: string;
  is_expired: boolean;
}

interface DashboardStats {
  totalUrls: number;
  activeUrls: number;
  todayCreated: number;
  expiredUrls: number;
  totalClicks: number;
  todayClicks: number;
}

interface DetailStats {
  totalClicks: number;
  todayClicks: number;
  weekClicks: number;
  last7Days: { date: string; count: number }[];
  recentLogs: {
    id: string;
    clicked_at: string;
    ip_address: string;
    referer: string;
    user_agent: string;
  }[];
}

export default function UrlShortenerPage() {
  // --- States ---
  const [stats, setStats] = useState<DashboardStats>({
    totalUrls: 0, activeUrls: 0, todayCreated: 0, expiredUrls: 0, totalClicks: 0, todayClicks: 0
  });

  const [recentUrls, setRecentUrls] = useState<ShortenedUrl[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingStats, setIsLoadingStats] = useState(false);

  // Filter/Sort
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const limit = 10;

  // Selected for Detail
  const [selectedUrl, setSelectedUrl] = useState<ShortenedUrl | null>(null);
  const [detailStats, setDetailStats] = useState<DetailStats | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  // Creation Form State
  const [originalUrl, setOriginalUrl] = useState('');
  const [customCode, setCustomCode] = useState('');
  const [title, setTitle] = useState('');
  const [expiresIn, setExpiresIn] = useState('0');
  const [isCreating, setIsCreating] = useState(false);

  const { setContent, open } = useRightPanel();

  // --- Formatters ---
  const formatDate = useCallback((dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric', month: 'long', day: 'numeric'
    });
  }, []);

  const formatDateTime = useCallback((dateString: string) => {
    return new Date(dateString).toLocaleString('ko-KR', {
      month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
    });
  }, []);

  // --- API Calls ---

  // 1. Fetch Dashboard Stats
  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/url-shortener/summary');
      const data = await res.json();
      if (data.success) {
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Failed to fetch stats', error);
    }
  }, []);

  // 2. Fetch URL List
  const loadUrls = useCallback(async () => {
    setIsLoading(true);
    try {
      const queryParams = new URLSearchParams({
        page: currentPage.toString(),
        limit: limit.toString(),
        sortBy,
        sortOrder,
        search: searchTerm,
        filter
      });
      const response = await fetch(`/api/url-shortener/list?${queryParams}`);
      const result = await response.json();
      if (result.success) {
        setRecentUrls(result.data || []);
        setTotalPages(result.pagination?.totalPages || 1);
        setTotalItems(result.pagination?.total || 0);
      }
    } catch (error) {
      toast.error('목록을 불러오지 못했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, sortBy, sortOrder, searchTerm, filter]);

  // 3. Fetch Detail Stats
  const fetchDetailStats = useCallback(async (id: string) => {
    setIsLoadingDetail(true);
    try {
      const res = await fetch(`/api/url-shortener/${id}/stats`);
      const data = await res.json();
      if (data.success) {
        setDetailStats(data.stats);
      }
    } catch (error) {
      console.error('Detail stats error', error);
    } finally {
      setIsLoadingDetail(false);
    }
  }, []);

  // --- Effects ---
  useEffect(() => {
    fetchStats();
    loadUrls();
  }, [fetchStats, loadUrls]);

  useEffect(() => {
    if (selectedUrl) {
      fetchDetailStats(selectedUrl.id);
      open();
    }
  }, [selectedUrl, fetchDetailStats, open]);

  // --- Handlers ---
  const handleToggleActive = useCallback(async (id: string, currentStatus: boolean, e: React.MouseEvent) => {
    e.stopPropagation();
    const newStatus = !currentStatus;

    // Optimistic UI Update
    setRecentUrls(prev => prev.map(url => url.id === id ? { ...url, is_active: newStatus } : url));
    if (selectedUrl?.id === id) {
      setSelectedUrl(prev => prev ? { ...prev, is_active: newStatus } : null);
    }

    try {
      const response = await fetch(`/api/url-shortener/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: newStatus })
      });

      if (response.ok) {
        toast.success(newStatus ? '활성화되었습니다' : '비활성화되었습니다');
        fetchStats();
      } else {
        // Rollback on failure
        setRecentUrls(prev => prev.map(url => url.id === id ? { ...url, is_active: currentStatus } : url));
        if (selectedUrl?.id === id) {
          setSelectedUrl(prev => prev ? { ...prev, is_active: currentStatus } : null);
        }
        toast.error('상태 변경 실패');
      }
    } catch {
      // Rollback on error
      setRecentUrls(prev => prev.map(url => url.id === id ? { ...url, is_active: currentStatus } : url));
      if (selectedUrl?.id === id) {
        setSelectedUrl(prev => prev ? { ...prev, is_active: currentStatus } : null);
      }
      toast.error('오류 발생');
    }
  }, [selectedUrl, fetchStats]);

  const handleCopy = useCallback((url: string) => {
    navigator.clipboard.writeText(url);
    toast.success('복사되었습니다');
  }, []);

  const handleDelete = useCallback(async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!confirm('삭제하시겠습니까?')) return;
    try {
      await fetch(`/api/url-shortener/${id}`, { method: 'DELETE' });
      toast.success('삭제되었습니다');
      loadUrls();
      fetchStats();
      if (selectedUrl?.id === id) setSelectedUrl(null);
    } catch {
      toast.error('삭제 실패');
    }
  }, [loadUrls, fetchStats, selectedUrl?.id]);

  const handleCreate = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!originalUrl) return;
    setIsCreating(true);
    try {
      const response = await fetch('/api/url-shortener/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          originalUrl,
          customCode: customCode || undefined,
          title: title || undefined,
          expiresIn: expiresIn === '0' ? null : parseInt(expiresIn)
        }),
      });
      if (response.ok) {
        toast.success('생성되었습니다');
        setOriginalUrl('');
        setCustomCode('');
        setTitle('');
        loadUrls();
        fetchStats();
      } else {
        toast.error('생성 실패');
      }
    } catch {
      toast.error('오류 발생');
    } finally {
      setIsCreating(false);
    }
  }, [originalUrl, customCode, title, expiresIn, loadUrls, fetchStats]);

  // --- Right Panel Content ---
  const rightPanelContent = useMemo(() => {
    if (!selectedUrl) {
      // Creation Form (Default)
      return (
        <div className="space-y-6">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-1.5 h-5 bg-primary rounded-full"></div>
            <h3 className="text-lg font-bold">새 단축 URL</h3>
          </div>

          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-700 ml-1">원본 URL *</Label>
              <Input
                value={originalUrl} onChange={e => setOriginalUrl(e.target.value)}
                placeholder="https://example.com" required
                className="bg-slate-50 border-slate-200 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-700 ml-1">제목 (선택)</Label>
              <Input
                value={title} onChange={e => setTitle(e.target.value)}
                placeholder="관리용 제목"
                className="bg-slate-50 border-slate-200 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-700 ml-1">커스텀 코드 (선택)</Label>
              <Input
                value={customCode} onChange={e => setCustomCode(e.target.value)}
                placeholder="alias"
                className="bg-slate-50 border-slate-200 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-700 ml-1">만료 기간</Label>
              <Select value={expiresIn} onValueChange={setExpiresIn}>
                <SelectTrigger className="bg-slate-50 border-slate-200 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">무기한</SelectItem>
                  <SelectItem value="7">7일</SelectItem>
                  <SelectItem value="30">30일</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" disabled={isCreating} className="w-full h-12 rounded-2xl font-bold shadow-lg">
              {isCreating ? '생성 중...' : '생성하기'}
            </Button>
          </form>
        </div>
      );
    }

    // Detail View
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-5 bg-primary rounded-full"></div>
            <h3 className="text-lg font-bold">URL 상세 통계</h3>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setSelectedUrl(null)}>
            <ChevronLeft className="w-4 h-4 mr-1" /> 목록
          </Button>
        </div>

        {/* Info Card */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <h4 className="font-bold text-slate-800 line-clamp-1">{selectedUrl.title || '제목 없음'}</h4>
              <a href={selectedUrl.short_url} target="_blank" rel="noreferrer" className="text-xs text-primary font-bold hover:underline flex items-center gap-1 mt-1">
                {selectedUrl.short_url} <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <Badge variant={selectedUrl.is_active ? (selectedUrl.is_expired ? 'destructive' : 'secondary') : 'secondary'} className={selectedUrl.is_active ? (selectedUrl.is_expired ? '' : 'bg-green-100 text-green-700 hover:bg-green-100') : 'bg-slate-100 text-slate-500 hover:bg-slate-100'}>
              {selectedUrl.is_active ? (selectedUrl.is_expired ? 'Expired' : 'Active') : 'Inactive'}
            </Badge>
          </div>
          <div className="grid grid-cols-3 gap-2 py-2 border-t border-slate-100 mt-2">
            <div className="text-center">
              <p className="text-[10px] text-slate-400 font-bold uppercase">Total</p>
              <p className="text-lg font-black text-slate-800">{detailStats?.totalClicks || 0}</p>
            </div>
            <div className="text-center border-l border-slate-100">
              <p className="text-[10px] text-slate-400 font-bold uppercase">Today</p>
              <p className="text-lg font-black text-primary">{detailStats?.todayClicks || 0}</p>
            </div>
            <div className="text-center border-l border-slate-100">
              <p className="text-[10px] text-slate-400 font-bold uppercase">7 Days</p>
              <p className="text-lg font-black text-slate-800">{detailStats?.weekClicks || 0}</p>
            </div>
          </div>
          {selectedUrl.expires_at && (
            <div className="flex items-center gap-2 pt-2 border-t border-slate-100 text-[11px] text-slate-500 font-medium">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>만료 일시: <span className="font-bold text-slate-700">{formatDateTime(selectedUrl.expires_at)}</span></span>
            </div>
          )}
        </div>

        {/* Chart */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-slate-500" />
            <h4 className="text-sm font-bold text-slate-700">최근 7일 클릭 추이</h4>
          </div>
          <div className="h-48 bg-white rounded-2xl border border-slate-200 p-2 shadow-sm">
            {detailStats?.last7Days ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={detailStats.last7Days}>
                  <defs>
                    <linearGradient id="colorClick" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10, fill: '#64748b' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(str) => str.slice(5)}
                  />
                  <YAxis hide domain={[0, 'auto']} />
                  <Tooltip
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    labelStyle={{ color: '#64748b', fontSize: '10px' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    fill="url(#colorClick)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">데이터 로딩 중...</div>
            )}
          </div>
        </div>

        {/* Logs */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-slate-500" />
            <h4 className="text-sm font-bold text-slate-700">최근 클릭 로그</h4>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="h-8 text-[10px] font-bold">시간</TableHead>
                  <TableHead className="h-8 text-[10px] font-bold">IP/정보</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {detailStats?.recentLogs.map(log => (
                  <TableRow key={log.id} className="h-10">
                    <TableCell className="py-2 text-[10px] text-slate-500">
                      {formatDateTime(log.clicked_at).split('. ')[2] + ':' + formatDateTime(log.clicked_at).split(':')[1]}
                      <div className="text-[9px] text-slate-400">{log.clicked_at.split('T')[0]}</div>
                    </TableCell>
                    <TableCell className="py-2">
                      <div className="text-[11px] font-mono text-slate-700">{log.ip_address}</div>
                      <div className="text-[9px] text-slate-400 truncate max-w-[150px]" title={log.referer}>
                        {log.referer || 'Direct Logs'}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {(!detailStats?.recentLogs || detailStats.recentLogs.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={2} className="h-24 text-center text-xs text-slate-400">
                      기록된 로그가 없습니다.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    );
  }, [selectedUrl, originalUrl, title, customCode, expiresIn, isCreating, detailStats, formatDateTime, handleCreate]);

  // Update Right Panel Context
  useEffect(() => {
    setContent(rightPanelContent);
  }, [setContent, rightPanelContent]);

  // --- Main Render ---
  return (
    <div className="max-w-7xl mx-auto space-y-6">

      {/* 1. Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total URL */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/60 shadow-sm flex flex-col justify-between h-32">
          <div className="flex justify-between items-start">
            <span className="text-sm font-bold text-slate-600">총 URL</span>
            <Link2 className="w-4 h-4 text-slate-400" />
          </div>
          <div>
            <span className="text-3xl font-black text-slate-800">{stats.totalUrls}</span>
            <p className="text-xs text-slate-400 mt-1">활성: {stats.activeUrls} / 비활성: {stats.totalUrls - stats.activeUrls}</p>
          </div>
        </div>
        {/* Total Clicks */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/60 shadow-sm flex flex-col justify-between h-32">
          <div className="flex justify-between items-start">
            <span className="text-sm font-bold text-slate-600">총 클릭수</span>
            <MousePointer2 className="w-4 h-4 text-slate-400" />
          </div>
          <div>
            <span className="text-3xl font-black text-slate-800">{stats.totalClicks}</span>
            <p className="text-xs text-slate-400 mt-1">오늘: <span className="text-primary font-bold">{stats.todayClicks}</span></p>
          </div>
        </div>
        {/* Today Created */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/60 shadow-sm flex flex-col justify-between h-32">
          <div className="flex justify-between items-start">
            <span className="text-sm font-bold text-slate-600">오늘 생성</span>
            <Clock className="w-4 h-4 text-slate-400" />
          </div>
          <div>
            <span className="text-3xl font-black text-slate-800">{stats.todayCreated}</span>
            <p className="text-xs text-slate-400 mt-1">신규 URL</p>
          </div>
        </div>
        {/* Expired */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/60 shadow-sm flex flex-col justify-between h-32">
          <div className="flex justify-between items-start">
            <span className="text-sm font-bold text-slate-600">만료됨</span>
            <BarChart3 className="w-4 h-4 text-slate-400" />
          </div>
          <div>
            <span className="text-3xl font-black text-slate-800">{stats.expiredUrls}</span>
            <p className="text-xs text-slate-400 mt-1">기간 만료된 URL</p>
          </div>
        </div>
      </div>

      {/* 2. Control Bar */}
      <div className="bg-white rounded-3xl border border-slate-200/60 shadow-sm p-5 space-y-4 md:space-y-0 md:flex md:items-end md:gap-4">
        <div className="flex-1 space-y-2">
          <Label className="text-xs font-bold text-slate-700">검색</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="코드, URL, 제목으로 검색..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-9 bg-slate-50 border-slate-200 rounded-xl"
            />
          </div>
        </div>
        <div className="w-full md:w-32 space-y-2">
          <Label className="text-xs font-bold text-slate-700">필터</Label>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="bg-slate-50 border-slate-200 rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체</SelectItem>
              <SelectItem value="active">활성</SelectItem>
              <SelectItem value="expired">만료됨</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="w-full md:w-32 space-y-2">
          <Label className="text-xs font-bold text-slate-700">정렬</Label>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="bg-slate-50 border-slate-200 rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="created_at">최신순</SelectItem>
              <SelectItem value="click_count">클릭순</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 3. URL List Table */}
      <div className="bg-white rounded-3xl border border-slate-200/60 shadow-sm overflow-hidden min-h-[500px] flex flex-col">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-bold text-slate-800">URL 목록</h3>
            <p className="text-xs text-slate-400">총 {totalItems}개 (현재 페이지: {currentPage}/{totalPages})</p>
          </div>
          <Button onClick={() => setSelectedUrl(null)} className="rounded-xl font-bold bg-primary text-white shadow-lg shadow-primary/20">
            + 새 링크 생성
          </Button>
        </div>

        <div className="flex-1 overflow-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/50 hover:bg-slate-50/50">
                <TableHead className="w-12 text-center text-xs font-bold">#</TableHead>
                <TableHead className="w-32 text-xs font-bold">코드</TableHead>
                <TableHead className="text-xs font-bold">제목/원본 URL</TableHead>
                <TableHead className="w-20 text-center text-xs font-bold">클릭</TableHead>
                <TableHead className="w-32 text-center text-xs font-bold">생성일</TableHead>
                <TableHead className="w-20 text-center text-xs font-bold">활성</TableHead>
                <TableHead className="w-20 text-center text-xs font-bold">상태</TableHead>
                <TableHead className="w-32 text-center text-xs font-bold">작업</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-64 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <RefreshCcw className="w-6 h-6 animate-spin text-slate-300" />
                      <span className="text-xs text-slate-400">로딩 중...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : recentUrls.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-64 text-center text-slate-400 text-sm">
                    URL이 없습니다.
                  </TableCell>
                </TableRow>
              ) : (
                recentUrls.map((url) => (
                  <TableRow key={url.id} className="group hover:bg-slate-50/50 transition-colors">
                    <TableCell className="text-center">
                      <input type="checkbox" className="rounded border-slate-300 text-primary focus:ring-primary/20" />
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono bg-slate-50 text-slate-600 border-slate-200">
                        {url.short_code}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        <span className="font-bold text-slate-700 text-sm truncate max-w-[300px]">
                          {url.title || '제목 없음'}
                        </span>
                        <span className="text-xs text-slate-400 truncate max-w-[300px] flex items-center gap-1">
                          {url.original_url}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center font-bold text-slate-700">
                      {url.click_count}
                    </TableCell>
                    <TableCell className="text-center text-xs text-slate-500">
                      {formatDate(url.created_at)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={url.is_active}
                        onCheckedChange={(checked) => handleToggleActive(url.id, url.is_active, { stopPropagation: () => { } } as any)}
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex flex-col items-center gap-1">
                        {!url.is_active ? (
                          <Badge variant="secondary" className="h-5 text-[10px] bg-slate-100 text-slate-500 hover:bg-slate-100">비활성</Badge>
                        ) : url.is_expired ? (
                          <Badge variant="destructive" className="h-5 text-[10px]">만료</Badge>
                        ) : (
                          <Badge variant="secondary" className="h-5 text-[10px] bg-green-100 text-green-700 hover:bg-green-100">활성</Badge>
                        )}
                        {url.expires_at && (
                          <span className="text-[9px] text-slate-400 font-medium leading-none" title={formatDateTime(url.expires_at)}>
                            {formatDate(url.expires_at).split(' ').slice(1).join(' ')}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-white hover:shadow-sm border border-transparent hover:border-slate-200 rounded-lg" onClick={() => handleCopy(url.short_url)}>
                          <Copy className="w-3.5 h-3.5 text-slate-400" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-white hover:shadow-sm border border-transparent hover:border-slate-200 rounded-lg" onClick={() => setSelectedUrl(url)}>
                          <ArrowUpRight className="w-3.5 h-3.5 text-slate-400" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-red-50 hover:text-red-500 rounded-lg" onClick={(e) => handleDelete(url.id, e)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
