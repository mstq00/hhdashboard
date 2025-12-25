"use client";

import { useState, useEffect } from "react";
import { VideoForm } from "@/components/videos/video-form";
import { Button } from "@/components/ui/button";
import dynamic from "next/dynamic";
import { AnalysisGrid } from "@/components/dashboard/AnalysisGrid";
import { Save, VideoIcon, LogIn, LogOut } from "lucide-react";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { UserPlus, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";
import { VideoUploadDialog } from "@/components/videos/video-upload-dialog";
import { createUrlAnalysisPrompt } from '@/lib/prompts';
const BarChart = dynamic(() => import("@/components/chart/BarChart").then(mod => mod.BarChart), { ssr: false });

const GEMINI_API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY;

// KPI 4개 템플릿 (예상 구독자 증감에 TrendingUp 아이콘 지정)
const KPI_TEMPLATE = [
  { key: "views", label: "예상 총 조회수", icon: "Eye" },
  { key: "likes", label: "예상 좋아요", icon: "ThumbsUp" },
  { key: "comments", label: "예상 댓글 수", icon: "MessageCircle" },
  { key: "subs", label: "예상 구독자 증감", icon: "TrendingUp" },
];

// 12개 분석 카드 템플릿 (모든 항목 명시)
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
  title: "🏠 완전히 바뀐 우리집! 3시간 대청소의 놀라운 결과",
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
  summary: "이 영상은 극적인 정리 변화를 통해 높은 시각적 만족감을 제공하는 콘텐츠입니다. Before/After의 명확한 대비와 빠른 편집으로 시청자의 관심을 끌 수 있으며, 특히 20-40대 여성층에게 높은 반응을 얻을 것으로 예상됩니다. 정리 과정의 치유적 효과와 ASMR적 요소가 재시청을 유도할 것으로 보입니다.",
  titleSuggestions: [
    "🏠 지옥에서 천국으로! 3시간만에 완전히 바뀐 우리집",
    "😱 이게 같은 집이야? 정리의 마법을 보여드립니다",
    "✨ 정리 전후 충격적 변화! 당신도 할 수 있어요"
  ]
};

// Gemini 응답에서 JSON만 추출하는 함수 (코드블록 제거)
function extractJson(text: string): any {
  const match = text.match(/```json\s*([\s\S]+?)```/i) || text.match(/```([\s\S]+?)```/i);
  let jsonString = match ? match[1] : text;
  // 숫자 리터럴 내 언더스코어(185_000 등) 제거
  jsonString = jsonString.replace(/(\d+)_(\d+)/g, '$1$2');
  return JSON.parse(jsonString);
}

// 숫자를 K, M 단위로 포맷하는 함수
function formatNumber(n: any) {
  const num = typeof n === "string" ? Number(n.replace(/,/g, "")) : Number(n);
  if (isNaN(num)) return n;
  
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  } else if (num >= 1000) {
    return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
  }
  return num.toLocaleString();
}

