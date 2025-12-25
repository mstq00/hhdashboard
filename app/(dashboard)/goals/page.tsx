"use client"

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { Plus, Search, Filter, MoreVertical, Target, Calendar, Users, Settings, ChevronDown, ChevronRight, Edit, Trash2, ChevronUp } from 'lucide-react'
import { DeleteConfirmDialog } from '@/components/goals/DeleteConfirmDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { useRightPanel } from '@/lib/context/right-panel-context'
import { GoalRightPanel } from '@/components/goals/GoalRightPanel'
import { GoalFormData } from '@/components/goals/GoalFormContent'

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
  hasSubGoals?: boolean
  subGoals?: Goal[]
  hasMetric?: boolean
  metricName?: string
  startValue?: number
  targetValue?: number
  currentValue?: number
  description?: string
  parentGoalId?: string
}

const statusColors = {
  pending: 'bg-gray-50 text-gray-700 border-gray-200',
  on_track: 'bg-blue-50 text-blue-700 border-blue-200',
  difficult: 'bg-orange-50 text-orange-700 border-orange-200',
  completed: 'bg-green-50 text-green-700 border-green-200',
  stopped: 'bg-red-50 text-red-700 border-red-200'
}

const statusText = {
  pending: '대기',
  on_track: '순항',
  difficult: '난항',
  completed: '완료',
  stopped: '중단'
}

