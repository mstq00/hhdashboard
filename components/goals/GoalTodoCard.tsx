import React, { useState } from 'react';
import { Goal } from '../../types/goal';
import { Card } from '../ui/card';
import { Checkbox } from '../ui/checkbox';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Progress } from '../ui/progress';

interface GoalTodoCardProps {
  goal: Goal;
  onCheck?: (id: string, checked: boolean) => void;
  editMode?: boolean;
  onDelete?: (id: string) => void;
  onEdit?: (id: string, newTitle: string, newDescription?: string, newSubGoals?: Goal[]) => void;
}

export const GoalTodoCard: React.FC<GoalTodoCardProps> = ({ goal, onCheck, editMode, onDelete, onEdit }) => {
  // 상위 목표 인라인 편집 상태
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(goal.title);
  const [editDesc, setEditDesc] = useState(goal.description || '');

  // 하위 목표 인라인 편집 상태
  const [editingSubId, setEditingSubId] = useState<string | null>(null);
  const [subEditTitle, setSubEditTitle] = useState('');
  const [subEditDesc, setSubEditDesc] = useState('');

  // 하위 목표 추가 상태
  const [addingSub, setAddingSub] = useState(false);
  const [newSubTitle, setNewSubTitle] = useState('');
  const [newSubDesc, setNewSubDesc] = useState('');

  // 하위 목표 수정/삭제/추가 핸들러
  const handleSubEdit = (subId: string, newTitle: string, newDescription?: string) => {
    if (!goal.subGoals) return;
    const updated = goal.subGoals.map(sub => sub.id === subId ? { ...sub, title: newTitle, description: newDescription } : sub);
    onEdit?.(goal.id, goal.title, goal.description, updated);
    setEditingSubId(null);
  };
  const handleSubDelete = (subId: string) => {
    if (!goal.subGoals) return;
    const updated = goal.subGoals.filter(sub => sub.id !== subId);
    onEdit?.(goal.id, goal.title, goal.description, updated);
  };
  const handleAddSub = () => {
    const newSub = { id: `sub-${Date.now()}`, type: goal.type, category: goal.category, title: newSubTitle, description: newSubDesc, checked: false };
    const updated = goal.subGoals ? [...goal.subGoals, newSub] : [newSub];
    onEdit?.(goal.id, goal.title, goal.description, updated);
    setNewSubTitle('');
    setNewSubDesc('');
    setAddingSub(false);
  };

  // 진행률 계산
  const subGoals = goal.subGoals || [];
  const total = subGoals.length;
  const done = subGoals.filter(g => g.checked).length;
  const progress = total > 0 ? Math.round((done / total) * 100) : (goal.checked ? 100 : 0);

  return (
    <Card className="p-5 mb-2 shadow flex flex-col gap-3 relative">
      {/* 상위 목표 인라인 편집 */}
      {isEditing ? (
        <div className="flex flex-col gap-2">
          <Input
            value={editTitle}
            onChange={e => setEditTitle(e.target.value)}
            placeholder="목표 제목"
            className="font-semibold text-base"
            autoFocus
          />
          <Input
            value={editDesc}
            onChange={e => setEditDesc(e.target.value)}
            placeholder="설명(선택)"
            className="text-sm"
          />
          <div className="flex gap-2 mt-2">
            <Button size="sm" onClick={() => { onEdit?.(goal.id, editTitle, editDesc, goal.subGoals); setIsEditing(false); }}>저장</Button>
            <Button size="sm" variant="outline" onClick={() => setIsEditing(false)}>취소</Button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <Checkbox checked={goal.checked} onCheckedChange={(v) => onCheck?.(goal.id, !!v)} />
          <span className="font-semibold text-base">{goal.title}</span>
          {editMode && (
            <Button size="sm" variant="ghost" className="ml-auto" onClick={() => setIsEditing(true)}>수정</Button>
          )}
          {editMode && (
            <Button size="sm" variant="ghost" onClick={() => onDelete?.(goal.id)}>삭제</Button>
          )}
        </div>
      )}
      {goal.description && !isEditing && (
        <div className="text-sm text-gray-500 ml-6">{goal.description}</div>
      )}
      {/* 진행률 바 */}
      <div className="flex items-center gap-2 ml-6">
        <Progress value={progress} className="w-40 h-2" />
        <span className="text-xs text-gray-500 font-semibold ml-2">{progress}% 달성</span>
      </div>
      {/* 하위 목표 리스트 */}
      <div className="ml-6 flex flex-col gap-1 mt-2">
        {subGoals.map((sub) => (
          <div key={sub.id} className="flex items-center gap-2 group">
            <Checkbox checked={sub.checked} onCheckedChange={(v) => onCheck?.(sub.id, !!v)} />
            {editMode && editingSubId === sub.id ? (
              <>
                <Input
                  value={subEditTitle}
                  onChange={e => setSubEditTitle(e.target.value)}
                  placeholder="하위 목표 제목"
                  className="text-sm"
                  autoFocus
                />
                <Input
                  value={subEditDesc}
                  onChange={e => setSubEditDesc(e.target.value)}
                  placeholder="설명(선택)"
                  className="text-xs"
                />
                <Button size="sm" onClick={() => handleSubEdit(sub.id, subEditTitle, subEditDesc)}>저장</Button>
                <Button size="sm" variant="outline" onClick={() => setEditingSubId(null)}>취소</Button>
              </>
            ) : (
              <>
                <span className="text-sm">{sub.title}</span>
                {sub.description && <span className="text-xs text-gray-400 ml-1">{sub.description}</span>}
                {editMode && (
                  <>
                    <Button size="sm" variant="ghost" onClick={() => { setEditingSubId(sub.id); setSubEditTitle(sub.title); setSubEditDesc(sub.description || ''); }}>수정</Button>
                    <Button size="sm" variant="ghost" onClick={() => handleSubDelete(sub.id)}>삭제</Button>
                  </>
                )}
              </>
            )}
          </div>
        ))}
        {/* 하위 목표 추가 */}
        {editMode && (
          addingSub ? (
            <div className="flex items-center gap-2 mt-1">
              <Input
                value={newSubTitle}
                onChange={e => setNewSubTitle(e.target.value)}
                placeholder="하위 목표 제목"
                className="text-sm"
                autoFocus
              />
              <Input
                value={newSubDesc}
                onChange={e => setNewSubDesc(e.target.value)}
                placeholder="설명(선택)"
                className="text-xs"
              />
              <Button size="sm" onClick={handleAddSub}>추가</Button>
              <Button size="sm" variant="outline" onClick={() => setAddingSub(false)}>취소</Button>
            </div>
          ) : (
            <Button size="sm" variant="ghost" className="mt-1 w-fit" onClick={() => setAddingSub(true)}>+ 하위 목표 추가</Button>
          )
        )}
      </div>
    </Card>
  );
};

export default GoalTodoCard; 