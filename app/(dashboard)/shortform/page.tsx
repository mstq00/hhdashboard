"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { VideoForm } from "@/components/videos/video-form";
import { Button } from "@/components/ui/button";
import dynamic from "next/dynamic";
import { AnalysisGrid } from "@/components/dashboard/AnalysisGrid";
import { Save, VideoIcon, ChevronLeft, Trash2, Play, Calendar, Clock, RefreshCcw } from "lucide-react";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";
import { VideoUploadDialog } from "@/components/videos/video-upload-dialog";
import { createUrlAnalysisPrompt } from '@/lib/prompts';
import { useRightPanel } from "@/lib/context/right-panel-context";
import { toast } from "sonner";

const BarChart = dynamic(() => import("@/components/chart/BarChart").then(mod => mod.BarChart), { ssr: false });

const GEMINI_API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY;

// KPI 4개 템플릿
const KPI_TEMPLATE = [
    { key: "views", label: "예상 총 조회수", icon: "Eye" },
    { key: "likes", label: "예상 좋아요", icon: "ThumbsUp" },
    { key: "comments", label: "예상 댓글 수", icon: "MessageCircle" },
    { key: "subs", label: "예상 구독자 증감", icon: "TrendingUp" },
];

// 분석 카드 템플릿
const CARD_TEMPLATE = [
    { key: "appeal", type: "checklist", title: "소구 포인트 및 바이럴 요소" },
    { key: "watch_time", type: "line", title: "예상 시청시간 & 유지율" },
    { key: "dropoff", type: "gauge", title: "예상 이탈율 및 주요 이탈 구간" },
    { key: "improve", type: "list", title: "개선점 제안" },
    { key: "audience", type: "audience-bar", title: "예상 시청자 구성" },
    { key: "emotion", type: "line", title: "감정 곡선" },
    { key: "hook", type: "score", title: "훅(Hook) 효과성 (첫 5초)" },
    { key: "competitor", type: "list", title: "경쟁 콘텐츠 차별점" },
    { key: "replay", type: "gauge", title: "재시청 가능성" },
    { key: "feedback", type: "feedback-list", title: "영상 상세 피드백" },
    { key: "summary", type: "summary", title: "종합 분석" },
];