export default function GoalsPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [selectedCycle, setSelectedCycle] = useState('all')
  const [activeTab, setActiveTab] = useState('all')
  const [sortBy, setSortBy] = useState('latest')
  const [isGoalFormOpen, setIsGoalFormOpen] = useState(false)
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null)
  const [editingGoal, setEditingGoal] = useState<GoalFormData | null>(null)
  const [isCycleManagementOpen, setIsCycleManagementOpen] = useState(false)
  const [parentGoal, setParentGoal] = useState<{ id: string; title: string } | null>(null)
  const [mockGoals, setMockGoals] = useState<Goal[]>([])
  const [cycles, setCycles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [collapsedGoals, setCollapsedGoals] = useState<Set<string>>(new Set())
  const [isSearchDropdownOpen, setIsSearchDropdownOpen] = useState(false)

  // Right Panel Context
  const { open, close, setContent } = useRightPanel()

  // 삭제 확인 모달 상태
  const [deleteDialog, setDeleteDialog] = useState<{
    isOpen: boolean
    goalId: string | null
    goalTitle: string
    isLoading: boolean
  }>({
    isOpen: false,
    goalId: null,
    goalTitle: '',
    isLoading: false
  })

  // DB에서 목표 데이터 로드
  const loadGoals = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/goals')
      if (response.ok) {
        const data = await response.json()
        const transformedGoals = data.map((goal: any) => {
          let progress = 0
          if (goal.metric_name && goal.start_value !== null && goal.target_value !== null && goal.current_value !== null) {
            const startValue = parseFloat(goal.start_value)
            const targetValue = parseFloat(goal.target_value)
            const currentValue = parseFloat(goal.current_value)

            if (targetValue > startValue) {
              progress = Math.min(100, Math.max(0, ((currentValue - startValue) / (targetValue - startValue)) * 100))
            } else if (targetValue < startValue) {
              progress = Math.min(100, Math.max(0, ((startValue - currentValue) / (startValue - targetValue)) * 100))
            } else {
              progress = currentValue >= targetValue ? 100 : 0
            }
          }

          return {
            id: goal.id,
            title: goal.title,
            status: goal.status,
            progress: Math.round(progress),
            organization: goal.organization,
            assignee: goal.assignee,
            period: `${goal.start_date} ~ ${goal.end_date}`,
            cycle: goal.cycle_id,
            keyword: goal.keyword,
            hasMetric: !!goal.metric_name,
            metricName: goal.metric_name,
            startValue: goal.start_value,
            targetValue: goal.target_value,
            currentValue: goal.current_value,
            description: goal.description,
            parentGoalId: goal.parent_goal_id
          }
        })
        setMockGoals(transformedGoals)
      }
    } catch (error) {
      console.error('목표 로드 오류:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  // DB에서 사이클 데이터 로드
  const loadCycles = useCallback(async () => {
    try {
      const response = await fetch('/api/goals/cycles')
      if (response.ok) {
        const data = await response.json()
        const transformedData = data.map((cycle: any) => {
          let keywords = []
          if (cycle.keywords && Array.isArray(cycle.keywords)) {
            keywords = cycle.keywords.map((keyword: any) => {
              if (typeof keyword === 'string') {
                try {
                  const parsed = JSON.parse(keyword)
                  return parsed.name ? parsed : { name: keyword, description: '' }
                } catch (e) {
                  return { name: keyword, description: '' }
                }
              }
              return (typeof keyword === 'object' && keyword.name) ? keyword : keyword
            })
          }
          return { ...cycle, keywords }
        })
        setCycles(transformedData)
        const defaultCycle = transformedData.find((cycle: any) => cycle.is_default)
        if (defaultCycle) {
          setSelectedCycle(prev => prev === 'all' ? defaultCycle.id : prev)
        }
      }
    } catch (error) {
      console.error('사이클 로드 오류:', error)
    }
  }, [])

  // 초기 데이터 로드
  useEffect(() => {
    loadGoals()
    loadCycles()
    open(); // Ensure panel is open
  }, [loadGoals, loadCycles, open])

  // 목표 추가 핸들러
  const handleCreatePost = useCallback(async (data: GoalFormData) => {
    try {
      const response = await fetch('/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (response.ok) {
        loadGoals();
        setIsGoalFormOpen(false);
        setParentGoal(null);
      }
    } catch (error) {
      console.error('Error creating goal:', error);
    }
  }, [loadGoals]);

  // 목표 수정 핸들러
  const handleEditSubmit = useCallback(async (id: string, data: GoalFormData) => {
    try {
      const response = await fetch(`/api/goals/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (response.ok) {
        loadGoals();
        setSelectedGoal(null);
      }
    } catch (error) {
      console.error('Error updating goal:', error);
    }
  }, [loadGoals]);

  // 진행률 업데이트
  const handleProgressUpdate = useCallback((goalId: string, progress: number) => {
    setMockGoals(prevGoals =>
      prevGoals.map(goal => goal.id === goalId ? { ...goal, progress } : goal)
    )
  }, [])

  // 상태 업데이트
  const handleStatusUpdate = useCallback((goalId: string, status: string) => {
    setMockGoals(prevGoals =>
      prevGoals.map(goal => goal.id === goalId ? { ...goal, status: status as GoalStatus } : goal)
    )
  }, [])

  // 삭제 실행
  const handleDeleteGoal = useCallback(async (goalId: string) => {
    setDeleteDialog(prev => ({ ...prev, isLoading: true }))
    try {
      const response = await fetch(`/api/goals/${goalId}`, { method: 'DELETE' })
      if (response.ok) {
        setMockGoals(prevGoals => prevGoals.filter(goal => goal.id !== goalId))
        setDeleteDialog(prev => ({ ...prev, isOpen: false, isLoading: false }))
        if (selectedGoal?.id === goalId) setSelectedGoal(null)
      } else {
        alert('삭제 실패')
      }
    } catch (error) {
      console.error(error)
    } finally {
      setDeleteDialog(prev => ({ ...prev, isLoading: false }))
    }
  }, [selectedGoal])

  const openDeleteDialog = useCallback((goalId: string, goalTitle: string) => {
    setDeleteDialog({ isOpen: true, goalId, goalTitle, isLoading: false })
  }, [])

  const closeDeleteDialog = useCallback(() => {
    setDeleteDialog(prev => ({ ...prev, isOpen: false }))
  }, [])

  const filteredGoals = useMemo(() => {
    const allFiltered = mockGoals.filter(goal => {
      const matchesSearch = goal.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        goal.assignee.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesStatus = selectedStatus === 'all' || goal.status === selectedStatus
      const matchesCycle = selectedCycle === 'all' || goal.cycle === selectedCycle

      let matchesTab = true
      if (activeTab === 'keyword') matchesTab = goal.organization === '키워드'
      else if (activeTab === 'common') matchesTab = goal.organization === '공통'
      else if (activeTab === 'individual') matchesTab = goal.organization === '개인'

      return matchesSearch && matchesStatus && matchesCycle && matchesTab
    })

    const parents = allFiltered.filter(g => !g.parentGoalId)
    const subs = allFiltered.filter(g => g.parentGoalId)

    return parents.map(p => ({
      ...p,
      hasSubGoals: subs.some(s => s.parentGoalId === p.id),
      subGoals: subs.filter(s => s.parentGoalId === p.id)
    }))
  }, [mockGoals, searchTerm, selectedStatus, selectedCycle, activeTab])

  const currentCycle = useMemo(() => cycles.find(c => c.id === selectedCycle) || cycles.find(c => c.is_default), [cycles, selectedCycle])

  // 우측 패널 연동
  useEffect(() => {
    setContent(
      <GoalRightPanel
        selectedGoal={selectedGoal}
        onCloseGoal={() => setSelectedGoal(null)}
        onCreateGoal={handleCreatePost}
        onUpdateGoal={handleEditSubmit}
        onUpdateProgress={handleProgressUpdate}
        onUpdateStatus={handleStatusUpdate}
        onDeleteGoal={(id) => {
          const goal = mockGoals.find(g => g.id === id);
          if (goal) openDeleteDialog(id, goal.title);
        }}
        onAddSubGoal={(parent) => {
          setSelectedGoal(parent); // 상세 뷰 유지하며 폼 진입은 패널 내부 상태로 처리됨
        }}
      />
    )
  }, [selectedGoal, handleCreatePost, handleEditSubmit, handleProgressUpdate, handleStatusUpdate, mockGoals, openDeleteDialog, setContent]);

  const toggleCollapse = (id: string) => {
    setCollapsedGoals(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-1.5 h-6 bg-primary rounded-full"></div>
        <h1 className="text-2xl font-bold text-gray-900">목표 관리</h1>
      </div>

      {currentCycle && (
        <Card className="border border-gray-200 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Target className="w-5 h-5 text-blue-600" />
                <Select value={selectedCycle} onValueChange={setSelectedCycle}>
                  <SelectTrigger className="w-auto border-none shadow-none font-semibold text-lg">
                    <SelectValue placeholder="사이클 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">전체 사이클</SelectItem>
                    {cycles.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name} ({c.start_date} ~ {c.end_date})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4 h-11 bg-gray-100/50 p-1">
          <TabsTrigger value="all">전체</TabsTrigger>
          <TabsTrigger value="keyword">키워드</TabsTrigger>
          <TabsTrigger value="common">공통</TabsTrigger>
          <TabsTrigger value="individual">개인</TabsTrigger>
        </TabsList>

        <Card className="mt-4 overflow-hidden border-gray-200">
          <Table>
            <TableHeader className="bg-gray-50/50">
              <TableRow>
                <TableHead className="w-[40%]">목표</TableHead>
                <TableHead>상태</TableHead>
                <TableHead>진행률</TableHead>
                <TableHead>담당자</TableHead>
                <TableHead>기간</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-10 text-slate-500">데이터를 불러오는 중...</TableCell></TableRow>
              ) : filteredGoals.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-10 text-slate-500">등록된 목표가 없습니다.</TableCell></TableRow>
              ) : filteredGoals.map(goal => (
                <React.Fragment key={goal.id}>
                  <TableRow className="group transition-colors">
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {goal.hasSubGoals && (
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => toggleCollapse(goal.id)}>
                            {collapsedGoals.has(goal.id) ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </Button>
                        )}
                        {!goal.hasSubGoals && <div className="w-6" />}
                        <button onClick={() => setSelectedGoal(goal)} className="font-semibold hover:text-primary transition-colors text-left uppercase text-sm">
                          {goal.title}
                        </button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={`${statusColors[goal.status]} rounded-full border px-2.5 py-0.5 text-[11px] font-bold uppercase`}>
                        {statusText[goal.status]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-primary" style={{ width: `${goal.progress}%` }} />
                        </div>
                        <span className="text-[11px] font-bold text-slate-500">{goal.progress}%</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm font-medium text-slate-600">{goal.assignee}</TableCell>
                    <TableCell className="text-[11px] font-medium text-slate-400">{goal.period}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="w-4 h-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => { setParentGoal({ id: goal.id, title: goal.title }); setIsGoalFormOpen(true); }}><Plus className="w-4 h-4 mr-2" /> 하위 목표</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openDeleteDialog(goal.id, goal.title)} className="text-red-500"><Trash2 className="w-4 h-4 mr-2" /> 삭제</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                  {!collapsedGoals.has(goal.id) && goal.subGoals?.map(sub => (
                    <TableRow key={sub.id} className="bg-slate-50/30 group">
                      <TableCell className="pl-10">
                        <button onClick={() => setSelectedGoal(sub)} className="text-sm font-medium hover:text-primary transition-colors text-left">
                          {sub.title}
                        </button>
                      </TableCell>
                      <TableCell><Badge variant="outline" className="text-[10px] uppercase font-bold px-2 py-0">{statusText[sub.status]}</Badge></TableCell>
                      <TableCell><span className="text-[10px] font-bold text-slate-400">{sub.progress}%</span></TableCell>
                      <TableCell className="text-xs text-slate-500">{sub.assignee}</TableCell>
                      <TableCell className="text-[10px] text-slate-400">{sub.period}</TableCell>
                      <TableCell />
                    </TableRow>
                  ))}
                </React.Fragment>
              ))}
            </TableBody>
          </Table>
        </Card>
      </Tabs>

      <DeleteConfirmDialog
        isOpen={deleteDialog.isOpen}
        onClose={closeDeleteDialog}
        onConfirm={() => deleteDialog.goalId && handleDeleteGoal(deleteDialog.goalId)}
        title={deleteDialog.goalTitle}
        isLoading={deleteDialog.isLoading}
      />
    </div>
  )
}