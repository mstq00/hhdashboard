"use client";

import React, { useState, useEffect } from "react";
import { format, addDays, startOfMonth, endOfMonth, isSameMonth, isSameDay, parseISO } from "date-fns";
import { ko } from "date-fns/locale";
import { Calendar, ChevronLeft, ChevronRight, Lightbulb, BookOpen, ExternalLink, Sparkles, Target, FileText, TrendingUp, Youtube, Instagram, Chrome, BarChart3, Globe, Zap, History } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

const ICON_MAP: Record<string, any> = {
  Youtube, Instagram, Chrome, BarChart3, Globe, Zap, ExternalLink, BookOpen, FileText, TrendingUp, Target, Sparkles, History
};

export function HomeRightPanel() {
  const router = useRouter();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [quickLinks, setQuickLinks] = useState<any[]>([]);
  const [loadingLinks, setLoadingLinks] = useState(true);

  useEffect(() => {
    const fetchQuickLinks = async () => {
      try {
        setLoadingLinks(true);

        const { data, error } = await supabase
          .from('quick_links')
          .select('*')
          .order('sort_order', { ascending: true });

        if (error) {
          if (error.code === 'PGRST116') {
            // 데이터가 없는 경우 무시
            setQuickLinks([]);
            return;
          }
          throw error;
        }
        setQuickLinks(data || []);
      } catch (e) {
        console.error('Error fetching quick links:', e);
      } finally {
        setLoadingLinks(false);
      }
    };

    fetchQuickLinks();
  }, []);

  const daysInMonth = (): (Date | null)[] => {
    const start = startOfMonth(currentDate);
    const end = endOfMonth(currentDate);
    const days: (Date | null)[] = [];

    // 월의 첫 날의 요일 (0=일요일, 6=토요일)
    const firstDayOfWeek = start.getDay();

    // 첫 주의 빈 칸 추가
    for (let i = 0; i < firstDayOfWeek; i++) {
      days.push(null);
    }

    // 실제 날짜 추가
    let day = start;
    while (day <= end) {
      days.push(day);
      day = addDays(day, 1);
    }

    return days;
  };

  const resources = [
    { title: "커머스 크리에이터 가이드", category: "운영", url: "#", color: "blue" },
    { title: "숏폼 제작 체크리스트", category: "콘텐츠", url: "#", color: "purple" },
    { title: "상품 매핑 SOP", category: "운영", url: "#", color: "green" },
    { title: "채널별 최적화 전략", category: "마케팅", url: "#", color: "yellow" },
    { title: "데이터 분석 리포트 템플릿", category: "분석", url: "#", color: "pink" },
  ];

  const events = [
    { date: "2024-12-28", title: "광고 캠페인 종료", type: "urgent" },
    { date: "2024-12-30", title: "월간 리포트 작성", type: "task" },
    { date: "2025-01-02", title: "신규 상품 출시", type: "important" },
  ];

  const getDayEvents = (day: Date) => {
    return events.filter(e => isSameDay(parseISO(e.date), day));
  };

  const colorMap: Record<string, string> = {
    blue: "bg-[var(--pastel-blue-bg)] text-[var(--pastel-blue-fg)] border-[var(--pastel-blue-bg)]",
    purple: "bg-[var(--pastel-purple-bg)] text-[var(--pastel-purple-fg)] border-[var(--pastel-purple-bg)]",
    green: "bg-[var(--pastel-green-bg)] text-[var(--pastel-green-fg)] border-[var(--pastel-green-bg)]",
    yellow: "bg-[var(--pastel-yellow-bg)] text-[var(--pastel-yellow-fg)] border-[var(--pastel-yellow-bg)]",
    pink: "bg-[var(--pastel-pink-bg)] text-[var(--pastel-pink-fg)] border-[var(--pastel-pink-bg)]",
  };

  return (
    <div className="space-y-4 p-4">
      {/* 미니 캘린더 */}
      <Card className="border-slate-100 shadow-sm rounded-2xl">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-black text-slate-700 uppercase tracking-wide flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[var(--pastel-blue-fg)]" />
              Calendar
            </h3>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setCurrentDate(addDays(currentDate, -30))}>
                <ChevronLeft className="w-3 h-3" />
              </Button>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setCurrentDate(addDays(currentDate, 30))}>
                <ChevronRight className="w-3 h-3" />
              </Button>
            </div>
          </div>

          <div className="text-center mb-3">
            <p className="text-sm font-black text-slate-900">{format(currentDate, "yyyy년 MM월", { locale: ko })}</p>
          </div>

          {/* 요일 헤더 */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['일', '월', '화', '수', '목', '금', '토'].map((day, i) => (
              <div key={i} className={cn("text-center text-[9px] font-bold", i === 0 ? "text-red-400" : i === 6 ? "text-blue-400" : "text-slate-400")}>
                {day}
              </div>
            ))}
          </div>

          {/* 날짜 그리드 */}
          <div className="grid grid-cols-7 gap-1">
            {daysInMonth().map((day, i) => {
              if (!day) {
                // 빈 칸
                return <div key={`empty-${i}`} className="aspect-square"></div>;
              }

              const dayEvents = getDayEvents(day);
              const isToday = isSameDay(day, new Date());
              const isSelected = isSameDay(day, selectedDate);

              return (
                <button
                  key={i}
                  onClick={() => setSelectedDate(day)}
                  className={cn(
                    "aspect-square rounded-lg text-[10px] font-bold relative transition-all hover:scale-105",
                    isToday && "bg-[var(--pastel-blue-fg)] text-white shadow-md",
                    !isToday && isSelected && "bg-[var(--pastel-blue-bg)] text-[var(--pastel-blue-fg)] border border-[var(--pastel-blue-fg)]",
                    !isToday && !isSelected && dayEvents.length > 0 && "bg-[var(--pastel-yellow-bg)] text-[var(--pastel-yellow-fg)]",
                    !isToday && !isSelected && dayEvents.length === 0 && "hover:bg-slate-50 text-slate-600"
                  )}
                >
                  {format(day, "d")}
                  {dayEvents.length > 0 && !isToday && (
                    <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-current"></div>
                  )}
                </button>
              );
            })}
          </div>

          {/* 선택된 날짜의 이벤트 */}
          {getDayEvents(selectedDate).length > 0 && (
            <div className="mt-3 pt-3 border-t border-slate-100 space-y-1.5">
              {getDayEvents(selectedDate).map((event, i) => (
                <div key={i} className="flex items-start gap-2 p-2 bg-slate-50 rounded-lg">
                  <div className={cn("w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0",
                    event.type === 'urgent' ? 'bg-red-500' :
                      event.type === 'important' ? 'bg-[var(--pastel-yellow-fg)]' :
                        'bg-[var(--pastel-blue-fg)]'
                  )}></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-bold text-slate-700 leading-tight">{event.title}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Links */}
      <Card className="border-slate-100 shadow-sm rounded-2xl">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-4 h-4 text-[var(--pastel-yellow-fg)]" />
            <h3 className="text-xs font-black text-slate-700 uppercase tracking-wide">Quick Links</h3>
          </div>

          <div className="grid grid-cols-1 gap-2">
            {loadingLinks ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => <div key={i} className="h-10 bg-slate-50 animate-pulse rounded-lg" />)}
              </div>
            ) : quickLinks.length > 0 ? (
              quickLinks.map((link, i) => {
                const IconComponent = ICON_MAP[link.icon] || ExternalLink;
                return (
                  <a
                    key={i}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors group"
                  >
                    <div className="flex items-center gap-2">
                      <IconComponent className="w-3.5 h-3.5 text-slate-400 group-hover:text-[var(--pastel-blue-fg)]" />
                      <span className="text-[11px] font-bold text-slate-700 group-hover:text-[var(--pastel-blue-fg)] transition-colors">
                        {link.title}
                      </span>
                    </div>
                    <ExternalLink className="w-3 h-3 text-slate-300 group-hover:text-[var(--pastel-blue-fg)] transition-colors" />
                  </a>
                );
              })
            ) : (
              <div className="text-center py-6 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <p className="text-[10px] text-slate-400 font-bold">설정에서 링크를 추가하세요</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Support & Resources */}
      <Card className="border-slate-100 shadow-sm rounded-2xl">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <BookOpen className="w-4 h-4 text-[var(--pastel-purple-fg)]" />
            <h3 className="text-xs font-black text-slate-700 uppercase tracking-wide">Support & Resources</h3>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-4">
            <Button
              variant="outline"
              className="h-auto py-3 px-3 flex flex-col items-center gap-1.5 rounded-xl border-slate-100 bg-slate-50/50 hover:bg-indigo-50 hover:border-indigo-100 hover:text-indigo-600 transition-all group"
              onClick={() => router.push('/updates')}
            >
              <History className="w-4 h-4 text-slate-400 group-hover:text-indigo-500 transition-colors" />
              <span className="text-[10px] font-black uppercase tracking-tight">업데이트 내역</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto py-3 px-3 flex flex-col items-center gap-1.5 rounded-xl border-slate-100 bg-slate-50/50 hover:bg-emerald-50 hover:border-emerald-100 hover:text-emerald-600 transition-all group"
              onClick={() => router.push('/manuals')}
            >
              <FileText className="w-4 h-4 text-slate-400 group-hover:text-emerald-500 transition-colors" />
              <span className="text-[10px] font-black uppercase tracking-tight">유틸리티 매뉴얼</span>
            </Button>
          </div>

          <div className="space-y-2">
            <div className="px-1 mb-2">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Manuals & SOP</p>
            </div>
            {resources.map((resource, i) => (
              <a
                key={i}
                href={resource.url}
                className="block p-2.5 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors group"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <Badge className={cn("text-[8px] font-black px-1.5 py-0 mb-1.5 border", colorMap[resource.color])}>
                      {resource.category}
                    </Badge>
                    <h4 className="text-[11px] font-bold text-slate-800 leading-tight line-clamp-2 group-hover:text-[var(--pastel-blue-fg)] transition-colors">
                      {resource.title}
                    </h4>
                  </div>
                  <ExternalLink className="w-3 h-3 text-slate-300 group-hover:text-[var(--pastel-blue-fg)] transition-colors flex-shrink-0 mt-0.5" />
                </div>
              </a>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 오늘의 팁 */}
      <div className="bg-gradient-to-br from-[var(--pastel-yellow-bg)] to-[var(--pastel-orange-bg)] p-4 rounded-2xl border border-[var(--pastel-yellow-bg)] shadow-sm">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl bg-white/60 flex items-center justify-center flex-shrink-0">
            <Lightbulb className="w-4 h-4 text-[var(--pastel-yellow-fg)]" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-xs font-black text-[var(--pastel-yellow-fg)] mb-1.5 uppercase tracking-wide">Today's Tip</h3>
            <p className="text-[11px] font-semibold text-[var(--pastel-yellow-fg)]/80 leading-relaxed">
              숏폼 콘텐츠는 첫 3초가 핵심입니다. 강렬한 비주얼과 질문으로 시작하세요!
            </p>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <Card className="border-slate-100 shadow-sm rounded-2xl">
        <CardContent className="p-4">
          <h3 className="text-xs font-black text-slate-700 uppercase tracking-wide mb-3">Quick Stats</h3>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target className="w-3.5 h-3.5 text-[var(--pastel-green-fg)]" />
                <span className="text-[11px] font-bold text-slate-600">월간 목표 달성률</span>
              </div>
              <span className="text-sm font-black text-[var(--pastel-green-fg)]">78%</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-3.5 h-3.5 text-[var(--pastel-blue-fg)]" />
                <span className="text-[11px] font-bold text-slate-600">이번 주 업로드</span>
              </div>
              <span className="text-sm font-black text-[var(--pastel-blue-fg)]">3건</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-[var(--pastel-purple-fg)]" />
                <span className="text-[11px] font-bold text-slate-600">OSMU 생성</span>
              </div>
              <span className="text-sm font-black text-[var(--pastel-purple-fg)]">8건</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-3.5 h-3.5 text-[var(--pastel-trend-up-fg)]" />
                <span className="text-[11px] font-bold text-slate-600">주간 성장률</span>
              </div>
              <span className="text-sm font-black text-[var(--pastel-trend-up-fg)]">+12.4%</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