const dashboardData = {
    title: "✨ 3시간의 기적! 엉망진창 자취방이 호텔식 룸으로?! (실제 대청소)",
    thumbnail: "https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg",
    kpis: [
        { label: "예상 총 조회수", min: 450000, max: 1250000, icon: "Eye" },
        { label: "예상 좋아요", min: 12000, max: 35000, icon: "ThumbsUp" },
        { label: "예상 댓글 수", min: 750, max: 2000, icon: "MessageCircle" },
        { label: "예상 구독자 증감", min: 400, max: 1500, icon: "TrendingUp" }
    ],
    cards: [
        {
            key: "appeal",
            type: "checklist",
            title: "소구 포인트 및 바이럴 요소",
            items: [
                { text: "소구: 드라스틱한 Before/After 대비로 높은 공감대 형성", checked: true },
                { text: "소구: 정리 전후의 명확한 시각적 대비로 인한 만족감 제공", checked: true },
                { text: "소구: 빠른 속도와 정리된 동선으로 실용적인 정보 제공", checked: true },
                { text: "바이럴: 빠른 편집과 리드미컬한 배경음악으로 쇼츠 플랫폼에 최적화", checked: false }
            ]
        },
        {
            key: "watch_time",
            type: "line",
            title: "예상 시청시간 & 유지율",
            labels: ["0s", "3s", "6s", "9s", "12s", "15s", "18s", "21s", "24s"],
            data: [100, 95, 92, 88, 84, 78, 72, 68, 64],
            highlight: { label: "평균 시청시간", value: "23.6초 (84%)" }
        },
        {
            key: "dropoff",
            type: "gauge",
            title: "예상 이탈율 및 주요 이탈 구간",
            value: 16,
            dropoffRange: "18-21초",
            reason: "주요 정리 과정이 완료된 후 시청자들이 만족감을 느끼고 이탈"
        },
        {
            key: "improve",
            type: "list",
            title: "개선점 제안",
            items: [
                "영상 중반 구간(18-21초)에 추가적인 정리 팁이나 놀라운 변화 요소를 배치하여 시청 유지",
                "BGM 변화를 통한 구간별 리듬감 조절로 지루함 방지",
                "영상 마지막에 '추가 정리 노하우' 예고로 재시청 유도",
                "자막의 순간적인 강조(예: 강조색 변화)로 시각적 흥미 유지"
            ]
        },
        {
            key: "audience",
            type: "audience-bar",
            title: "예상 시청자 구성",
            genderLabels: ["여성", "남성", "사용자 지정"],
            genderData: [94.2, 5.8, 0],
            ageLabels: ["만 13-17세", "만 18-24세", "만 25-34세", "만 35-44세", "만 45-54세", "만 55-64세", "만 65세 이상"],
            ageData: [0, 0.3, 13.9, 24.2, 42.2, 18.5, 0.9]
        },
        {
            key: "emotion",
            type: "line",
            title: "감정 곡선",
            labels: ["0-5초", "5-10초", "10-15초", "15-20초", "20-25초", "25-30초"],
            data: [85, 70, 90, 95, 80, 75]
        },
        {
            key: "hook",
            type: "score",
            title: "훅(Hook) 효과성 (첫 5초)",
            value: "78/100",
            desc: "지저분한 방의 충격적 모습으로 관심을 끌지만, 더 극적인 연출과 감정적 몰입 요소가 부족함"
        },
        {
            key: "competitor",
            type: "list",
            title: "경쟁 콘텐츠 차별점",
            items: [
                "일반적인 정리 영상과 달리 극적인 변화에 집중",
                "빠른 편집과 리듬감 있는 구성으로 지루함 방지",
                "실용적인 정리 팁보다는 시각적 만족감에 중점"
            ]
        },
        {
            key: "replay",
            type: "gauge",
            title: "재시청 가능성",
            value: 72,
            reason: "정리 과정의 치유적 효과와 시각적 만족감이 일부 재시청을 유도하지만, 새로운 발견 요소는 제한적"
        },
        {
            key: "feedback",
            type: "feedback-list",
            title: "영상 상세 피드백",
            items: [
                {
                    time: "00:24",
                    scene: "지저분한 방을 보여주는 인트로 장면",
                    caption: "또 이렇게 됐네요... 😅",
                    improvedScene: "극적인 대비를 위해 더 지저분한 각도에서 촬영, 클로즈업 추가",
                    improvedCaption: "이 정도면 재해 수준이죠? 😱 과연 이 방이 변할 수 있을까요?"
                },
                {
                    time: "01:15",
                    scene: "청소하는 과정을 보여주는 장면",
                    caption: "열심히 치우는 중입니다",
                    improvedScene: "타임랩스 효과와 함께 Before/After 분할 화면 구성",
                    improvedCaption: "🔥 변신 시작! 30분 만에 일어날 기적을 보세요!"
                },
                {
                    time: "02:30",
                    scene: "깨끗해진 방을 보여주는 마무리 장면",
                    caption: "완성! 어떤가요?",
                    improvedScene: "같은 앵글에서 촬영하여 극적 대비 효과 극대화, 조명 개선",
                    improvedCaption: "✨ 완전 다른 공간이 됐어요! 구독자님들도 이런 변화 원하시죠?"
                }
            ]
        },
        {
            key: "summary",
            type: "summary",
            title: "종합 분석",
            summary: "**핵심 강점 분석**: 이 영상은 극적인 Before/After 대비를 통해 높은 시각적 만족감을 제공하는 정리 콘텐츠입니다. 3시간의 변화 과정을 압축한 편집과 명확한 결과물이 주요 강점이며, 정리에 대한 동기부여와 대리만족을 동시에 제공합니다. **타겟 오디언스 분석**: 주요 타겟은 25-45세 여성층으로, 정리와 라이프스타일에 관심이 높은 시청자들이 핵심 오디언스입니다. 이들은 실용적 팁보다는 시각적 변화와 성취감에 더 큰 반응을 보이며, 자신의 공간 정리에 대한 영감을 얻고자 합니다. **성과 예측 및 근거**: 예상 조회수 40,000-125,000회로 양호한 성과가 예상되며, 정리 콘텐츠의 꾸준한 수요와 명확한 변화 결과가 주요 근거입니다. 특히 쇼츠 플랫폼에서의 확산 가능성이 높아 바이럴 잠재력을 보유하고 있습니다. **주요 개선점**: 첫 5초 훅 강화를 위한 더 충격적인 연출, 중간 구간(18-21초) 이탈 방지를 위한 추가 서프라이즈 요소, 그리고 재시청 유도를 위한 ASMR적 요소나 숨겨진 정리 팁 추가가 필요합니다. **시장 포지셔닝**: 일반적인 정리 콘텐츠 중 상위권에 위치하며, 빠른 편집과 극적 변화로 차별화를 이루고 있으나, 독창적 요소 추가로 더 높은 경쟁력 확보가 가능합니다."
        }
    ],
    titleSuggestions: [
        "🏠 지옥에서 천국으로! 3시간만에 완전히 바뀐 우리집",
        "😱 이게 같은 집이야? 정리의 마법을 보여드립니다",
        "✨ 정리 전후 충격적 변화! 당신도 할 수 있어요",
        "🧹 청소가 이렇게 힐링될 일? 3시간 대장정",
        "🛌 12평 원룸의 대변신! 3시간 청소 브이로그"
    ]
};

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

