"use client"

import React, { useState, useEffect } from 'react'
import { ChevronLeft, Edit, Trash2, Plus, Settings, Target, BarChart3, Calendar, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { GoalDetail } from '@/components/goals/GoalDetail'
import { Card, CardContent } from '@/components/ui/card'
import { GoalFormContent, GoalFormData } from '@/components/goals/GoalFormContent'
import { CycleManagementContent } from '@/components/goals/CycleManagementContent'

type GoalStatus = 'pending' | 'on_track' | 'difficult' | 'completed' | 'stopped'

interface Goal {
    id: string
    title: string
    status: GoalStatus
    progress: number
    organization: string
    assignee: string
    period: string
    cycle?: string
    keyword?: string
    description?: string
    parentGoalId?: string
}

interface GoalRightPanelProps {
    selectedGoal: Goal | null
    onCloseGoal: () => void
    onCreateGoal: (data: GoalFormData) => void
    onUpdateGoal: (id: string, data: GoalFormData) => void
    onUpdateProgress: (id: string, progress: number) => void
    onUpdateStatus: (id: string, status: string) => void
    onDeleteGoal: (id: string) => void
    onAddSubGoal: (parent: Goal) => void
}

type PanelView = 'overview' | 'detail' | 'create' | 'edit' | 'cycle_mgm'

export function GoalRightPanel({
    selectedGoal,
    onCloseGoal,
    onCreateGoal,
    onUpdateGoal,
    onUpdateProgress,
    onUpdateStatus,
    onDeleteGoal,
    onAddSubGoal,
}: GoalRightPanelProps) {
    const [view, setView] = useState<PanelView>('overview')
    const [parentGoalForSub, setParentGoalForSub] = useState<Goal | null>(null)

    // 동기화: 선택된 목표 변경 시 뷰 전환
    useEffect(() => {
        if (selectedGoal) {
            setView('detail')
        } else {
            setView('overview')
        }
    }, [selectedGoal])

    // --- Render Handlers ---

    // 1. 상세 보기 화면 (Goal Detail)
    const renderDetailView = () => (
        <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    <div className="w-1.5 h-5 bg-primary rounded-full"></div>
                    <h3 className="text-lg font-bold">목표 상세 정보</h3>
                </div>
                <Button variant="ghost" size="sm" onClick={onCloseGoal}>
                    <ChevronLeft className="w-4 h-4 mr-1" /> 목록
                </Button>
            </div>

            <div className="space-y-6">
                <div className="bg-white p-5 rounded-3xl border border-slate-200/60 shadow-sm relative overflow-hidden group">
                    <div className="flex items-start justify-between relative z-10">
                        <div className="space-y-1">
                            <span className="text-[10px] font-black text-primary px-2 py-0.5 bg-primary/10 rounded-full uppercase tracking-wider">{selectedGoal?.organization}</span>
                            <h4 className="text-lg font-black text-slate-800 leading-tight mt-1">{selectedGoal?.title}</h4>
                        </div>
                        <div className="flex gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl hover:bg-slate-100" onClick={() => setView('edit')}>
                                <Edit className="w-4 h-4 text-slate-400" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl hover:bg-red-50 text-red-400" onClick={() => selectedGoal && onDeleteGoal(selectedGoal.id)}>
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mt-6">
                        <div className="space-y-0.5">
                            <p className="text-[10px] text-slate-400 font-bold uppercase ml-1">Assignee</p>
                            <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-100">
                                <div className="w-6 h-6 bg-primary/20 rounded-full flex items-center justify-center text-[10px] font-bold text-primary">
                                    {selectedGoal?.assignee[0]}
                                </div>
                                <span className="text-xs font-bold text-slate-700">{selectedGoal?.assignee}</span>
                            </div>
                        </div>
                        <div className="space-y-0.5">
                            <p className="text-[10px] text-slate-400 font-bold uppercase ml-1">Period</p>
                            <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-100">
                                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                <span className="text-[10px] font-bold text-slate-500">{selectedGoal?.period.split('~')[1]} 까지</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    <GoalDetail
                        goal={selectedGoal as any}
                        isOpen={true}
                        onClose={() => { }}
                        onProgressUpdate={onUpdateProgress}
                        onStatusUpdate={onUpdateStatus}
                        hideHeader={true}
                    />

                    {!selectedGoal?.parentGoalId && (
                        <Button onClick={() => {
                            setParentGoalForSub(selectedGoal);
                            setView('create');
                        }} className="w-full h-12 rounded-2xl font-black shadow-lg shadow-primary/10 gap-2">
                            <Plus className="w-4 h-4" /> 하위 목표 추가하기
                        </Button>
                    )}
                </div>
            </div>
        </div>
    )

    // 2. 기본 화면 (Overview)
    const renderOverview = () => (
        <div className="space-y-8 animate-in fade-in duration-300">
            <div className="space-y-2">
                <div className="flex items-center gap-2 mb-1">
                    <div className="w-1.5 h-5 bg-primary rounded-full"></div>
                    <h3 className="text-lg font-bold uppercase tracking-tight">Management</h3>
                </div>
                <p className="text-xs text-slate-400 font-medium ml-1">목표와 사이클을 효율적으로 관리하세요.</p>
            </div>

            <div className="grid gap-4">
                <Card onClick={() => setView('cycle_mgm')} className="border-none shadow-none bg-gradient-to-br from-slate-800 to-slate-900 text-white cursor-pointer hover:scale-[1.02] transition-transform overflow-hidden relative group rounded-3xl">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500" />
                    <CardContent className="p-6 relative z-10">
                        <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center mb-4 border border-white/10">
                            <Settings className="w-6 h-6 text-white" />
                        </div>
                        <h4 className="text-lg font-black mb-1">사이클 관리</h4>
                        <p className="text-xs text-slate-400 font-medium">기간별 운영 사이클 및 키워드 설정</p>
                    </CardContent>
                </Card>

                <Card onClick={() => { setParentGoalForSub(null); setView('create'); }} className="border-2 border-dashed border-slate-200 bg-slate-50/50 hover:bg-primary/5 hover:border-primary/30 cursor-pointer transition-all rounded-3xl group">
                    <CardContent className="p-8 flex flex-col items-center justify-center text-center">
                        <div className="w-14 h-14 bg-white rounded-2xl shadow-sm flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                            <Plus className="w-7 h-7 text-primary" />
                        </div>
                        <h4 className="text-lg font-black text-slate-800 mb-1">새 목표 만들기</h4>
                        <p className="text-xs text-slate-400 font-medium">새로운 비즈니스 목표를 수립합니다.</p>
                    </CardContent>
                </Card>
            </div>

            <div className="bg-blue-50/50 p-5 rounded-3xl border border-blue-100/50 flex gap-4">
                <div className="w-10 h-10 bg-blue-100 rounded-2xl flex items-center justify-center shrink-0">
                    <Info className="w-5 h-5 text-blue-600" />
                </div>
                <div className="space-y-1">
                    <h5 className="text-xs font-black text-blue-800 uppercase">Pro Tip</h5>
                    <p className="text-[11px] text-blue-600/80 leading-relaxed font-medium">목표를 클릭하면 상세 진행 상황 확인과 하위 목표 관리가 가능합니다.</p>
                </div>
            </div>
        </div>
    )

    // 3. 폼 화면 (Create / Edit)
    const renderFormView = (isEdit: boolean) => (
        <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    <div className="w-1.5 h-5 bg-primary rounded-full"></div>
                    <h3 className="text-lg font-bold">{isEdit ? '목표 수정' : parentGoalForSub ? '하위 목표 수립' : '새 목표 수립'}</h3>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setView('overview')}>
                    <ChevronLeft className="w-4 h-4 mr-1" /> 취소
                </Button>
            </div>

            <GoalFormContent
                initialData={isEdit && selectedGoal ? {
                    ...selectedGoal,
                    cycleId: selectedGoal.cycle || '',
                    startDate: selectedGoal.period.split('~')[0].trim(),
                    endDate: selectedGoal.period.split('~')[1].trim(),
                    useCyclePeriod: false,
                    hasMetric: false, // 상세 데이터 필요 시 추가 연동
                    metricName: '',
                    startValue: '',
                    targetValue: '',
                    description: selectedGoal.description || ''
                } as GoalFormData : undefined}
                parentGoal={parentGoalForSub ? { id: parentGoalForSub.id, title: parentGoalForSub.title } : undefined}
                onSubmit={(data) => {
                    if (isEdit && selectedGoal) {
                        onUpdateGoal(selectedGoal.id, data);
                    } else {
                        onCreateGoal(data);
                    }
                    setView('overview');
                }}
                onCancel={() => setView('overview')}
            />
        </div>
    )

    // 4. 사이클 관리 화면 (Cycle Management)
    const renderCycleMgmView = () => (
        <CycleManagementContent
            onBack={() => setView('overview')}
            onCycleUpdate={() => { }} // 부모 페이지 데이터 갱신은 GoalPage에서 처리
        />
    )

    return (
        <div className="h-full">
            {view === 'overview' && renderOverview()}
            {view === 'detail' && renderDetailView()}
            {view === 'create' && renderFormView(false)}
            {view === 'edit' && renderFormView(true)}
            {view === 'cycle_mgm' && renderCycleMgmView()}
        </div>
    )
}
