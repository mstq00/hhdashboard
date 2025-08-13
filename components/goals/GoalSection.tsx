import React from 'react';
import { Goal } from '../../types/goal';

interface GoalSectionProps {
  title: string;
  goals: Goal[];
  children?: React.ReactNode;
  editMode?: boolean;
  onDelete?: (id: string) => void;
  onEdit?: (id: string, newTitle: string, newDescription?: string) => void;
}

interface GoalChildProps {
  goal: Goal;
  editMode?: boolean;
  onDelete?: (id: string) => void;
  onEdit?: (id: string, newTitle: string, newDescription?: string) => void;
}

/**
 * 목표 분류별 섹션 컴포넌트
 * - title: 섹션 제목 (예: 효율, 확장, 공통성장지표 등)
 * - goals: 해당 분류의 목표 리스트
 */
export const GoalSection: React.FC<GoalSectionProps> = ({ title, goals, children, editMode, onDelete, onEdit }) => {
  return (
    <section className="mb-8">
      <h2 className="text-lg font-bold mb-2">{title}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {goals.map((goal) => (
          children ?
            React.cloneElement(children as React.ReactElement<GoalChildProps>, { 
              key: goal.id, 
              goal, 
              editMode, 
              onDelete, 
              onEdit 
            }) :
            <div key={goal.id} className="bg-white rounded shadow p-4">
              <span className="font-medium">{goal.title}</span>
              {goal.description && (
                <span className="ml-2 text-sm text-gray-500">{goal.description}</span>
              )}
            </div>
        ))}
      </div>
    </section>
  );
};

export default GoalSection; 