// Gemini 응답에서 JSON만 추출하는 함수
function extractJson(text: string): any {
    const match = text.match(/```json\s*([\s\S]+?)```/i) || text.match(/```([\s\S]+?)```/i);
    let jsonString = match ? match[1] : text;
    jsonString = jsonString.replace(/(\d+)_(\d+)/g, '$1$2');
    return JSON.parse(jsonString);
}

// 숫자를 K, M 단위로 포맷하는 함수
function formatNumber(n: any) {
    const num = typeof n === "string" ? Number(n.replace(/,/g, "")) : Number(n);
    if (isNaN(num)) return n;
    if (num >= 1000000) return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
    return num.toLocaleString();
}

// Gemini 응답 매핑
function mapGeminiResult(raw: any) {
    const kpis = KPI_TEMPLATE.map(t => {
        const found = (raw.kpis || []).find((k: any) => (k.label || k.name || "").replace(/\s/g, "").toLowerCase().includes(t.label.replace(/\s/g, "").toLowerCase()));
        if (found) {
            if (found.min !== undefined && found.max !== undefined) {
                let minVal = Math.round(Number(found.min) / 5);
                let maxVal = Math.round(Number(found.max) / 5);
                return { label: t.label, value: `${formatNumber(minVal)}~${formatNumber(maxVal)}`, min: minVal, max: maxVal, icon: t.icon, analysis: found.analysis || "" };
            } else if (found.value !== undefined) {
                let value = found.value;
                let max = found.max;
                if (!isNaN(Number(value))) value = Math.round(Number(value) / 5);
                if (!isNaN(Number(max))) max = Math.round(Number(max) / 5);
                return { label: t.label, value: max ? `${formatNumber(value)}~${formatNumber(max)}` : formatNumber(value), min: value, max: max, icon: t.icon, analysis: found.analysis || "" };
            }
        }
        return { label: t.label, value: "-", min: 0, max: 0, icon: t.icon, analysis: "" };
    });

    let cards: any[] = [];
    if (Array.isArray(raw.cards)) {
        cards = raw.cards
            .filter((c: any) => CARD_TEMPLATE.some((t: any) => (c.key && c.key === t.key) || (c.type && c.type === t.type) || ((c.title || '').replace(/\s/g, '').toLowerCase().includes((t.title || '').replace(/\s/g, '').toLowerCase()))))
            .map((c: any) => {
                const normalizedCard = { ...c };
                if (c.type === "line" || c.type === "bar") {
                    normalizedCard.labels = Array.isArray(c.labels) ? c.labels : (c.xAxis || c.categories || []);
                    normalizedCard.data = Array.isArray(c.data) ? c.data.map((x: any) => Number(x) || 0) : (c.values || c.yAxis || []).map((x: any) => Number(x) || 0);
                }
                if (c.type === "gauge") {
                    normalizedCard.value = Number(c.value) || Number(c.percentage) || Number(c.score) || 0;
                    normalizedCard.dropoffRange = c.dropoffRange || c.range || c.timeRange || "";
                    normalizedCard.reason = c.reason || c.description || c.cause || "";
                }
                if (c.type === "checklist" || c.type === "list") normalizedCard.items = Array.isArray(c.items) ? c.items : (c.list || c.points || []);
                if (c.type === "audience-bar") {
                    normalizedCard.genderLabels = Array.isArray(c.genderLabels) ? c.genderLabels : (c.gender?.labels || ["남성", "여성"]);
                    normalizedCard.genderData = Array.isArray(c.genderData) ? c.genderData.map((x: any) => Number(x) || 0) : (c.gender?.data || []).map((x: any) => Number(x) || 0);
                    normalizedCard.ageLabels = Array.isArray(c.ageLabels) ? c.ageLabels : (c.age?.labels || c.ageGroups || []);
                    normalizedCard.ageData = Array.isArray(c.ageData) ? c.ageData.map((x: any) => Number(x) || 0) : (c.age?.data || c.ageValues || []).map((x: any) => Number(x) || 0);
                }
                if (c.type === "score") {
                    normalizedCard.value = c.value || c.score || c.rating || "0";
                    normalizedCard.desc = c.desc || c.description || c.comment || "";
                }
                if (c.type === "summary") normalizedCard.summary = c.summary || c.text || c.description || c.analysis || "";
                return normalizedCard;
            });
    }
    let summary = raw.summary || raw.analysis || "";
    if (!summary && raw.cards) {
        const found = raw.cards.find((c: any) => c.type === "summary" || c.title?.includes("종합") || c.title?.includes("요약"));
        if (found) summary = found.description || found.text || found.summary || "";
    }
    if (summary && !cards.find(c => c.type === "summary")) cards.push({ key: "summary", type: "summary", title: "종합 분석", summary });
    const titleSuggestions = raw.titleSuggestions || raw.title_suggestions || (raw.cards && raw.cards.find((c: any) => c.key === 'titleSuggestions')?.items) || [];
    return { kpis, cards, summary, titleSuggestions };
}

