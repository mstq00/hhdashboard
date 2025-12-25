import React from 'react';
import { Goal } from '../../types/goal';
import { Progress } from '../ui/progress';

interface GoalProgressCardProps {
  goal: Goal;
}

/**
 * 목표값/현재값/달성률 Progress Bar 카드 (공통 성장 지표용)
 */
export const GoalProgressCard: React.FC<GoalProgressCardProps> = ({ goal }) => {
  // 달성률 계산
  const target = typeof goal.targetValue === 'number' ? goal.targetValue : Number(goal.targetValue?.toString().replace(/[^\d]/g, ''));
  const current = typeof goal.currentValue === 'number' ? goal.currentValue : Number(goal.currentValue?.toString().replace(/[^\d]/g, ''));
  const percent = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;

  // 숫자 포맷팅 함수
  const formatNumber = (value: number | string, unit: string) => {
    const num = typeof value === 'number' ? value : Number(value);
    if (unit === '원') {
      return `${(num / 10000).toFixed(0)}만원`;
    }
    if (unit === '명') {
      return `${num.toLocaleString()}명`;
    }
    return `${num.toLocaleString()}${unit}`;
  };

  return (
    <div className="flex flex-col gap-3 p-4 rounded-3xl bg-[var(--pastel-yellow-bg)] shadow-sm shadow-black/5">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-black text-[var(--pastel-yellow-fg)] uppercase tracking-widest">{percent}% 달성</span>
      </div>
      <Progress value={percent} className="h-3 rounded-full bg-white/50 backdrop-blur-sm shadow-inner" />
      <div className="flex justify-between text-xs font-bold tracking-tight">
        <span className="text-slate-500">현재: <span className="text-slate-800">{formatNumber(goal.currentValue || 0, goal.unit || '')}</span></span>
        <span className="text-slate-500">목표: <span className="text-slate-600">{formatNumber(goal.targetValue || 0, goal.unit || '')}</span></span>
      </div>
    </div>
  );
};

export default GoalProgressCard;