// Gemini 응답을 대시보드 구조로 매핑 (고정 틀 적용)
function mapGeminiResult(raw: any) {
  // KPI 매핑: label 기준으로 템플릿에 맞게 정렬/매핑
  const kpis = KPI_TEMPLATE.map(t => {
    const found = (raw.kpis || []).find((k: any) => (k.label || k.name || "").replace(/\s/g, "").toLowerCase().includes(t.label.replace(/\s/g, "").toLowerCase()));
    
    if (found) {
      // min/max 값이 모두 있는 경우 (1/5 보정 적용)
      if (found.min !== undefined && found.max !== undefined) {
        let minVal = Number(found.min) || 0;
        let maxVal = Number(found.max) || 0;
        
        // 1/5 보정 적용
        minVal = Math.round(minVal / 5);
        maxVal = Math.round(maxVal / 5);
        
        return {
          label: t.label,
          value: `${formatNumber(minVal)}~${formatNumber(maxVal)}`,
          min: minVal,
          max: maxVal,
          icon: t.icon,
          analysis: found.analysis || "",
        };
      }
      // value 필드가 있는 경우 (1/5 보정 적용)
      else if (found.value !== undefined) {
        let value = found.value;
        let max = found.max;
        
        // 이미 "min~max" 형태의 문자열인 경우 그대로 사용
        if (typeof value === 'string' && value.includes('~')) {
          return {
            label: t.label,
            value: value,
            min: 0,
            max: 0,
            icon: t.icon,
            analysis: found.analysis || "",
          };
        }
        
        // 숫자인 경우 1/5 보정 적용
        if (!isNaN(Number(value))) value = Math.round(Number(value) / 5);
        if (!isNaN(Number(max))) max = Math.round(Number(max) / 5);
        return {
          label: t.label,
          value: max ? `${formatNumber(value)}~${formatNumber(max)}` : formatNumber(value),
          min: value,
          max: max,
          icon: t.icon,
          analysis: found.analysis || "",
        };
      }
    }
    
    // 찾지 못한 경우 기본값
    return {
      label: t.label,
      value: "-",
      min: 0,
      max: 0,
      icon: t.icon,
      analysis: "",
    };
  });
  
  // cards: CARD_TEMPLATE에 정의된 key/type/title 중 하나라도 일치하면 포함(단, 요청한 key/type/title에 해당하는 카드만 반환)
  let cards: any[] = [];
  if (Array.isArray(raw.cards)) {
    cards = raw.cards
      .filter((c: any) =>
        CARD_TEMPLATE.some((t: any) =>
          (c.key && c.key === t.key) ||
          (c.type && c.type === t.type) ||
          ((c.title || '').replace(/\s/g, '').toLowerCase().includes((t.title || '').replace(/\s/g, '').toLowerCase()))
        )
      )
      .filter((c: any) =>
        c && c.type && c.title &&
        CARD_TEMPLATE.some((t: any) =>
          c.key === t.key ||
          c.type === t.type ||
          ((c.title || '').replace(/\s/g, '').toLowerCase().includes((t.title || '').replace(/\s/g, '').toLowerCase()))
        )
      )
      .map((c: any) => {
        // 각 카드 타입별로 데이터 구조 정규화
        const normalizedCard = { ...c };
        
        // line/bar 차트: labels, data 배열 확인
        if (c.type === "line" || c.type === "bar") {
          normalizedCard.labels = Array.isArray(c.labels) ? c.labels : (c.xAxis || c.categories || []);
          normalizedCard.data = Array.isArray(c.data) ? c.data.map((x: any) => Number(x) || 0) : (c.values || c.yAxis || []).map((x: any) => Number(x) || 0);
        }
        
        // gauge: value 숫자 확인
        if (c.type === "gauge") {
          normalizedCard.value = Number(c.value) || Number(c.percentage) || Number(c.score) || 0;
          normalizedCard.dropoffRange = c.dropoffRange || c.range || c.timeRange || "";
          normalizedCard.reason = c.reason || c.description || c.cause || "";
        }
        
        // checklist/list: items 배열 확인
        if (c.type === "checklist" || c.type === "list") {
          normalizedCard.items = Array.isArray(c.items) ? c.items : (c.list || c.points || []);
        }
        
        // audience-bar: 성별/연령대 데이터 확인
        if (c.type === "audience-bar") {
          normalizedCard.genderLabels = Array.isArray(c.genderLabels) ? c.genderLabels : (c.gender?.labels || ["남성", "여성"]);
          normalizedCard.genderData = Array.isArray(c.genderData) ? c.genderData.map((x: any) => Number(x) || 0) : (c.gender?.data || []).map((x: any) => Number(x) || 0);
          normalizedCard.ageLabels = Array.isArray(c.ageLabels) ? c.ageLabels : (c.age?.labels || c.ageGroups || []);
          normalizedCard.ageData = Array.isArray(c.ageData) ? c.ageData.map((x: any) => Number(x) || 0) : (c.age?.data || c.ageValues || []).map((x: any) => Number(x) || 0);
        }
        
        // score: value, desc 확인
        if (c.type === "score") {
          normalizedCard.value = c.value || c.score || c.rating || "0";
          normalizedCard.desc = c.desc || c.description || c.comment || "";
        }
        
        // summary: summary 텍스트 확인
        if (c.type === "summary") {
          normalizedCard.summary = c.summary || c.text || c.description || c.analysis || "";
        }
        
        return normalizedCard;
      });
  }
  // 종합 분석(요약) 카드 추출
  let summary = raw.summary || raw.analysis || "";
  if (!summary && raw.cards) {
    const found = raw.cards.find((c: any) => c.type === "summary" || c.title?.includes("종합") || c.title?.includes("요약"));
    if (found) summary = found.description || found.text || found.summary || "";
  }
  
  // summary가 있고 cards에 summary 카드가 없으면 추가
  if (summary && !cards.find(c => c.type === "summary")) {
    cards.push({
      key: "summary",
      type: "summary", 
      title: "종합 분석",
      summary: summary
    });
  }
  
  // 추천 제목 3개 추출 (여러 케이스 커버)
  const titleSuggestions =
    raw.titleSuggestions ||
    raw.title_suggestions ||
    (raw.cards && raw.cards.find((c: any) => c.key === 'titleSuggestions')?.items) ||
    [];
  return { kpis, cards, summary, titleSuggestions };
}

