import { Card } from "@/components/ui/card";
import { Eye, MessageCircle, ThumbsUp, Share2, TrendingUp, Activity } from "lucide-react";
import { ReactNode } from "react";

const iconMap: Record<string, ReactNode> = {
  Eye: <Eye className="w-6 h-6" />,
  MessageCircle: <MessageCircle className="w-6 h-6" />,
  ThumbsUp: <ThumbsUp className="w-6 h-6" />,
  Share2: <Share2 className="w-6 h-6" />,
  TrendingUp: <TrendingUp className="w-6 h-6" />,
  "조회수": <Eye className="w-6 h-6" />,
  "평균 시청 지속 시간": <MessageCircle className="w-6 h-6" />,
  "평균 시청 비율": <ThumbsUp className="w-6 h-6" />,
  "이탈 급증 지점": <Share2 className="w-6 h-6" />,
  "바이럴 포인트": <TrendingUp className="w-6 h-6" />,
};

const colorMap: Record<string, { bg: string; fg: string }> = {
  "조회수": { bg: "bg-[var(--pastel-green-bg)]", fg: "text-[var(--pastel-green-fg)]" },
  "평균 시청 지속 시간": { bg: "bg-[var(--pastel-yellow-bg)]", fg: "text-[var(--pastel-yellow-fg)]" },
  "평균 시청 비율": { bg: "bg-[var(--pastel-purple-bg)]", fg: "text-[var(--pastel-purple-fg)]" },
  "이탈 급증 지점": { bg: "bg-[var(--pastel-blue-bg)]", fg: "text-[var(--pastel-blue-fg)]" },
  "바이럴 포인트": { bg: "bg-[var(--pastel-pink-bg)]", fg: "text-[var(--pastel-pink-fg)]" },
};

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

interface KpiCardProps {
  label: string;
  value?: number;
  min?: number;
  max?: number;
  icon?: string;
  trend?: number;
}

export function KpiCard({ label, value, min, max, icon, trend }: KpiCardProps) {
  const displayValue = () => {
    if (min !== undefined && max !== undefined) {
      return `${formatNumber(min)} ~ ${formatNumber(max)}`;
    }
    return formatNumber(value) || '0';
  };

  const formatValue = (val: number | undefined, lbl: string) => {
    return displayValue();
  };

  const colorStyle = colorMap[label] || { bg: "bg-white", fg: "text-slate-600" };
  const IconComponent = iconMap[label] || <Activity className="w-6 h-6" />;

  return (
    <Card className={`${colorStyle.bg} p-6 min-w-[140px] rounded-[2rem] border-none shadow-sm transition-all hover:scale-105 group`}>
      <div className="flex flex-col items-center gap-2">
        <div className={`p-3 rounded-2xl bg-white/40 backdrop-blur-sm mb-1 ${colorStyle.fg}`}>
          {IconComponent}
        </div>
        <div className="flex flex-col items-center">
          <span className={`text-[11px] font-black uppercase tracking-widest opacity-80 ${colorStyle.fg}`}>
            {label}
          </span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className={`text-3xl font-black leading-tight tracking-tight ${colorStyle.fg}`}>
              {formatValue(value, label)}
            </span>
          </div>
          {trend !== undefined && (
            <div className={`mt-2 flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/50 backdrop-blur-sm text-[10px] font-black ${trend >= 0 ? 'text-[var(--pastel-trend-up-fg)]' : 'text-[var(--pastel-trend-down-fg)]'}`}>
              <TrendingUp className={`w-3 h-3 ${trend < 0 ? 'rotate-180' : ''}`} />
              {trend >= 0 ? '+' : ''}{trend}%
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}