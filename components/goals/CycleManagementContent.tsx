"use client"

import React, { useState, useEffect } from 'react'
import { Plus, Settings, Edit, Trash2, ChevronLeft, Calendar as CalendarIcon, Tag, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

interface Keyword {
    name: string
    description: string
}

interface Cycle {
    id: string
    name: string
    startDate: string
    endDate: string
    keywords: Keyword[]
    isDefault: boolean
}

interface CycleManagementContentProps {
    onBack: () => void
    onCycleUpdate: () => void
}

export function CycleManagementContent({ onBack, onCycleUpdate }: CycleManagementContentProps) {
    const [cycles, setCycles] = useState<Cycle[]>([])
    const [loading, setLoading] = useState(false)
    const [view, setView] = useState<'list' | 'form'>('list')
    const [editingCycle, setEditingCycle] = useState<Cycle | null>(null)
    const [formData, setFormData] = useState({
        name: '',
        startDate: '',
        endDate: '',
        keywords: [] as Keyword[],
        isDefault: false
    })
    const [newKeyword, setNewKeyword] = useState({ name: '', description: '' })

    const loadCycles = async () => {
        setLoading(true)
        try {
            const response = await fetch('/api/goals/cycles')
            if (response.ok) {
                const data = await response.json()
                const transformed = data.map((c: any) => ({
                    id: c.id,
                    name: c.name,
                    startDate: c.start_date,
                    endDate: c.end_date,
                    keywords: Array.isArray(c.keywords) ? c.keywords.map((k: any) =>
                        typeof k === 'string' ? { name: k, description: '' } : k
                    ) : [],
                    isDefault: c.is_default
                }))
                setCycles(transformed.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()))
            }
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { loadCycles() }, [])

    const handleSave = async () => {
        if (!formData.name || !formData.startDate || !formData.endDate) return

        const method = editingCycle ? 'PUT' : 'POST'
        const url = editingCycle ? `/api/goals/cycles/${editingCycle.id}` : '/api/goals/cycles'

        try {
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: formData.name,
                    start_date: formData.startDate,
                    end_date: formData.endDate,
                    keywords: formData.keywords,
                    is_default: formData.isDefault
                })
            })
            if (res.ok) {
                await loadCycles()
                onCycleUpdate()
                setView('list')
            }
        } catch (error) {
            console.error(error)
        }
    }

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`"${name}" 사이클을 삭제하시겠습니까? 관련 목표들도 함께 처리될 수 있습니다.`)) return
        try {
            const res = await fetch(`/api/goals/cycles/${id}`, { method: 'DELETE' })
            if (res.ok) loadCycles()
        } catch (error) {
            console.error(error)
        }
    }

    const handleSetDefault = async (id: string) => {
        try {
            const res = await fetch('/api/goals/cycles/default', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ cycleId: id })
            })
            if (res.ok) loadCycles()
        } catch (error) {
            console.error(error)
        }
    }

    if (view === 'form') {
        return (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                        <div className="w-1.5 h-5 bg-primary rounded-full"></div>
                        <h3 className="text-lg font-bold">{editingCycle ? '사이클 수정' : '새 사이클'}</h3>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setView('list')}>
                        <ChevronLeft className="w-4 h-4 mr-1" /> 취소
                    </Button>
                </div>

                <div className="space-y-4">
                    <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-slate-700 ml-1">사이클 이름</Label>
                        <Input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="예: 2024 하반기" className="bg-slate-50 border-slate-200 rounded-xl" />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold text-slate-700 ml-1">시작일</Label>
                            <Input type="date" value={formData.startDate} onChange={e => setFormData({ ...formData, startDate: e.target.value })} className="bg-slate-50 border-slate-200 rounded-xl text-sm" />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold text-slate-700 ml-1">종료일</Label>
                            <Input type="date" value={formData.endDate} onChange={e => setFormData({ ...formData, endDate: e.target.value })} className="bg-slate-50 border-slate-200 rounded-xl text-sm" />
                        </div>
                    </div>

                    <Separator className="my-2" />

                    <div className="space-y-3">
                        <div className="flex items-center justify-between ml-1">
                            <Label className="text-xs font-bold text-slate-700">키워드 설정</Label>
                            <Button variant="ghost" size="sm" className="h-7 text-[11px] font-bold text-primary" onClick={() => {
                                if (!newKeyword.name) return
                                setFormData({ ...formData, keywords: [...formData.keywords, newKeyword] })
                                setNewKeyword({ name: '', description: '' })
                            }}>+ 추가</Button>
                        </div>
                        <div className="space-y-2">
                            <Input value={newKeyword.name} onChange={e => setNewKeyword({ ...newKeyword, name: e.target.value })} placeholder="키워드명" className="h-9 text-sm bg-slate-50 border-slate-200 rounded-xl" />
                            <Input value={newKeyword.description} onChange={e => setNewKeyword({ ...newKeyword, description: e.target.value })} placeholder="간단 설명 (선택)" className="h-9 text-sm bg-slate-50 border-slate-200 rounded-xl" />
                        </div>

                        <div className="flex flex-wrap gap-1.5 pt-1">
                            {formData.keywords.map((k, i) => (
                                <Badge key={i} variant="secondary" className="bg-slate-100 text-slate-600 border-transparent pr-1 gap-1">
                                    {k.name}
                                    <button onClick={() => setFormData({ ...formData, keywords: formData.keywords.filter((_, idx) => idx !== i) })} className="hover:text-red-500">
                                        <X className="w-3 h-3" />
                                    </button>
                                </Badge>
                            ))}
                        </div>
                    </div>
                </div>

                <Button onClick={handleSave} className="w-full h-12 rounded-2xl font-bold shadow-lg mt-4">
                    저장하기
                </Button>
            </div>
        )
    }

    return (
        <div className="space-y-6 animate-in slide-in-from-left-4 duration-300">
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    <div className="w-1.5 h-5 bg-primary rounded-full"></div>
                    <h3 className="text-lg font-bold">사이클 관리</h3>
                </div>
                <Button variant="ghost" size="sm" onClick={onBack}>
                    <ChevronLeft className="w-4 h-4 mr-1" /> 돌아가기
                </Button>
            </div>

            <Button onClick={() => {
                setEditingCycle(null)
                setFormData({ name: '', startDate: '', endDate: '', keywords: [], isDefault: false })
                setView('form')
            }} className="w-full h-11 bg-white border-2 border-dashed border-slate-200 text-slate-400 hover:text-primary hover:border-primary/50 hover:bg-primary/5 rounded-2xl transition-all">
                <Plus className="w-4 h-4 mr-2" /> 새 사이클 추가
            </Button>

            <div className="space-y-3">
                {cycles.map(cycle => (
                    <Card key={cycle.id} className="border-slate-200/60 shadow-sm overflow-hidden group">
                        <CardContent className="p-4 space-y-3">
                            <div className="flex items-start justify-between">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h4 className="font-bold text-slate-800">{cycle.name}</h4>
                                        {cycle.isDefault && <Badge className="bg-blue-50 text-blue-600 text-[10px] font-black border-transparent">DEFAULT</Badge>}
                                    </div>
                                    <p className="text-[11px] text-slate-400 font-medium flex items-center gap-1 mt-0.5">
                                        <CalendarIcon className="w-3 h-3" /> {cycle.startDate} ~ {cycle.endDate}
                                    </p>
                                </div>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    {!cycle.isDefault && (
                                        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg hover:bg-blue-50 text-blue-400" onClick={() => handleSetDefault(cycle.id)}>
                                            <CheckCircle2 className="w-3.5 h-3.5" />
                                        </Button>
                                    )}
                                    <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg hover:bg-slate-100" onClick={() => {
                                        setEditingCycle(cycle)
                                        setFormData({
                                            name: cycle.name,
                                            startDate: cycle.startDate,
                                            endDate: cycle.endDate,
                                            keywords: cycle.keywords,
                                            isDefault: cycle.isDefault
                                        })
                                        setView('form')
                                    }}>
                                        <Edit className="w-3.5 h-3.5" />
                                    </Button>
                                    {!cycle.isDefault && (
                                        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg hover:bg-red-50 text-red-400" onClick={() => handleDelete(cycle.id, cycle.name)}>
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </Button>
                                    )}
                                </div>
                            </div>
                            {cycle.keywords.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                    {cycle.keywords.map((k, i) => (
                                        <span key={i} className="text-[10px] bg-slate-50 text-slate-500 px-1.5 py-0.5 rounded border border-slate-100 flex items-center gap-1">
                                            <Tag className="w-2.5 h-2.5 opacity-50" /> {k.name}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                ))}
                {loading && <div className="text-center py-10 text-xs text-slate-400">불러오는 중...</div>}
            </div>
        </div>
    )
}

const X = ({ className }: { className?: string }) => <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
