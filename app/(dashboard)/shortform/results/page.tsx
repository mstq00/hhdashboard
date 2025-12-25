"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  ExternalLink, 
  Trash2, 
  ChevronLeft, 
  ChevronRight, 
  Calendar, 
  Play,
  LogIn
} from "lucide-react";
import { AnalysisCard } from "@/components/dashboard/AnalysisCard";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { supabase } from "@/lib/supabase";
import { AnalysisGrid } from "@/components/dashboard/AnalysisGrid";

interface AnalysisResult {
  id: number;
  user_id: string;
  video_url: string;
  video_title: string;
  video_thumbnail: string;
  analysis_data: any;
  created_at: string;
  updated_at: string;
}

export default function AnalysisResultsPage() {
  const [results, setResults] = useState<AnalysisResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedResult, setSelectedResult] = useState<AnalysisResult | null>(null);

  useEffect(() => {
    fetchResults();
  }, []);



  const fetchResults = async () => {
    try {
      setLoading(true);

      // Supabase 세션 확인
      console.log('세션 확인 시작...');
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      console.log('세션 상태:', {
        hasSession: !!session,
        hasAccessToken: !!session?.access_token,
        sessionError: sessionError?.message
      });
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      // 세션이 있으면 Authorization 헤더 추가
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
        console.log('Authorization 헤더 추가됨, 토큰 길이:', session.access_token.length);
      } else {
        console.log('세션이 없어 Authorization 헤더를 추가하지 않음');
      }

      console.log('API 요청 시작...');
      const response = await fetch('/api/analysis', {
        headers,
      });

      console.log('API 응답 상태:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('API error:', errorData);
        return;
      }

      const data = await response.json();
      console.log('API 응답 성공, 데이터 개수:', data.data?.length || 0);
      setResults(data.data || []);
    } catch (error) {
      console.error('Error fetching analysis results:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteResult = async (id: number) => {
    if (!confirm('정말로 이 분석 결과를 삭제하시겠습니까?')) {
      return;
    }

    try {
      // Supabase 세션 확인
      const { data: { session } } = await supabase.auth.getSession();
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      // 세션이 있으면 Authorization 헤더 추가
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const response = await fetch(`/api/analysis?id=${id}`, {
        method: 'DELETE',
        headers,
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Delete error:', errorData);
        return;
      }

      setResults(prev => prev.filter(result => result.id !== id));
      
      if (selectedResult?.id === id) {
        setSelectedResult(null);
      }
    } catch (error) {
      console.error('Error deleting analysis result:', error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${year}.${month}.${day} ${hours}:${minutes}`;
  };

  const selectResult = (result: AnalysisResult) => {
    setSelectedResult(result);
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const goBack = () => {
    setSelectedResult(null);
  };

  const getCurrentIndex = () => {
    if (!selectedResult) return -1;
    return results.findIndex(r => r.id === selectedResult.id);
  };

  const navigateResult = (direction: 'prev' | 'next') => {
    const currentIndex = getCurrentIndex();
    if (currentIndex === -1) return;

    let newIndex;
    if (direction === 'prev') {
      newIndex = currentIndex > 0 ? currentIndex - 1 : results.length - 1;
    } else {
      newIndex = currentIndex < results.length - 1 ? currentIndex + 1 : 0;
    }

    setSelectedResult(results[newIndex]);
  };



  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">분석 결과를 불러오는 중...</p>
      </div>
    );
  }

  // 상세 보기가 선택된 경우
  if (selectedResult) {
    return (
      <div className="container mx-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
        {/* 헤더 - 모바일 최적화 */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={goBack} className="px-3 py-2">
            <ChevronLeft className="h-4 w-4 mr-1" />
            <span className="text-sm">목록</span>
          </Button>
        </div>

        {/* 영상 정보 */}
        <Card className="overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-start gap-4 sm:gap-6 p-4">
            <div className="relative w-full sm:w-40 h-48 sm:h-28">
              {selectedResult.video_thumbnail ? (
                <img 
                  src={selectedResult.video_thumbnail} 
                  alt="썸네일" 
                  className="w-full h-full object-cover rounded" 
                />
              ) : (
                <div className="w-full h-full bg-muted rounded flex items-center justify-center">
                  <div className="text-muted-foreground text-sm">썸네일 없음</div>
                </div>
              )}
              {/* 직접 업로드 배지 - 왼쪽 상단 */}
              {selectedResult.video_url === '직접 업로드' && (
                <Badge variant="secondary" className="absolute top-2 left-2 text-xs">
                  직접 업로드
                </Badge>
              )}
              {/* 저장 일시 - 하단 중앙 (PC에서 배지 겹침 방지) */}
              <div className="absolute bottom-2 left-2 right-2">
                <div className="bg-black/60 text-white text-xs px-2 py-1 rounded backdrop-blur-sm text-center">
                  {formatDate(selectedResult.created_at)}
                </div>
              </div>
            </div>
            <div className="flex flex-col flex-1 min-w-0 gap-3">
              <div className="flex flex-col gap-2">
                <h2 className="font-semibold text-base sm:text-lg leading-tight line-clamp-3 break-all">
                  {selectedResult.video_title || '제목 없음'}
                </h2>
              </div>
              {selectedResult.analysis_data?.titleSuggestions && selectedResult.analysis_data.titleSuggestions.length > 0 && (
                <div className="mt-2">
                  <div className="text-xs font-semibold text-muted-foreground mb-1">[추천 제목]</div>
                  <div className="space-y-1 text-xs text-muted-foreground">
                    {selectedResult.analysis_data.titleSuggestions.map((t: string, i: number) => (
                      <div key={i} className="leading-relaxed">• {t}</div>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex flex-col sm:flex-row gap-2 mt-2">
                {selectedResult.video_url !== '직접 업로드' && (
                  <Button 
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(selectedResult.video_url, '_blank')}
                    className="w-full sm:w-auto"
                  >
                    <Play className="h-4 w-4 mr-2" />
                    원본 보기
                  </Button>
                )}
                <Button 
                  variant="destructive"
                  size="sm"
                  onClick={() => deleteResult(selectedResult.id)}
                  className="w-full sm:w-auto"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  삭제
                </Button>
              </div>
            </div>
          </div>
        </Card>

        {/* 분석 결과 */}
        {selectedResult.analysis_data && (
          <>
            {/* KPI 4개 카드 스타일로 한 줄에 표시 */}
            {selectedResult.analysis_data.kpis && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
                {selectedResult.analysis_data.kpis.map((kpi: any, index: number) => (
                  <KpiCard 
                    key={index}
                    label={kpi.label || `KPI ${index + 1}`}
                    value={kpi.value || (kpi.min && kpi.max ? `${kpi.min}~${kpi.max}` : kpi.min || kpi.max || 0)}
                    min={kpi.min}
                    max={kpi.max}
                    icon={kpi.icon || "TrendingUp"}
                  />
                ))}
              </div>
            )}

            {/* 분석 카드 그리드 (대시보드와 동일한 레이아웃) */}
            {selectedResult.analysis_data.cards && selectedResult.analysis_data.cards.length > 0 ? (
              <AnalysisGrid kpis={[]} cards={selectedResult.analysis_data.cards} />
            ) : (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">상세 분석</h3>
                <p className="text-muted-foreground">분석 카드 데이터가 없습니다.</p>
                <pre className="text-xs bg-muted p-2 rounded overflow-auto">
                  {JSON.stringify(selectedResult.analysis_data, null, 2)}
                </pre>
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  // 목록 보기 (기본)
  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-4">
      {results.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Play className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">저장된 분석 결과가 없습니다</h3>
            <p className="text-muted-foreground text-center">
              영상을 분석하고 결과를 저장하면 여기에 표시됩니다.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {results.map((result) => (
            <Card 
              key={result.id} 
              className="cursor-pointer transition-all hover:shadow-md hover:scale-[1.02] overflow-hidden"
              onClick={() => selectResult(result)}
            >
              <CardContent className="p-0">
                {result.video_thumbnail && (
                  <div className="relative">
                    <img 
                      src={result.video_thumbnail} 
                      alt="썸네일"
                      className="w-full h-32 sm:h-48 object-cover"
                    />
                    {/* 직접 업로드 배지 - 왼쪽 상단 */}
                    {result.video_url === '직접 업로드' && (
                      <Badge variant="secondary" className="absolute top-1 left-1 text-xs">
                        직접 업로드
                      </Badge>
                    )}
                    {/* 버튼들 - 오른쪽 상단 */}
                    <div className="absolute top-1 right-1 flex gap-1">
                      {result.video_url !== '직접 업로드' && (
                        <Button
                          variant="secondary"
                          size="sm"
                          className="h-6 w-6 sm:h-8 sm:w-8 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(result.video_url, '_blank');
                          }}
                        >
                          <Play className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                        </Button>
                      )}
                      <Button
                        variant="destructive"
                        size="sm"
                        className="h-6 w-6 sm:h-8 sm:w-8 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteResult(result.id);
                        }}
                      >
                        <Trash2 className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                      </Button>
                    </div>
                  </div>
                )}
                <div className="p-3">
                  <h3 className="font-semibold text-xs sm:text-sm mb-2 line-clamp-2 leading-tight break-all">
                    {result.video_title || '제목 없음'}
                  </h3>
                  <div className="text-xs text-muted-foreground">
                    {formatDate(result.created_at)}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
} 