// 유튜브 메타 정보
async function fetchYoutubeMeta(url: string): Promise<{ title: string; thumbnail: string }> {
    try {
        const videoIdMatch = url.match(/(?:v=|youtu\.be\/|shorts\/)([\w-]{11})/);
        const videoId = videoIdMatch ? videoIdMatch[1] : null;
        if (!videoId) return { title: "", thumbnail: "" };
        const res = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
        if (!res.ok) return { title: "", thumbnail: "" };
        const data = await res.json();
        return { title: data.title, thumbnail: data.thumbnail_url };
    } catch { return { title: "", thumbnail: "" }; }
}

function uniqCards(cards: any[]) {
    const seen = new Set();
    return cards.filter(c => {
        const key = `${c.key || ''}|${c.type || ''}|${c.title || ''}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
};

export default function ShortformPage() {
    const [viewMode, setViewMode] = useState<'analyze' | 'detail'>('detail');
    const [url, setUrl] = useState("");
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(dashboardData);
    const [error, setError] = useState<string | null>(null);
    const [meta, setMeta] = useState<{ title: string; thumbnail: string }>({ title: dashboardData.title, thumbnail: dashboardData.thumbnail });
    const [saving, setSaving] = useState(false);
    const [isExampleData, setIsExampleData] = useState(true);

    // 결과 리스트 관련 상태
    const [results, setResults] = useState<AnalysisResult[]>([]);
    const [isLoadingList, setIsLoadingList] = useState(true);

    const { setContent } = useRightPanel();

    const fetchResults = useCallback(async () => {
        try {
            setIsLoadingList(true);
            const { data: { session } } = await supabase.auth.getSession();
            const headers: Record<string, string> = { 'Content-Type': 'application/json' };
            if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`;
            const response = await fetch('/api/analysis', { headers });
            if (!response.ok) return;
            const data = await response.json();
            setResults(data.data || []);
        } catch (error) {
            console.error('Error fetching analysis results:', error);
        } finally {
            setIsLoadingList(false);
        }
    }, []);

    useEffect(() => {
        fetchResults();
    }, [fetchResults]);

    const deleteResult = useCallback(async (id: number) => {
        if (!confirm('정말로 이 분석 결과를 삭제하시겠습니까?')) return;
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const headers: Record<string, string> = { 'Content-Type': 'application/json' };
            if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`;
            const response = await fetch(`/api/analysis?id=${id}`, { method: 'DELETE', headers });
            if (response.ok) {
                setResults(prev => prev.filter(r => r.id !== id));
                toast.success("분석 결과가 삭제되었습니다.");
                if (viewMode === 'detail' && result?.id === id) handleNewAnalysis();
            }
        } catch (error) {
            console.error('Error deleting analysis result:', error);
        }
    }, [viewMode, result]);

    const handleNewAnalysis = useCallback(() => {
        setResult(dashboardData);
        setMeta({ title: dashboardData.title, thumbnail: dashboardData.thumbnail });
        setIsExampleData(true);
        setUrl("");
        setViewMode('detail');
    }, []);

    const selectResult = useCallback((res: AnalysisResult) => {
        setMeta({ title: res.video_title, thumbnail: res.video_thumbnail });
        setResult({ ...res.analysis_data, id: res.id });
        setIsExampleData(false);
        setViewMode('detail');
        setUrl(res.video_url === '직접 업로드' ? '' : res.video_url);
        if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
    }, []);

    const saveAnalysisResult = useCallback(async () => {
        if (!result || !meta.title) return;
        setSaving(true);
        try {
            let { data: { session } } = await supabase.auth.getSession();
            if (!session?.access_token) {
                const { data: { session: refreshedSession } } = await supabase.auth.refreshSession();
                if (!refreshedSession) throw new Error("로그인이 필요합니다.");
                session = refreshedSession;
            }
            const response = await fetch('/api/analysis', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
                body: JSON.stringify({ videoUrl: url || '직접 업로드', videoTitle: meta.title, videoThumbnail: meta.thumbnail, analysisData: result })
            });
            const data = await response.json();
            if (data.success) {
                toast.success("분석 결과가 저장되었습니다!");
                fetchResults();
            } else throw new Error(data.error);
        } catch (error: any) {
            toast.error(error.message || "저장 중 오류가 발생했습니다.");
        } finally { setSaving(false); }
    }, [result, meta, url, fetchResults]);

    const handleAnalyze = useCallback(async () => {
        if (!url) return;
        setLoading(true);
        setError(null);
        const metaData = await fetchYoutubeMeta(url);
        setMeta(metaData);
        try {
            const prompt = createUrlAnalysisPrompt(url, metaData.title, metaData.thumbnail);
            const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro-preview-06-05:generateContent?key=${GEMINI_API_KEY}`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ contents: [{ parts: [{ text: prompt }, { fileData: { fileUri: url } }] }] })
            });
            if (!res.ok) throw new Error("Gemini API 호출 실패");
            const data = await res.json();
            const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
            const parsed = extractJson(text);
            setResult(mapGeminiResult(parsed));
            setIsExampleData(false);
            setViewMode('detail');
        } catch (e: any) {
            setError(e.message);
            setResult(dashboardData);
            setIsExampleData(true);
        } finally { setLoading(false); }
    }, [url]);

    const handleVideoAnalysisComplete = useCallback((analysisResult: any, videoMeta: any) => {
        setResult(analysisResult);
        setMeta(videoMeta);
        setUrl('');
        setError(null);
        setIsExampleData(false);
        setViewMode('detail');
    }, []);

    const rightPanelContent = useMemo(() => (
        <div className="space-y-6 flex flex-col h-full">
            <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                    <div className="w-1.5 h-5 bg-primary rounded-full"></div>
                    <h3 className="text-lg font-bold">과거 분석 내역</h3>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={fetchResults}>
                    <RefreshCcw className={`h-4 w-4 ${isLoadingList ? 'animate-spin' : ''}`} />
                </Button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 -mx-1 px-1 custom-scrollbar">
                {isLoadingList ? (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-300">
                        <Clock className="w-10 h-10 mb-2 animate-spin opacity-20" />
                        <p className="text-xs font-bold">내역 불러오는 중...</p>
                    </div>
                ) : results.length === 0 ? (
                    <div className="bg-slate-50 rounded-2xl p-10 border border-dashed border-slate-200 text-center">
                        <p className="text-xs text-slate-400 font-bold">분석 내역이 없습니다.</p>
                    </div>
                ) : (
                    results.map((res) => (
                        <div
                            key={res.id}
                            onClick={() => selectResult(res)}
                            className={`group relative bg-white rounded-2xl p-4 border-none shadow-sm transition-all hover:shadow-md hover:scale-[1.02] cursor-pointer ${result?.id === res.id ? 'ring-2 ring-primary bg-primary/5' : ''}`}
                        >
                            <div className="flex gap-4">
                                <div className="relative w-16 h-16 shrink-0 rounded-xl overflow-hidden shadow-inner bg-slate-100">
                                    <img src={res.video_thumbnail} className="w-full h-full object-cover" />
                                    {res.video_url === '직접 업로드' && <Badge className="absolute -top-1 -left-1 px-1 h-3.5 text-[8px] bg-primary border-none text-white italic">Upload</Badge>}
                                </div>
                                <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                                    <p className="text-[12px] font-black text-slate-800 truncate line-clamp-2 leading-tight tracking-tight">{res.video_title}</p>
                                    <div className="flex items-center justify-between mt-1">
                                        <span className="text-[10px] text-slate-400 font-bold flex items-center gap-1.5 opacity-60">
                                            <Calendar className="w-3 h-3" />
                                            {formatDate(res.created_at).split(' ')[0]}
                                        </span>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 rounded-xl hover:bg-red-50 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                                            onClick={(e) => { e.stopPropagation(); deleteResult(res.id); }}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    ), [isLoadingList, results, selectResult, deleteResult, fetchResults, result]);

    useEffect(() => {
        setContent(rightPanelContent);
    }, [setContent, rightPanelContent]);

    useEffect(() => {
        return () => setContent(null);
    }, [setContent]);

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            {/* 분석 입력 영역 */}
            <div className="bg-white rounded-[2rem] shadow-sm shadow-black/5 border-none p-8">
                <div className="flex flex-col md:flex-row gap-6">
                    <div className="flex-1 relative">
                        <input
                            type="url"
                            placeholder="영상 URL을 입력하세요 (YouTube)"
                            value={url}
                            onChange={e => setUrl(e.target.value)}
                            className="w-full h-14 pl-6 pr-6 bg-slate-50 border-none rounded-[1.25rem] text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 bg-slate-100/50 transition-all font-sans"
                        />
                    </div>
                    <div className="flex gap-3">
                        <VideoUploadDialog onAnalysisComplete={handleVideoAnalysisComplete}>
                            <Button variant="outline" className="h-14 px-7 rounded-[1.25rem] border-slate-100 font-black text-slate-500 hover:bg-slate-50 transition-all">
                                <VideoIcon className="w-5 h-5 mr-2 opacity-70" />
                                업로드
                            </Button>
                        </VideoUploadDialog>
                        <Button onClick={handleAnalyze} disabled={!url || loading} className="h-14 px-10 rounded-[1.25rem] font-black shadow-xl shadow-primary/20 transition-all active:scale-95">
                            {loading ? <RefreshCcw className="w-5 h-5 animate-spin mr-2" /> : null}
                            {loading ? "분석 중" : "분석 시작"}
                        </Button>
                        {viewMode === 'detail' && !isExampleData && (
                            <Button variant="ghost" className="h-14 px-6 rounded-[1.25rem] font-black text-primary hover:bg-primary/5 transition-all" onClick={handleNewAnalysis}>
                                <ChevronLeft className="w-5 h-5 mr-1" />
                                새 분석
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            {/* 결과 상세 영역 */}
            {viewMode === 'detail' && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
                    <Card className="overflow-hidden border-none shadow-sm shadow-black/5 rounded-[2rem] group bg-white">
                        <div className="flex flex-col sm:flex-row gap-8 p-8">
                            <div className="relative w-full sm:w-64 aspect-video shrink-0 bg-slate-50 rounded-[1.5rem] overflow-hidden shadow-inner">
                                <img src={meta.thumbnail} alt="썸네일" className="w-full h-full object-cover transition-transform group-hover:scale-110 duration-1000" />
                                {isExampleData && <Badge className="absolute top-4 left-4 bg-primary/90 backdrop-blur-md border-none shadow-lg px-4 py-1.5 text-[10px] font-black uppercase tracking-widest italic rounded-full text-white">EXAMPLE</Badge>}
                                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-6 opacity-0 group-hover:opacity-100 transition-all duration-500 transform translate-y-2 group-hover:translate-y-0">
                                    <p className="text-white text-xs font-black flex items-center gap-2">
                                        <Play className="w-4 h-4 fill-current" /> 원본 영상 확인
                                    </p>
                                </div>
                            </div>
                            <div className="flex-1 flex flex-col justify-between min-w-0 py-2">
                                <div className="space-y-4">
                                    <h2 className="text-2xl sm:text-3xl font-black text-slate-900 leading-[1.1] tracking-tighter line-clamp-2">{meta.title}</h2>
                                    {result?.titleSuggestions?.length > 0 && (
                                        <div className="flex flex-wrap gap-2.5 pt-1">
                                            {result.titleSuggestions.map((t: string, i: number) => (
                                                <Badge key={i} variant="secondary" className="bg-[#FAF2E1] text-[#4A3E1F] border-none hover:scale-105 transition-all cursor-default text-[11px] py-1.5 px-4 rounded-full font-black tracking-tight"># {t}</Badge>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                {!isExampleData && !result?.id && (
                                    <div className="mt-8 pt-8 border-t border-slate-50 flex justify-end">
                                        <Button onClick={saveAnalysisResult} disabled={saving} className="h-12 px-10 rounded-[1.25rem] font-black shadow-xl shadow-primary/20 transition-all active:scale-95">
                                            <Save className="w-4 h-4 mr-2" />
                                            {saving ? "저장 중..." : "분석 결과 저장하기"}
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </Card>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        {result.kpis.map((kpi: any, i: number) => (
                            <KpiCard key={i} label={kpi.label} value={kpi.value} min={kpi.min} max={kpi.max} icon={kpi.icon} />
                        ))}
                    </div>

                    <AnalysisGrid kpis={[]} cards={uniqCards(result?.cards ?? [])} />
                </div>
            )}

            {/* 분석 중 로딩 상태 */}
            {loading && (
                <div className="space-y-6">
                    <Card className="h-48 animate-pulse bg-slate-50/50 rounded-3xl" />
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        {[...Array(4)].map((_, i) => <Card key={i} className="h-28 animate-pulse bg-slate-50/50 rounded-3xl" />)}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[...Array(6)].map((_, i) => <Card key={i} className="h-64 animate-pulse bg-slate-50/50 rounded-3xl" />)}
                    </div>
                </div>
            )}

            {/* 에러 메시지 */}
            {error && (
                <div className="p-6 bg-red-50 border border-red-100 rounded-3xl text-red-600 font-bold text-center">
                    {error}
                </div>
            )}
        </div>
    );
}
