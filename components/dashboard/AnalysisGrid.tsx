import { KpiCard } from "./KpiCard";
import { AnalysisCard } from "./AnalysisCard";

export function AnalysisGrid({ kpis, cards }: { kpis: any[]; cards: any[] }) {
  // 전체 너비 카드와 일반 카드 분리
  const fullWidthCards = cards.filter(card => 
    card.type === "feedback-list" || card.type === "summary"
  );
  const regularCards = cards.filter(card => 
    card.type !== "feedback-list" && card.type !== "summary"
  );

  return (
    <div className="flex flex-col gap-8">
      {/* KPI 카드 그리드 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {kpis.map((kpi, i) => (
          <KpiCard key={i} {...kpi} />
        ))}
      </div>
      
      {/* 일반 분석 카드 그리드 */}
      {regularCards.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {regularCards.map((card, i) => {
            const { key, ...cardProps } = card;
            return <AnalysisCard key={i} {...cardProps} />;
          })}
        </div>
      )}
      
      {/* 전체 너비 카드들 */}
      {fullWidthCards.length > 0 && (
        <div className="flex flex-col gap-6">
          {fullWidthCards.map((card, i) => {
            const { key, ...cardProps } = card;
            return <AnalysisCard key={i} {...cardProps} />;
          })}
        </div>
      )}
    </div>
  );
} 