// 유튜브 oEmbed로 제목/썸네일 추출
async function fetchYoutubeMeta(url: string): Promise<{ title: string; thumbnail: string }> {
  try {
    const videoIdMatch = url.match(/(?:v=|youtu\.be\/|shorts\/)([\w-]{11})/);
    const videoId = videoIdMatch ? videoIdMatch[1] : null;
    if (!videoId) return { title: "", thumbnail: "" };
    const res = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
    if (!res.ok) return { title: "", thumbnail: "" };
    const data = await res.json();
    return { title: data.title, thumbnail: data.thumbnail_url };
  } catch {
    return { title: "", thumbnail: "" };
  }
}

// 카드 매핑: key/type/title 기준으로 uniq 처리
function uniqCards(cards: any[]) {
  const seen = new Set();
  return cards.filter(c => {
    const key = `${c.key || ''}|${c.type || ''}|${c.title || ''}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export default function DashboardPage() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(dashboardData); // 항상 예시 데이터로 시작
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState<{ title: string; thumbnail: string }>({ 
    title: dashboardData.title, 
    thumbnail: dashboardData.thumbnail 
  });
  const [saving, setSaving] = useState(false);
  const [isExampleData, setIsExampleData] = useState(true);





  // 동영상 업로드 분석 완료 핸들러
  const handleVideoAnalysisComplete = (analysisResult: any, videoMeta: any) => {
    setResult(analysisResult);
    setMeta(videoMeta);
    setUrl(''); // 직접 업로드의 경우 URL 초기화
    setError(null);
    setIsExampleData(false); // 실제 분석 결과로 변경
  };

  // 분석 결과 저장 함수
  const saveAnalysisResult = async () => {
    if (!result || !meta.title) {
      alert('저장할 분석 결과가 없습니다.');
      return;
    }

    setSaving(true);
    try {
      // Supabase 세션 확인 및 새로고침
      console.log('세션 확인 시작...');
      let { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      console.log('세션 상태:', {
        hasSession: !!session,
        hasAccessToken: !!session?.access_token,
        sessionError: sessionError?.message
      });
      
      if (sessionError) {
        console.error('세션 오류:', sessionError);
        alert('인증 세션을 확인할 수 없습니다. 다시 로그인해주세요.');
        return;
      }

      if (!session?.access_token) {
        console.log('세션이 없음, 세션 새로고침 시도...');
        // 세션 새로고침 시도
        const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession();
        
        if (refreshError || !refreshedSession?.access_token) {
          console.error('세션 새로고침 실패:', refreshError);
          alert('로그인이 필요합니다. 다시 로그인해주세요.');
          return;
        }
        
        console.log('세션 새로고침 성공');
        session = refreshedSession;
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      };

      console.log('API 요청 시작...');
      const response = await fetch('/api/analysis', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          videoUrl: url || '직접 업로드',
          videoTitle: meta.title,
          videoThumbnail: meta.thumbnail,
          analysisData: result
        })
      });

      console.log('API 응답 상태:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('API 오류 응답:', errorData);
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      if (data.success) {
        alert('분석 결과가 저장되었습니다!');
      } else {
        alert('저장에 실패했습니다: ' + (data.error || '알 수 없는 오류'));
      }
    } catch (error) {
      console.error('저장 오류:', error);
      alert('저장 중 오류가 발생했습니다: ' + (error instanceof Error ? error.message : '알 수 없는 오류'));
    } finally {
      setSaving(false);
    }
  };

  async function handleAnalyze() {
    if (!url) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setMeta({ title: "", thumbnail: "" });
    const metaData = await fetchYoutubeMeta(url);
    setMeta(metaData);
    try {
      // 프롬프트를 중앙화된 함수로 생성
      const prompt = createUrlAnalysisPrompt(url, metaData.title, metaData.thumbnail);
      console.log('[Gemini] 분석 프롬프트 생성', prompt);
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro-preview-06-05:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { text: prompt },
                  { fileData: { fileUri: url } }
                ]
              }
            ]
          })
        }
      );
      console.log('[Gemini] API 응답 상태', res.status);
      if (!res.ok) throw new Error("Gemini API 호출 실패");
      const data = await res.json();
      console.log('[Gemini] API 응답 데이터', data);
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      let parsed;
      try {
        parsed = extractJson(text);
        console.log('[Gemini] 파싱 성공', parsed);
      } catch {
        console.log('[Gemini] 파싱 실패', text);
        throw new Error("Gemini 응답 파싱 실패");
      }
      setResult(mapGeminiResult(parsed));
      setIsExampleData(false); // 실제 분석 결과로 변경
    } catch (e: any) {
      setError(e.message);
      setResult(dashboardData);
      setIsExampleData(true); // 에러 시 예시 데이터 유지
      console.log('[Gemini] 에러', e);
    }
    setLoading(false);
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
      {/* 영상 분석 입력 */}
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-2 mb-6">
        <input
          type="url"
          placeholder="영상 URL을 입력하세요 (YouTube만 지원)"
          value={url}
          onChange={e => setUrl(e.target.value)}
          className="w-full border rounded px-4 py-3 sm:px-3 sm:py-2 h-12 sm:h-10 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
        />
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-2">
          <VideoUploadDialog onAnalysisComplete={handleVideoAnalysisComplete}>
            <Button 
              variant="outline" 
              className="w-full sm:w-auto whitespace-nowrap h-12 sm:h-10 text-base sm:text-sm px-4 sm:px-3"
            >
              <VideoIcon className="w-5 h-5 sm:w-4 sm:h-4 mr-2" />
              동영상 업로드
            </Button>
          </VideoUploadDialog>
          <Button 
            onClick={handleAnalyze} 
            disabled={!url || loading} 
            className="w-full sm:w-auto h-12 sm:h-10 text-base sm:text-sm px-6 sm:px-4 font-medium"
          >
            {loading ? "분석 중..." : "분석 요청"}
          </Button>
        </div>
      </div>

      {/* 분석 결과 상단에 제목/썸네일 표시 */}
      {loading ? (
        <Card className="flex flex-col gap-2 mb-6 p-4 items-start animate-pulse">
          <div className="flex flex-col sm:flex-row sm:items-start gap-4 sm:gap-6 w-full">
            <div className="w-full sm:w-40 h-48 sm:h-28 bg-muted rounded" />
            <div className="flex flex-col flex-1 min-w-0">
              <div className="h-6 w-2/3 bg-muted rounded mb-2" />
              <div className="h-4 w-1/2 bg-muted rounded mb-1" />
              <div className="h-3 w-3/4 bg-muted rounded mb-0.5" />
              <div className="h-3 w-2/4 bg-muted rounded mb-0.5" />
              <div className="h-3 w-1/3 bg-muted rounded" />
            </div>
          </div>
        </Card>
      ) : meta.title && (
        <Card className="flex flex-col gap-2 mb-6 p-4 items-start">
          <div className="flex flex-col sm:flex-row sm:items-start gap-4 sm:gap-6 w-full">
            {meta.thumbnail ? (
              <img 
                src={meta.thumbnail} 
                alt="썸네일" 
                className="w-full sm:w-40 h-48 sm:h-28 object-cover rounded" 
              />
            ) : (
              <div className="w-full sm:w-40 h-48 sm:h-28 bg-muted rounded flex items-center justify-center">
                <div className="text-muted-foreground text-sm">썸네일 없음</div>
              </div>
            )}
            <div className="flex flex-col flex-1 min-w-0 gap-3">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-1">
                <div className="font-semibold text-base sm:text-lg break-words leading-tight line-clamp-2 overflow-hidden">
                  {meta.title}
                </div>
                {isExampleData && (
                  <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full font-medium w-fit shrink-0">
                    예시
                  </span>
                )}
              </div>
              {result?.titleSuggestions && result.titleSuggestions.length > 0 && (
                <div className="mt-0.5">
                  <div className="text-xs font-semibold text-muted-foreground mb-1">[추천 제목]</div>
                  <div className="space-y-1 text-xs text-muted-foreground">
                    {result.titleSuggestions.map((t: string, i: number) => (
                      <div key={i} className="leading-relaxed">• {t}</div>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex flex-col sm:flex-row gap-2 mt-2 sm:mt-0">
                <Button
                  onClick={saveAnalysisResult}
                  disabled={saving || !result || !meta.title || isExampleData}
                  size="sm"
                  className="w-full sm:w-auto whitespace-nowrap"
                  title={isExampleData ? "예시 데이터는 저장할 수 없습니다" : ""}
                >
                  <Save className="w-4 h-4 mr-2" />
                  {saving ? "저장 중..." : "결과 저장"}
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}
      {/* KPI 4개 카드 스타일로 한 줄에 표시 */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="flex flex-col items-center justify-center p-4 gap-2 min-w-[120px] animate-pulse">
              <div className="w-8 h-8 bg-muted rounded-full mb-2" />
              <div className="h-6 w-16 bg-muted rounded mb-1" />
              <div className="h-3 w-12 bg-muted rounded" />
            </Card>
          ))}
        </div>
      ) : result && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {result.kpis.map((kpi: any, i: number) => (
            <KpiCard 
              key={i} 
              label={kpi.label} 
              value={kpi.value} 
              min={kpi.min}
              max={kpi.max}
              icon={kpi.icon} 
            />
          ))}
        </div>
      )}
      {/* 중복 없는 분석 카드 그리드 (모든 카드 포함) */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="h-48 animate-pulse bg-muted" />
          ))}
        </div>
      ) : (
        <AnalysisGrid kpis={[]} cards={uniqCards(result?.cards ?? [])} />
      )}
      
      {error && <div className="text-red-500 mt-4">{error}</div>}
    </div>
  );
} 