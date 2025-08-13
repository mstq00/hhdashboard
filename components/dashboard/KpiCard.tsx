import { Card } from "@/components/ui/card";
import { Eye, MessageCircle, ThumbsUp, Share2, TrendingUp } from "lucide-react";
import { ReactNode } from "react";

const iconMap: Record<string, ReactNode> = {
  Eye: <Eye className="w-6 h-6 text-primary" />,
  MessageCircle: <MessageCircle className="w-6 h-6 text-primary" />,
  ThumbsUp: <ThumbsUp className="w-6 h-6 text-primary" />,
  Share2: <Share2 className="w-6 h-6 text-primary" />,
  TrendingUp: <TrendingUp className="w-6 h-6 text-primary" />,
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
  icon: string;
}

export function KpiCard({ label, value, min, max, icon }: KpiCardProps) {
  const displayValue = () => {
    if (min !== undefined && max !== undefined) {
      return `${formatNumber(min)}~${formatNumber(max)}`;
    }
    return formatNumber(value) || '0';
  };

  return (
    <Card className="flex flex-col items-center justify-center p-4 gap-2 min-w-[120px]">
      <div>{iconMap[icon]}</div>
      <div className="text-2xl font-bold text-center leading-tight">
        {displayValue()}
      </div>
      <div className="text-xs text-muted-foreground text-center">{label}</div>
    </Card>
  );
} 