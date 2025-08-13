import { Card } from "@/components/ui/card";
import { AlertTriangle, CheckCircle2, Megaphone, MessageCircle, Target, Users, TrendingUp, Lightbulb, BarChart3 } from "lucide-react";
import { Bar, Line, Doughnut } from "react-chartjs-2";
import React, { useState } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';

// Chart.js 구성요소 등록
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

export function AnalysisCard(card: any) {
  // useState는 함수 최상단에서 선언
  const [showAllFeedback, setShowAllFeedback] = useState(false);

  // 카드 타입별 분기
  if (card.type === "checklist") {
    return (
      <Card className="p-4 flex flex-col gap-2">
        <div className="font-semibold mb-2">{card.title}</div>
        <ul className="space-y-1 text-sm">
          {(card.items || []).map((item: any, i: number) => {
            const itemText = typeof item === 'object' ? (item.text || item.label || JSON.stringify(item)) : String(item);
            // 바이럴 요소 키워드로 구분
            const isViralItem = itemText.includes("바이럴") || itemText.includes("화제") || itemText.includes("공유") || itemText.includes("트렌드") || itemText.includes("밈") || itemText.includes("유행");
            
            return (
              <li key={i} className="flex items-center gap-2">
                {isViralItem ? (
                  item.checked ? (
                    <Megaphone className="text-red-500 w-4 h-4" />
                  ) : (
                    <MessageCircle className="text-gray-400 w-4 h-4" />
                  )
                ) : (
                  item.checked ? (
                    <CheckCircle2 className="text-green-500 w-4 h-4" />
                  ) : (
                    <AlertTriangle className="text-yellow-500 w-4 h-4" />
                  )
                )}
                <span>{itemText}</span>
              </li>
            );
          })}
        </ul>
      </Card>
    );
  }
  if (card.type === "line") {
    const labels = Array.isArray(card.labels) && card.labels.length > 0 ? card.labels : ["시작", "중간", "끝"];
    const data = Array.isArray(card.data) && card.data.length > 0 ? card.data : [100, 80, 60];
    
    return (
      <Card className="p-4 flex flex-col gap-2">
        <div className="font-semibold mb-2">{card.title}</div>
        <Line
          data={{
            labels: labels,
            datasets: [
              {
                label: card.title,
                data: data,
                borderColor: "#3b82f6",
                backgroundColor: "rgba(59,130,246,0.2)",
                tension: 0.4,
                fill: true,
              },
            ],
          }}
          options={{
            responsive: true,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true } },
          }}
        />
        {card.highlight && (
          <div className="text-xs text-muted-foreground mt-2">{card.highlight.label}: <span className="font-bold text-primary">{card.highlight.value}</span></div>
        )}
      </Card>
    );
  }
  if (card.type === "bar") {
    const labels = Array.isArray(card.labels) && card.labels.length > 0 ? card.labels : ["항목1", "항목2", "항목3"];
    const data = Array.isArray(card.data) && card.data.length > 0 ? card.data : [30, 50, 20];
    
    return (
      <Card className="p-4 flex flex-col gap-2">
        <div className="font-semibold mb-2">{card.title}</div>
        <Bar
          data={{
            labels: labels,
            datasets: [
              {
                label: card.title,
                data: data,
                backgroundColor: card.colors || "#22c55e",
              },
            ],
          }}
          options={{
            responsive: true,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true } },
          }}
        />
      </Card>
    );
  }
  if (card.type === "doughnut") {
    return (
      <Card className="p-4 flex flex-col gap-2">
        <div className="font-semibold mb-2">{card.title}</div>
        <Doughnut
          data={{
            labels: card.labels || [],
            datasets: [
              {
                data: card.data || [],
                backgroundColor: card.colors || ["#facc15", "#3b82f6", "#f472b6", "#22c55e"],
              },
            ],
          }}
          options={{
            responsive: true,
            plugins: { legend: { display: true, position: "bottom" } },
          }}
        />
      </Card>
    );
  }
  if (card.type === "gauge") {
    const value = typeof card.value === 'number' ? card.value : (Number(card.value) || 50);
    
    // 게이지는 바 차트로 대체(간단 구현)
    return (
      <Card className="p-4 flex flex-col gap-2">
        <div className="font-semibold mb-2">{card.title}</div>
        <Bar
          data={{
            labels: [card.title],
            datasets: [
              {
                data: [value],
                backgroundColor: value > 70 ? "#ef4444" : value > 40 ? "#facc15" : "#22c55e",
              },
            ],
          }}
          options={{
            indexAxis: "y" as const,
            responsive: true,
            plugins: { legend: { display: false } },
            scales: {
              x: { min: 0, max: 100, display: true },
              y: { display: false, grid: { display: false }, ticks: { display: false } },
            },
          }}
        />
        {/* 이탈 구간/사유 하단 표시 */}
        {card.dropoffRange && (
          <div className="text-xs text-muted-foreground mt-2"><b>이탈 구간:</b> {card.dropoffRange}</div>
        )}
        {card.reason && (
          <div className="text-xs text-muted-foreground mt-1">
            <b>{card.title && card.title.includes('재시청') ? '재시청 사유:' : '이탈 사유:'}</b> {card.reason}
          </div>
        )}
        {card.warning && (
          <div className="flex items-center gap-1 text-xs text-yellow-600 mt-2">
            <AlertTriangle className="w-4 h-4" /> {card.warning}
          </div>
        )}
      </Card>
    );
  }
  if (card.type === "list") {
    return (
      <Card className="p-4 flex flex-col gap-2">
        <div className="font-semibold mb-2">{card.title}</div>
        <ul className="list-disc pl-5 space-y-1 text-sm">
          {(card.items || []).map((item: any, i: number) => (
            <li key={i}>{typeof item === 'object' ? (item.text || item.label || JSON.stringify(item)) : String(item)}</li>
          ))}
        </ul>
      </Card>
    );
  }
  if (card.type === "score") {
    return (
      <Card className="p-4 flex flex-col gap-2 items-center justify-center">
        <div className="font-semibold mb-2">{card.title}</div>
        <div className="text-4xl font-bold text-primary">{card.value}</div>
        <div className="text-xs text-muted-foreground mt-1">{card.desc}</div>
      </Card>
    );
  }
  if (card.type === "audience-bar") {
    // 성별/연령대 통합 데이터 구성
    const genderLabels = Array.isArray(card.genderLabels) && card.genderLabels.length > 0 ? card.genderLabels : ["여성", "남성", "사용자 지정"];
    const genderData = Array.isArray(card.genderData) && card.genderData.length > 0 ? card.genderData.map((x: number | string) => (isNaN(Number(x)) ? 0 : Number(x))) : [94.2, 5.8, 0];
    const ageLabels = Array.isArray(card.ageLabels) && card.ageLabels.length > 0 ? card.ageLabels : ["만 13-17세", "만 18-24세", "만 25-34세", "만 35-44세", "만 45-54세", "만 55-64세", "만 65세 이상"];
    const ageData = Array.isArray(card.ageData) && card.ageData.length > 0 ? card.ageData.map((x: number | string) => (isNaN(Number(x)) ? 0 : Number(x))) : [0, 0.3, 13.9, 24.2, 42.2, 18.5, 0.9];
    
    // 통합 데이터 구성 (성별 + 연령대)
    const allLabels = [...genderLabels, ...ageLabels];
    const allData = [...genderData, ...ageData];
    const maxValue = Math.max(...allData);
    
    return (
      <Card className="p-4 flex flex-col gap-4">
        <div className="font-semibold mb-2">{card.title}</div>
        <div className="text-xs text-muted-foreground mb-2">조회수 · 업로드 이후(전체 기간)</div>
        
        {/* 통합 바 차트 형태로 표시 */}
        <div className="space-y-2">
          {allLabels.map((label, index) => {
            const value = allData[index] || 0;
            const width = maxValue > 0 ? (value / maxValue) * 100 : 0;
            const isGender = index < genderLabels.length;
            
            return (
              <div key={index} className="flex items-center justify-between">
                <div className="text-xs font-medium w-20 text-left">{label}</div>
                <div className="flex-1 mx-3 bg-gray-200 rounded-full h-2 relative">
                  <div 
                    className={`h-2 rounded-full ${isGender ? 'bg-purple-500' : 'bg-blue-400'}`}
                    style={{ width: `${width}%` }}
                  />
                </div>
                <div className="text-xs font-medium w-12 text-right">{value}%</div>
              </div>
            );
          })}
        </div>
      </Card>
    );
  }
  if (card.type === "feedback-list") {
    const items = card.items || [];
    const filtered = items.filter((item: any) => item.improvedScene || item.improvedCaption);
    const showItems = showAllFeedback ? items : filtered;
    const hasHidden = filtered.length < items.length;
    return (
      <Card className="p-4 flex flex-col gap-4">
        <div className="font-semibold mb-2">{card.title}</div>
        {/* 모바일 카드 */}
        <div className="block md:hidden space-y-4">
          {showItems.map((item: any, i: number) => (
            <div key={i} className="border rounded-lg p-4 space-y-3 bg-gray-50">
              {item.time && (
                <div className="flex items-center justify-center">
                  <div className="text-xs font-mono text-blue-600 bg-blue-100 px-3 py-1 rounded-full font-semibold">
                    {item.time}
                  </div>
                </div>
              )}
              <div className="space-y-3">
                <div className="bg-white rounded-lg p-3 border">
                  <div className="text-xs font-semibold text-gray-600 mb-1">기존 장면</div>
                  <div className="text-sm text-gray-700 leading-relaxed">
                    {item.scene || item.original?.scene || '기존 장면 정보'}
                  </div>
                </div>
                <div className="bg-white rounded-lg p-3 border">
                  <div className="text-xs font-semibold text-gray-600 mb-1">기존 자막</div>
                  <div className="text-sm text-gray-700 leading-relaxed">
                    {item.caption || item.original?.caption || '기존 자막 정보'}
                  </div>
                </div>
                {item.improvedScene && (
                  <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                    <div className="text-xs font-semibold text-green-700 mb-1">💡 개선 장면</div>
                    <div className="text-sm font-medium text-green-800 leading-relaxed">
                      {item.improvedScene}
                    </div>
                  </div>
                )}
                {item.improvedCaption && (
                  <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                    <div className="text-xs font-semibold text-green-700 mb-1">💬 개선 자막</div>
                    <div className="text-sm font-medium text-green-800 leading-relaxed">
                      {item.improvedCaption}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
          {hasHidden && (
            <button
              className="w-full mt-2 py-2 rounded bg-muted text-sm font-semibold hover:bg-accent transition"
              onClick={() => setShowAllFeedback(v => !v)}
            >
              {showAllFeedback ? '간단히 보기' : '자세히 보기'}
            </button>
          )}
        </div>
        {/* 데스크톱 테이블 */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className="text-left p-3 font-semibold bg-gray-50 border-r border-gray-200 w-16">시간</th>
                <th className="text-left p-3 font-semibold bg-gray-50 border-r border-gray-200">기존 장면</th>
                <th className="text-left p-3 font-semibold bg-gray-50 border-r border-gray-200">기존 자막</th>
                <th className={`text-left p-3 font-semibold border-r border-gray-200${showItems.some((item: any) => item.improvedScene) ? ' bg-green-50' : ' bg-gray-50'}`}>개선 장면</th>
                <th className={`text-left p-3 font-semibold${showItems.some((item: any) => item.improvedCaption) ? ' bg-green-50' : ' bg-gray-50'}`}>개선 자막</th>
              </tr>
            </thead>
            <tbody>
              {showItems.map((item: any, i: number) => (
                <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="p-3 align-top border-r border-gray-100 text-center">
                    {item.time && (
                      <div className="text-xs font-mono text-blue-600 bg-blue-50 px-2 py-1 rounded inline-block">
                        {item.time}
                      </div>
                    )}
                  </td>
                  <td className="p-3 align-top border-r border-gray-100">
                    <div className="text-sm text-gray-700">
                      {item.scene || item.original?.scene || '기존 장면 정보'}
                    </div>
                  </td>
                  <td className="p-3 align-top border-r border-gray-100">
                    <div className="text-sm text-gray-700">
                      {item.caption || item.original?.caption || '기존 자막 정보'}
                    </div>
                  </td>
                  <td className={`p-3 align-top border-r border-gray-100${item.improvedScene ? ' bg-green-50' : ''}`}>
                    <div className="text-sm font-medium text-green-800">
                      {item.improvedScene ? item.improvedScene : ''}
                    </div>
                  </td>
                  <td className={`p-3 align-top${item.improvedCaption ? ' bg-green-50' : ''}`}>
                    <div className="text-sm font-medium text-green-800">
                      {item.improvedCaption ? item.improvedCaption : ''}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {hasHidden && (
            <button
              className="w-full mt-2 py-2 rounded bg-muted text-sm font-semibold hover:bg-accent transition"
              onClick={() => setShowAllFeedback(v => !v)}
            >
              {showAllFeedback ? '간단히 보기' : '자세히 보기'}
            </button>
          )}
        </div>
        {showItems.length === 0 && (
          <div className="text-center text-gray-500 py-8">
            피드백 데이터가 없습니다.
          </div>
        )}
      </Card>
    );
  }
  if (card.type === "summary") {
    const summaryText = card.summary || card.text || card.description || '';
    
    // 텍스트를 섹션별로 파싱
    const parseSummaryText = (text: string) => {
      const sections = [
        { key: '핵심 강점 분석', icon: Target, color: 'text-blue-600', bgColor: 'bg-blue-50' },
        { key: '타겟 오디언스 분석', icon: Users, color: 'text-purple-600', bgColor: 'bg-purple-50' },
        { key: '성과 예측 및 근거', icon: TrendingUp, color: 'text-green-600', bgColor: 'bg-green-50' },
        { key: '주요 개선점', icon: Lightbulb, color: 'text-orange-600', bgColor: 'bg-orange-50' },
        { key: '시장 포지셔닝', icon: BarChart3, color: 'text-indigo-600', bgColor: 'bg-indigo-50' }
      ];
      
      const parsedSections = [];
      
      for (const section of sections) {
        const regex = new RegExp(`\\*\\*${section.key}\\*\\*:?\\s*([^*]+?)(?=\\*\\*|$)`, 'i');
        const match = text.match(regex);
        
        if (match && match[1]) {
          parsedSections.push({
            ...section,
            content: match[1].trim()
          });
        }
      }
      
      return parsedSections;
    };
    
    const sections = parseSummaryText(summaryText);
    
    // 섹션이 파싱되지 않은 경우 원본 텍스트 표시
    if (sections.length === 0) {
      return (
        <Card className="p-6">
          <div className="font-semibold mb-4 text-lg">{card.title}</div>
          <div className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">
            {summaryText}
          </div>
        </Card>
      );
    }
    
    return (
      <Card className="p-6">
        <div className="font-semibold mb-6 text-lg">{card.title}</div>
        <div className="space-y-4">
          {sections.map((section, index) => {
            const IconComponent = section.icon;
            return (
              <div key={index} className={`p-4 rounded-lg ${section.bgColor} border-l-4 border-l-current ${section.color}`}>
                <div className="flex items-center gap-2 mb-2">
                  <IconComponent className={`w-5 h-5 ${section.color}`} />
                  <h3 className={`font-semibold ${section.color}`}>{section.key}</h3>
                </div>
                <p className="text-sm text-gray-700 leading-relaxed">
                  {section.content}
                </p>
              </div>
            );
          })}
        </div>
      </Card>
    );
  }
  // 기본: 텍스트 카드
  return (
    <Card className="p-4 flex flex-col gap-2">
      <div className="font-semibold mb-2">{card.title}</div>
      <div className="text-sm text-muted-foreground">{card.text}</div>
    </Card>
  );
} 