"use client"

import React, { useState, useEffect } from 'react'
import { Calendar, Users, Target, BarChart3, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Checkbox } from '@/components/ui/checkbox'

export interface GoalFormData {
    title: string
    cycleId: string
    startDate: string
    endDate: string
    organization: string
    assignee: string
    hasMetric: boolean
    metricName: string
    startValue: string
    targetValue: string
    description: string
    keyword?: string
    useCyclePeriod: boolean
    parentGoalId?: string
}

interface GoalFormContentProps {
    initialData?: GoalFormData
    onSubmit: (data: GoalFormData) => void
    onCancel: () => void
    parentGoal?: { id: string; title: string }
}

export function GoalFormContent({ initialData, onSubmit, onCancel, parentGoal }: GoalFormContentProps) {
    const [formData, setFormData] = useState<GoalFormData>({
        title: '',
        cycleId: '',
        startDate: '',
        endDate: '',
        organization: '개인',
        assignee: '',
        hasMetric: false,
        metricName: '',
        startValue: '',
        targetValue: '',
        description: '',
        keyword: '',
        useCyclePeriod: false,
        parentGoalId: ''
    })

    const [selectedCycle, setSelectedCycle] = useState<any>(null)
    const [cycles, setCycles] = useState<any[]>([])

    useEffect(() => {
        const loadCycles = async () => {
            try {
                const response = await fetch('/api/goals/cycles')
                if (response.ok) {
                    const data = await response.json()
                    const transformedData = data.map((cycle: any) => ({
                        ...cycle,
                        keywords: Array.isArray(cycle.keywords) ? cycle.keywords.map((k: any) =>
                            typeof k === 'string' ? { name: k, description: '' } : k
                        ) : []
                    }))
                    setCycles(transformedData)

                    const defaultCycle = transformedData.find((cycle: any) => cycle.is_default)

                    if (initialData) {
                        setFormData(initialData)
                        if (initialData.cycleId) {
                            setSelectedCycle(transformedData.find(c => c.id === initialData.cycleId))
                        }
                    } else {
                        setFormData(prev => ({
                            ...prev,
                            cycleId: defaultCycle?.id || '',
                            startDate: defaultCycle?.start_date || '',
                            endDate: defaultCycle?.end_date || '',
                            parentGoalId: parentGoal?.id || ''
                        }))
                        setSelectedCycle(defaultCycle)
                    }
                }
            } catch (error) {
                console.error('사이클 로드 오류:', error)
            }
        }
        loadCycles()
    }, [initialData, parentGoal])

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        onSubmit(formData)
    }

    const handleCycleChange = (cycleId: string) => {
        const cycle = cycles.find(c => c.id === cycleId)
        setSelectedCycle(cycle)
        setFormData(prev => ({
            ...prev,
            cycleId,
            keyword: '',
            startDate: prev.useCyclePeriod && cycle ? cycle.start_date : prev.startDate,
            endDate: prev.useCyclePeriod && cycle ? cycle.end_date : prev.endDate
        }))
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
                {parentGoal && (
                    <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100 flex items-center gap-2">
                        <Target className="w-4 h-4 text-blue-500" />
                        <div className="text-xs">
                            <span className="font-bold text-blue-700">상위 목표:</span> {parentGoal.title}
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-slate-700 ml-1">사이클</Label>
                        <Select value={formData.cycleId} onValueChange={handleCycleChange}>
                            <SelectTrigger className="bg-slate-50 border-slate-200 rounded-xl">
                                <SelectValue placeholder="사이클 선택" />
                            </SelectTrigger>
                            <SelectContent>
                                {cycles.map((cycle) => (
                                    <SelectItem key={cycle.id} value={cycle.id}>{cycle.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-slate-700 ml-1">목표 구분</Label>
                        <Select value={formData.organization} onValueChange={(v) => setFormData({ ...formData, organization: v, keyword: '' })}>
                            <SelectTrigger className="bg-slate-50 border-slate-200 rounded-xl">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="개인">개인</SelectItem>
                                <SelectItem value="키워드">키워드</SelectItem>
                                <SelectItem value="공통">공통</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {formData.organization === '키워드' && selectedCycle?.keywords?.length > 0 && (
                    <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-slate-700 ml-1">키워드</Label>
                        <Select value={formData.keyword || ''} onValueChange={(v) => setFormData({ ...formData, keyword: v })}>
                            <SelectTrigger className="bg-slate-50 border-slate-200 rounded-xl">
                                <SelectValue placeholder="키워드 선택" />
                            </SelectTrigger>
                            <SelectContent>
                                {selectedCycle.keywords.map((k: any) => (
                                    <SelectItem key={k.name} value={k.name}>{k.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                )}

                <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700 ml-1">목표 이름 *</Label>
                    <Input
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        placeholder="어떤 일을 이루고 싶나요?"
                        className="bg-slate-50 border-slate-200 rounded-xl"
                        required
                    />
                </div>

                <div className="space-y-1.5">
                    <div className="flex items-center justify-between ml-1">
                        <Label className="text-xs font-bold text-slate-700">기간</Label>
                        <div className="flex items-center gap-2">
                            <Checkbox
                                id="form-useCycle"
                                checked={formData.useCyclePeriod}
                                onCheckedChange={(checked) => setFormData({
                                    ...formData,
                                    useCyclePeriod: !!checked,
                                    startDate: checked && selectedCycle ? selectedCycle.start_date : formData.startDate,
                                    endDate: checked && selectedCycle ? selectedCycle.end_date : formData.endDate
                                })}
                                disabled={!selectedCycle}
                            />
                            <Label htmlFor="form-useCycle" className="text-[10px] text-slate-500 font-medium">사이클 기간 자동 적용</Label>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <Input
                            type="date"
                            value={formData.startDate}
                            onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                            disabled={formData.useCyclePeriod}
                            className="bg-slate-50 border-slate-200 rounded-xl text-sm"
                        />
                        <Input
                            type="date"
                            value={formData.endDate}
                            onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                            disabled={formData.useCyclePeriod}
                            className="bg-slate-50 border-slate-200 rounded-xl text-sm"
                        />
                    </div>
                </div>

                <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700 ml-1">담당자</Label>
                    <div className="relative">
                        <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input
                            value={formData.assignee}
                            onChange={(e) => setFormData({ ...formData, assignee: e.target.value })}
                            placeholder="담당자 이름"
                            className="pl-9 bg-slate-50 border-slate-200 rounded-xl"
                        />
                    </div>
                </div>

                <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100 space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <BarChart3 className="w-4 h-4 text-primary" />
                            <Label className="text-xs font-bold text-slate-700">수치 지표 설정</Label>
                        </div>
                        <Switch
                            checked={formData.hasMetric}
                            onCheckedChange={(v) => setFormData({ ...formData, hasMetric: v })}
                        />
                    </div>
                    {formData.hasMetric && (
                        <div className="space-y-3 animate-in fade-in slide-in-from-top-1">
                            <Input
                                value={formData.metricName}
                                onChange={(e) => setFormData({ ...formData, metricName: e.target.value })}
                                placeholder="지표명 (예: 매출액, 방문자 수)"
                                className="bg-white border-slate-200 rounded-xl h-9 text-sm"
                            />
                            <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-1">
                                    <Label className="text-[10px] text-slate-400 font-bold ml-1 uppercase">Start</Label>
                                    <Input
                                        type="number"
                                        value={formData.startValue}
                                        onChange={(e) => setFormData({ ...formData, startValue: e.target.value })}
                                        className="bg-white border-slate-200 rounded-xl h-9 text-sm"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-[10px] text-slate-400 font-bold ml-1 uppercase">Target</Label>
                                    <Input
                                        type="number"
                                        value={formData.targetValue}
                                        onChange={(e) => setFormData({ ...formData, targetValue: e.target.value })}
                                        className="bg-white border-slate-200 rounded-xl h-9 text-sm"
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700 ml-1">메모</Label>
                    <Textarea
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="상세 정보를 입력하세요..."
                        className="bg-slate-50 border-slate-200 rounded-xl min-h-[80px] text-sm"
                    />
                </div>
            </div>

            <div className="flex gap-2 pt-2">
                <Button type="button" variant="ghost" onClick={onCancel} className="flex-1 rounded-xl h-11 font-bold text-slate-500">
                    취소
                </Button>
                <Button type="submit" className="flex-[2] rounded-xl h-11 font-bold shadow-lg shadow-primary/20">
                    {initialData ? '수정 완료' : '목표 만들기'}
                </Button>
            </div>
        </form>
    )
}
