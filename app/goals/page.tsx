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
import { GoalForm, GoalFormData } from '@/components/goals/GoalForm'
import { GoalDetail } from '@/components/goals/GoalDetail'
import { CycleManagementDialog } from '@/components/goals/CycleManagementDialog'

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

const initialMockGoals: Goal[] = [
  {
    id: '550e8400-e29b-41d4-a716-446655440101',
    title: '고객 만족도 평균 5점 달성',
    status: 'on_track',
    progress: 75,
    organization: '개인',
    assignee: '김철수',
    period: '2025-01-01 ~ 2025-12-31',
    cycle: '550e8400-e29b-41d4-a716-446655440001',
    hasSubGoals: true,
    hasMetric: true,
    metricName: '고객 만족도',
    startValue: 3.2,
    targetValue: 5.0,
    currentValue: 4.1,
    description: '고객 서비스 품질을 향상시켜 평균 만족도를 5점으로 달성합니다.',
    subGoals: [
      {
        id: '550e8400-e29b-41d4-a716-446655440102',
        title: '고객 피드백 시스템 구축',
        status: 'completed',
        progress: 100,
        organization: '개인',
        assignee: '김철수',
        period: '2025-01-01 ~ 2025-06-30',
        cycle: '550e8400-e29b-41d4-a716-446655440001',
        hasMetric: true,
        metricName: '시스템 구축률',
        startValue: 0,
        targetValue: 100,
        currentValue: 100,
        description: '고객 피드백을 수집하고 분석할 수 있는 시스템을 구축합니다.'
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440103',
        title: '고객 서비스 교육 프로그램 개발',
        status: 'on_track',
        progress: 60,
        organization: '개인',
        assignee: '김철수',
        period: '2025-03-01 ~ 2025-08-31',
        cycle: '550e8400-e29b-41d4-a716-446655440001',
        hasMetric: true,
        metricName: '교육 완료율',
        startValue: 0,
        targetValue: 100,
        currentValue: 60,
        description: '고객 서비스 담당자를 위한 교육 프로그램을 개발하고 실행합니다.'
      }
    ]
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440104',
    title: '매출 20% 증가',
    status: 'difficult',
    progress: 45,
    organization: '키워드',
    keyword: '효율',
    assignee: '팀 전체',
    period: '2025-01-01 ~ 2025-12-31',
    cycle: '550e8400-e29b-41d4-a716-446655440001',
    hasMetric: true,
    metricName: '매출 증가율',
    startValue: 0,
    targetValue: 20,
    currentValue: 9,
    description: '영업 효율성을 높여 전체 매출을 20% 증가시킵니다.'
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440105',
    title: '신제품 출시',
    status: 'pending',
    progress: 0,
    organization: '공통',
    assignee: '이영희',
    period: '2025-03-01 ~ 2025-08-31',
    cycle: '550e8400-e29b-41d4-a716-446655440001',
    hasMetric: true,
    metricName: '출시 준비도',
    startValue: 0,
    targetValue: 100,
    currentValue: 15,
    description: '새로운 제품을 성공적으로 출시합니다.'
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440106',
    title: '직원 만족도 향상',
    status: 'on_track',
    progress: 80,
    organization: '공통',
    assignee: '인사팀',
    period: '2025-01-01 ~ 2025-12-31',
    cycle: '550e8400-e29b-41d4-a716-446655440001',
    hasMetric: true,
    metricName: '직원 만족도',
    startValue: 3.5,
    targetValue: 4.5,
    currentValue: 4.2,
    description: '직원들의 업무 만족도를 향상시켜 이직률을 낮춥니다.'
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440107',
    title: '디지털 마케팅 전략 수립',
    status: 'completed',
    progress: 100,
    organization: '키워드',
    keyword: '혁신',
    assignee: '마케팅팀',
    period: '2025-01-01 ~ 2025-06-30',
    cycle: '550e8400-e29b-41d4-a716-446655440001',
    hasMetric: true,
    metricName: '전략 수립 완료도',
    startValue: 0,
    targetValue: 100,
    currentValue: 100,
    description: '디지털 환경에 맞는 새로운 마케팅 전략을 수립합니다.'
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440108',
    title: '팀 빌딩 워크샵 진행',
    status: 'pending',
    progress: 0,
    organization: '공통',
    assignee: '인사팀',
    period: '2025-04-01 ~ 2025-04-30',
    cycle: '550e8400-e29b-41d4-a716-446655440001',
    hasMetric: false,
    description: '팀원 간 소통과 협력을 강화하기 위한 워크샵을 진행합니다.'
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440109',
    title: '개인 스킬 개발',
    status: 'on_track',
    progress: 0,
    organization: '개인',
    assignee: '김철수',
    period: '2025-01-01 ~ 2025-12-31',
    cycle: '550e8400-e29b-41d4-a716-446655440001',
    hasMetric: false,
    description: '업무에 필요한 새로운 스킬을 학습하고 개발합니다.'
  }
]

export default function GoalsPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [selectedCycle, setSelectedCycle] = useState('all') // 기본값은 '전체'
  const [activeTab, setActiveTab] = useState('all')
  const [sortBy, setSortBy] = useState('latest')
  const [isGoalFormOpen, setIsGoalFormOpen] = useState(false)
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [editingGoal, setEditingGoal] = useState<GoalFormData | null>(null)
  const [isCycleManagementOpen, setIsCycleManagementOpen] = useState(false)
  const [parentGoal, setParentGoal] = useState<{ id: string; title: string } | null>(null)
  const [mockGoals, setMockGoals] = useState<Goal[]>([])
  const [cycles, setCycles] = useState<any[]>([])

  // cycles 배열을 메모이제이션하여 불필요한 리렌더링 방지
  const memoizedCycles = useMemo(() => cycles, [cycles])
  const [loading, setLoading] = useState(true)
  const [collapsedGoals, setCollapsedGoals] = useState<Set<string>>(new Set())
  
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
        // DB 데이터를 프론트엔드 형식으로 변환
        const transformedGoals = data.map((goal: any) => {
          // 진행률 계산
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
        
        // 키워드 데이터 변환
        const transformedData = data.map((cycle: any) => {
          let keywords = []
          if (cycle.keywords && Array.isArray(cycle.keywords)) {
            keywords = cycle.keywords.map((keyword: any) => {
              // JSON 문자열인 경우 파싱
              if (typeof keyword === 'string') {
                try {
                  const parsed = JSON.parse(keyword)
                  if (parsed.name) {
                    return parsed
                  }
                } catch (e) {
                  // 파싱 실패 시 단순 문자열로 처리
                  return { name: keyword, description: '' }
                }
              }
              // 이미 객체 형태인 경우
              if (typeof keyword === 'object' && keyword.name) {
                return keyword
              }
              return keyword
            })
          }
          
          return {
            ...cycle,
            keywords: keywords
          }
        })
        
        setCycles(transformedData)
        
        // 기본 사이클이 있으면 자동 선택 (의존성 배열에서 selectedCycle 제거)
        const defaultCycle = transformedData.find((cycle: any) => cycle.is_default)
        if (defaultCycle) {
          setSelectedCycle(prev => prev === 'all' ? defaultCycle.id : prev)
        }
      }
    } catch (error) {
      console.error('사이클 로드 오류:', error)
    }
  }, [])

  // 페이지 로드 시 데이터 가져오기
  useEffect(() => {
    loadGoals()
    loadCycles()
  }, [loadGoals, loadCycles])

  const filteredGoals = useMemo(() => {
    // 먼저 모든 목표를 필터링
    const allGoals = mockGoals.filter(goal => {
      const matchesSearch = goal.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           goal.assignee.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesStatus = selectedStatus === 'all' || goal.status === selectedStatus
      const matchesCycle = selectedCycle === 'all' || goal.cycle === selectedCycle
      
      // 탭별 필터링
      let matchesTab = true
      if (activeTab === 'keyword') {
        matchesTab = goal.organization === '키워드'
      } else if (activeTab === 'common') {
        matchesTab = goal.organization === '공통'
      } else if (activeTab === 'individual') {
        matchesTab = goal.organization === '개인'
      }
      
      return matchesSearch && matchesStatus && matchesCycle && matchesTab
    })

    // 부모 목표와 하위 목표를 분리
    const parentGoals = allGoals.filter(goal => !goal.parentGoalId)
    const subGoals = allGoals.filter(goal => goal.parentGoalId)

    // 부모 목표에 하위 목표 추가
    const goalsWithSubGoals = parentGoals.map(parentGoal => {
      const children = subGoals.filter(subGoal => subGoal.parentGoalId === parentGoal.id)
        .map(subGoal => ({
          ...subGoal,
          // 하위 목표가 키워드 구분이고 부모 목표에 키워드가 있으면 부모의 키워드를 상속
          keyword: subGoal.organization === '키워드' && parentGoal.keyword ? parentGoal.keyword : subGoal.keyword
        }))
      return {
        ...parentGoal,
        hasSubGoals: children.length > 0,
        subGoals: children
      }
    })

    // 정렬 (단순화)
    if (sortBy === 'progress') {
      goalsWithSubGoals.sort((a, b) => b.progress - a.progress)
    } else if (sortBy === 'deadline') {
      goalsWithSubGoals.sort((a, b) => {
        try {
          const aEndDate = new Date(a.period.split('~')[1].trim())
          const bEndDate = new Date(b.period.split('~')[1].trim())
          return aEndDate.getTime() - bEndDate.getTime()
        } catch (e) {
          return 0
        }
      })
    }

    return goalsWithSubGoals
  }, [mockGoals, searchTerm, selectedStatus, selectedCycle, activeTab, sortBy])

  const handleCycleChange = useCallback((cycleId: string) => {
    setSelectedCycle(cycleId)
  }, [])

  // 현재 기본 사이클 찾기
  const currentDefaultCycle = useMemo(() => {
    return memoizedCycles.find(cycle => cycle.is_default) || memoizedCycles[0]
  }, [memoizedCycles])

  // 현재 선택된 사이클
  const currentCycle = useMemo(() => {
    return cycles.find(cycle => cycle.id === selectedCycle) || currentDefaultCycle
  }, [cycles, selectedCycle, currentDefaultCycle])

  // 현재 선택된 사이클의 키워드 목록 가져오기
  const currentCycleKeywords = useMemo(() => {
    if (selectedCycle === 'all') return []
    const cycle = memoizedCycles.find(c => c.id === selectedCycle)
    return cycle?.keywords || []
  }, [selectedCycle, memoizedCycles])

  const handleCreateSubGoal = useCallback((goal: Goal) => {
    setParentGoal({ id: goal.id, title: goal.title })
    setIsGoalFormOpen(true)
  }, [])

  const toggleCollapse = useCallback((goalId: string) => {
    setCollapsedGoals(prev => {
      const newSet = new Set(prev)
      if (newSet.has(goalId)) {
        newSet.delete(goalId)
      } else {
        newSet.add(goalId)
      }
      return newSet
    })
  }, [])

  const handleProgressUpdate = useCallback((goalId: string, progress: number) => {
    // 목표 목록에서 해당 목표의 진행률 업데이트
    setMockGoals(prevGoals => 
      prevGoals.map(goal => {
        if (goal.id === goalId) {
          return { ...goal, progress }
        }
        // 하위 목표도 확인
        if (goal.subGoals) {
          const updatedSubGoals = goal.subGoals.map(subGoal => {
            if (subGoal.id === goalId) {
              return { ...subGoal, progress }
            }
            return subGoal
          })
          return { ...goal, subGoals: updatedSubGoals }
        }
        return goal
      })
    )
    console.log('진행률 업데이트:', { goalId, progress })
  }, [])

  const handleStatusUpdate = useCallback((goalId: string, status: string) => {
    // 목표 목록에서 해당 목표의 상태 업데이트
    setMockGoals(prevGoals => 
      prevGoals.map(goal => {
        if (goal.id === goalId) {
          return { ...goal, status: status as GoalStatus }
        }
        // 하위 목표도 확인
        if (goal.subGoals) {
          const updatedSubGoals = goal.subGoals.map(subGoal => {
            if (subGoal.id === goalId) {
              return { ...subGoal, status: status as GoalStatus }
            }
            return subGoal
          })
          return { ...goal, subGoals: updatedSubGoals }
        }
        return goal
      })
    )
    console.log('상태 업데이트:', { goalId, status })
  }, [])

  // 목표 삭제 핸들러
  const handleDeleteGoal = useCallback(async (goalId: string) => {
    setDeleteDialog(prev => ({ ...prev, isLoading: true }))

    try {
      // API 호출로 목표 삭제
      const response = await fetch(`/api/goals/${goalId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        // 성공 시 목록에서 제거
        setMockGoals(prevGoals => 
          prevGoals.filter(goal => goal.id !== goalId)
        )
        console.log('목표 삭제 성공:', goalId)
        setDeleteDialog(prev => ({ ...prev, isOpen: false, isLoading: false }))
      } else {
        const errorData = await response.json()
        console.error('목표 삭제 실패:', errorData)
        alert('목표 삭제에 실패했습니다.')
        setDeleteDialog(prev => ({ ...prev, isLoading: false }))
      }
    } catch (error) {
      console.error('목표 삭제 오류:', error)
      alert('목표 삭제 중 오류가 발생했습니다.')
      setDeleteDialog(prev => ({ ...prev, isLoading: false }))
    }
  }, [])

  // 삭제 확인 모달 열기
  const openDeleteDialog = useCallback((goalId: string, goalTitle: string) => {
    setDeleteDialog({
      isOpen: true,
      goalId,
      goalTitle,
      isLoading: false
    })
  }, [])

  // 삭제 확인 모달 닫기
  const closeDeleteDialog = useCallback(() => {
    setDeleteDialog(prev => ({ ...prev, isOpen: false }))
  }, [])

  // 검색 드롭다운 상태
  const [isSearchDropdownOpen, setIsSearchDropdownOpen] = useState(false)

  return (
    <div className="space-y-6 p-6">
      {/* 헤더 - 한 줄로 합치기 */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">목표 관리</h1>
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            onClick={() => setIsCycleManagementOpen(true)}
            className="h-10 px-6"
          >
            <Settings className="w-4 h-4 mr-2" />
            사이클 관리
          </Button>
          <Button onClick={() => setIsGoalFormOpen(true)} className="h-10 px-6">
            <Plus className="w-4 h-4 mr-2" />
            목표 만들기
          </Button>
        </div>
      </div>

      {/* 현재 사이클 정보 카드 */}
      {currentCycle && (
        <Card className="border border-gray-200 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Target className="w-5 h-5 text-blue-600" />
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold text-gray-900">현재 사이클</h3>
                  <Select value={selectedCycle} onValueChange={setSelectedCycle}>
                    <SelectTrigger className="w-auto border-none shadow-none p-0 h-auto [&>svg]:hidden">
                      <SelectValue>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-600">
                            {currentCycle.name} ({currentCycle.start_date} ~ {currentCycle.end_date})
                          </span>
                          <ChevronDown className="w-4 h-4 text-gray-500" />
                        </div>
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {cycles.map((cycle) => (
                        <SelectItem key={cycle.id} value={cycle.id}>
                          <div className="flex items-center justify-between w-full">
                            <span>{cycle.name} ({cycle.start_date} ~ {cycle.end_date})</span>
                            {cycle.is_default && (
                              <Badge variant="secondary" className="ml-2 bg-blue-50 text-blue-700 border-blue-200 text-xs">
                                기본
                              </Badge>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {currentCycle.is_default && (
                <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200">
                  기본 사이클
                </Badge>
              )}
            </div>
            
            {/* 키워드 카드들 */}
            {currentCycle.keywords && currentCycle.keywords.length > 0 && (
              <div className="space-y-3">
                <Label className="text-sm font-medium text-gray-700">키워드</Label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {currentCycle.keywords.map((keyword: any, index: number) => (
                    <Card key={index} className="border border-blue-200 bg-blue-50">
                      <CardContent className="p-4">
                        <div className="font-semibold text-blue-900 text-sm mb-1">{keyword.name}</div>
                        <div className="text-blue-700 text-xs">{keyword.description}</div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}



      {/* 탭 */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-0">
        <TabsList className="grid w-full grid-cols-4 h-12">
          <TabsTrigger value="all" className="text-sm font-medium">전체</TabsTrigger>
          <TabsTrigger value="keyword" className="text-sm font-medium">키워드</TabsTrigger>
          <TabsTrigger value="common" className="text-sm font-medium">공통</TabsTrigger>
          <TabsTrigger value="individual" className="text-sm font-medium">개인</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-0 mt-0">
          <Card className="border border-gray-200 shadow-sm p-0">
            <CardContent className="p-0">
              {loading ? (
                <div className="flex items-center justify-start py-8">
                  <div className="text-gray-500">데이터를 불러오는 중...</div>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50 hover:bg-gray-50">
                      <TableHead className="font-semibold text-gray-700 py-2 rounded-tl-xl">
                        <div className="flex items-center gap-2">
                          목표
                          <DropdownMenu open={isSearchDropdownOpen} onOpenChange={setIsSearchDropdownOpen}>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                <Search className="w-3 h-3" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="w-64 p-3">
                              <div className="space-y-2">
                                <Label htmlFor="goal-search" className="text-sm font-medium">목표명 검색</Label>
                                <div className="relative">
                                  <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                  <Input
                                    id="goal-search"
                                    placeholder="목표명 입력..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-8 h-8 text-sm"
                                    autoFocus
                                  />
                                </div>
                              </div>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableHead>
                      <TableHead className="font-semibold text-gray-700 py-2">
                        <div className="flex items-center gap-2">
                          상태
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                <Filter className="w-3 h-3" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              <DropdownMenuItem onClick={() => setSelectedStatus('all')}>
                                전체
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setSelectedStatus('pending')}>
                                대기
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setSelectedStatus('on_track')}>
                                순항
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setSelectedStatus('difficult')}>
                                난항
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setSelectedStatus('completed')}>
                                완료
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setSelectedStatus('stopped')}>
                                중단
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableHead>
                      <TableHead className="font-semibold text-gray-700 py-2">진행률</TableHead>
                      <TableHead className="font-semibold text-gray-700 py-2">
                        <div className="flex items-center gap-2">
                          구분
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                <Filter className="w-3 h-3" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              <DropdownMenuItem onClick={() => setActiveTab('all')}>
                                전체
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setActiveTab('keyword')}>
                                키워드
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setActiveTab('common')}>
                                공통
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setActiveTab('individual')}>
                                개인
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableHead>
                      <TableHead className="font-semibold text-gray-700 py-2">담당자</TableHead>
                      <TableHead className="font-semibold text-gray-700 py-2">기간</TableHead>
                      <TableHead className="font-semibold text-gray-700 py-2 w-12 rounded-tr-xl text-center"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredGoals.map((goal) => (
                      <React.Fragment key={goal.id}>
                                                <TableRow className="hover:bg-gray-50 border-b border-gray-100">
                          <TableCell className="font-medium py-3">
                            <div className="flex items-center gap-2">
                              {goal.hasSubGoals ? (
                                <button
                                  onClick={() => toggleCollapse(goal.id)}
                                  className="hover:bg-gray-100 rounded transition-colors"
                                >
                                  {collapsedGoals.has(goal.id) ? (
                                    <ChevronRight className="w-4 h-4 text-gray-500" />
                                  ) : (
                                    <ChevronDown className="w-4 h-4 text-gray-500" />
                                  )}
                                </button>
                              ) : (
                                <div className="w-2 h-2 bg-gray-400 rounded-full ml-1"></div>
                              )}
                              <button
                                className="text-left hover:text-blue-600 transition-colors text-sm font-medium"
                                onClick={() => {
                                  setSelectedGoal({
                                    ...goal,
                                    status: goal.status,
                                    progress: goal.progress,
                                    organization: goal.organization,
                                    assignee: goal.assignee,
                                    period: goal.period,
                                    cycle: selectedCycle,
                                    keyword: goal.keyword
                                  })
                                  setIsDetailOpen(true)
                                }}
                              >
                                {goal.title}
                              </button>
                            </div>
                          </TableCell>
                          <TableCell className="py-3">
                            <Badge className={`${statusColors[goal.status]} text-xs font-medium px-3 py-1.5 border rounded-full text-center`}>
                              {statusText[goal.status]}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-3">
                            {goal.hasMetric ? (
                              <div className="flex items-center gap-2">
                                <div className="w-16 bg-gray-200 rounded-full h-2">
                                  <div 
                                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                    style={{ width: `${goal.progress}%` }}
                                  ></div>
                                </div>
                                <span className="text-xs text-gray-600 font-medium">{goal.progress}%</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-500">진행률 없음</span>
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="py-3">
                            {goal.organization === '키워드' && goal.keyword ? (
                              <Badge variant="secondary" className="text-xs font-medium px-3 py-1.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full text-center">
                                {goal.keyword}
                              </Badge>
                            ) : goal.organization === '키워드' ? (
                              <Badge variant="outline" className="text-xs font-medium px-3 py-1.5 border-orange-200 text-orange-700 rounded-full text-center bg-orange-50">
                                {currentCycleKeywords.length > 0 ? '키워드 선택 필요' : '사이클에 키워드 없음'}
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs font-medium px-3 py-1.5 border-slate-200 text-slate-700 rounded-full text-center bg-white">
                                {goal.organization}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="py-3 text-sm">{goal.assignee}</TableCell>
                          <TableCell className="py-3 text-sm text-gray-600">{goal.period}</TableCell>
                          <TableCell className="py-3">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent>
                                <DropdownMenuItem onClick={() => handleCreateSubGoal(goal)}>
                                  <Plus className="w-4 h-4 mr-2" />
                                  하위 목표 만들기
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => {
                                  setEditingGoal({
                                    title: goal.title,
                                    cycleId: selectedCycle,
                                    startDate: goal.period.split('~')[0].trim(),
                                    endDate: goal.period.split('~')[1].trim(),
                                    organization: goal.organization,
                                    assignee: goal.assignee,
                                    hasMetric: goal.hasMetric || false,
                                    metricName: goal.metricName || '',
                                    startValue: goal.startValue?.toString() || '',
                                    targetValue: goal.targetValue?.toString() || '',
                                    description: goal.description || '',
                                    keyword: goal.keyword,
                                    useCyclePeriod: false
                                  })
                                }}>
                                  <Edit className="w-4 h-4 mr-2" />
                                  수정
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => openDeleteDialog(goal.id, goal.title)}>
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  삭제
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                        {!collapsedGoals.has(goal.id) && goal.subGoals?.map((subGoal) => (
                          <TableRow key={subGoal.id} className="bg-gray-50 hover:bg-gray-100 border-b border-gray-100">
                            <TableCell className="font-medium py-3 pl-8">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-gray-400 rounded-full ml-1"></div>
                                <button
                                  className="text-left hover:text-blue-600 transition-colors text-sm font-medium"
                                  onClick={() => {
                                    setSelectedGoal({
                                      ...subGoal,
                                      status: subGoal.status,
                                      progress: subGoal.progress,
                                      organization: subGoal.organization,
                                      assignee: subGoal.assignee,
                                      period: subGoal.period,
                                      cycle: selectedCycle,
                                      keyword: subGoal.keyword
                                    })
                                    setIsDetailOpen(true)
                                  }}
                                >
                                  {subGoal.title}
                                </button>
                              </div>
                            </TableCell>
                            <TableCell className="py-4">
                              <Badge className={`${statusColors[subGoal.status]} text-xs font-medium px-3 py-1.5 border rounded-full text-center`}>
                                {statusText[subGoal.status]}
                              </Badge>
                            </TableCell>
                            <TableCell className="py-4">
                              {subGoal.hasMetric ? (
                                <div className="flex items-center gap-2">
                                  <div className="w-16 bg-gray-200 rounded-full h-2">
                                    <div 
                                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                      style={{ width: `${subGoal.progress}%` }}
                                    ></div>
                                  </div>
                                  <span className="text-xs text-gray-600 font-medium">{subGoal.progress}%</span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-gray-500">진행률 없음</span>
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="py-4">
                              <div className="flex justify-start">
                                {subGoal.organization === '키워드' && subGoal.keyword ? (
                                  <Badge variant="secondary" className="text-xs font-medium px-3 py-1.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full text-center">
                                    {subGoal.keyword}
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-xs font-medium px-3 py-1.5 border-slate-200 text-slate-700 rounded-full text-center bg-white">
                                    {subGoal.organization}
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="py-4 text-sm">{subGoal.assignee}</TableCell>
                            <TableCell className="py-4 text-sm text-gray-600">{subGoal.period}</TableCell>
                            <TableCell className="py-4">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                    <MoreVertical className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent>
                                  <DropdownMenuItem onClick={() => {
                                    setEditingGoal({
                                      title: subGoal.title,
                                      cycleId: selectedCycle,
                                      startDate: subGoal.period.split('~')[0].trim(),
                                      endDate: subGoal.period.split('~')[1].trim(),
                                      organization: subGoal.organization,
                                      assignee: subGoal.assignee,
                                      hasMetric: subGoal.hasMetric || false,
                                      metricName: subGoal.metricName || '',
                                      startValue: subGoal.startValue?.toString() || '',
                                      targetValue: subGoal.targetValue?.toString() || '',
                                      description: subGoal.description || '',
                                      keyword: subGoal.keyword,
                                      useCyclePeriod: false,
                                      parentGoalId: goal.id
                                    })
                                    setParentGoal({ id: goal.id, title: goal.title })
                                    setIsGoalFormOpen(true)
                                  }}>
                                    <Edit className="w-4 h-4 mr-2" />
                                    수정
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => openDeleteDialog(subGoal.id, subGoal.title)}>
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    삭제
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        ))}
                      </React.Fragment>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

                <TabsContent value="keyword" className="space-y-0 mt-0">
          <Card className="border border-gray-200 shadow-sm p-0">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50 hover:bg-gray-50">
                    <TableHead className="font-semibold text-gray-700 py-3 rounded-tl-xl">목표</TableHead>
                    <TableHead className="font-semibold text-gray-700 py-3">상태</TableHead>
                    <TableHead className="font-semibold text-gray-700 py-3">진행률</TableHead>
                    <TableHead className="font-semibold text-gray-700 py-3">구분</TableHead>
                    <TableHead className="font-semibold text-gray-700 py-3">담당자</TableHead>
                    <TableHead className="font-semibold text-gray-700 py-3">기간</TableHead>
                    <TableHead className="font-semibold text-gray-700 py-3 w-12 rounded-tr-xl text-center"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredGoals.map((goal) => (
                    <React.Fragment key={goal.id}>
                      <TableRow className="hover:bg-gray-50 border-b border-gray-100">
                        <TableCell className="font-medium py-4">
                          <div className="flex items-center gap-2">
                            {goal.hasSubGoals ? (
                              <button
                                onClick={() => toggleCollapse(goal.id)}
                                className="hover:bg-gray-100 rounded transition-colors"
                              >
                                {collapsedGoals.has(goal.id) ? (
                                  <ChevronRight className="w-4 h-4 text-gray-500" />
                                ) : (
                                  <ChevronDown className="w-4 h-4 text-gray-500" />
                                )}
                              </button>
                            ) : (
                              <div className="w-2 h-2 bg-gray-400 rounded-full ml-1"></div>
                            )}
                            <button
                              className="text-left hover:text-blue-600 transition-colors text-sm font-medium"
                              onClick={() => {
                                setSelectedGoal({
                                  ...goal,
                                  status: goal.status,
                                  progress: goal.progress,
                                  organization: goal.organization,
                                  assignee: goal.assignee,
                                  period: goal.period,
                                  cycle: selectedCycle,
                                  keyword: goal.keyword
                                })
                                setIsDetailOpen(true)
                              }}
                            >
                              {goal.title}
                            </button>
                          </div>
                        </TableCell>
                        <TableCell className="py-4">
                          <Badge className={`${statusColors[goal.status]} text-xs font-medium px-3 py-1.5 border rounded-full text-center`}>
                            {statusText[goal.status]}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-4">
                          {goal.hasMetric ? (
                            <div className="flex items-center gap-2">
                              <div className="w-16 bg-gray-200 rounded-full h-2">
                                <div 
                                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                  style={{ width: `${goal.progress}%` }}
                                ></div>
                              </div>
                              <span className="text-xs text-gray-600 font-medium">{goal.progress}%</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-500">진행률 없음</span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="py-4">
                          {goal.organization === '키워드' && goal.keyword ? (
                            <Badge variant="secondary" className="text-xs font-medium px-3 py-1.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full text-center">
                              {goal.keyword}
                            </Badge>
                          ) : goal.organization === '키워드' ? (
                            <Badge variant="outline" className="text-xs font-medium px-3 py-1.5 border-orange-200 text-orange-700 rounded-full text-center bg-orange-50">
                              {currentCycleKeywords.length > 0 ? '키워드 선택 필요' : '사이클에 키워드 없음'}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs font-medium px-3 py-1.5 border-slate-200 text-slate-700 rounded-full text-center bg-white">
                              {goal.organization}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="py-4 text-sm">{goal.assignee}</TableCell>
                        <TableCell className="py-4 text-sm text-gray-600">{goal.period}</TableCell>
                        <TableCell className="py-4">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              <DropdownMenuItem onClick={() => handleCreateSubGoal(goal)}>
                                <Plus className="w-4 h-4 mr-2" />
                                하위 목표 만들기
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => {
                                setEditingGoal({
                                  title: goal.title,
                                  cycleId: selectedCycle,
                                  startDate: goal.period.split('~')[0].trim(),
                                  endDate: goal.period.split('~')[1].trim(),
                                  organization: goal.organization,
                                  assignee: goal.assignee,
                                  hasMetric: goal.hasMetric || false,
                                  metricName: goal.metricName || '',
                                  startValue: goal.startValue?.toString() || '',
                                  targetValue: goal.targetValue?.toString() || '',
                                  description: goal.description || '',
                                  keyword: goal.keyword,
                                  useCyclePeriod: false
                                })
                              }}>
                                <Edit className="w-4 h-4 mr-2" />
                                수정
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Trash2 className="w-4 h-4 mr-2" />
                                삭제
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                                                  </DropdownMenu>
                      </TableCell>
                    </TableRow>
                    {!collapsedGoals.has(goal.id) && goal.subGoals?.map((subGoal) => (
                      <TableRow key={subGoal.id} className="bg-gray-50 hover:bg-gray-100 border-b border-gray-100">
                        <TableCell className="font-medium py-4 pl-8">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-gray-400 rounded-full ml-1"></div>
                            <button
                              className="text-left hover:text-blue-600 transition-colors text-sm font-medium"
                              onClick={() => {
                                setSelectedGoal({
                                  ...subGoal,
                                  status: subGoal.status,
                                  progress: subGoal.progress,
                                  organization: subGoal.organization,
                                  assignee: subGoal.assignee,
                                  period: subGoal.period,
                                  cycle: selectedCycle,
                                  keyword: subGoal.keyword
                                })
                                setIsDetailOpen(true)
                              }}
                            >
                              {subGoal.title}
                            </button>
                          </div>
                        </TableCell>
                        <TableCell className="py-3">
                          <Badge className={`${statusColors[subGoal.status]} text-xs font-medium px-3 py-1.5 border rounded-full text-center`}>
                            {statusText[subGoal.status]}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-3">
                          {subGoal.hasMetric ? (
                            <div className="flex items-center gap-2">
                              <div className="w-16 bg-gray-200 rounded-full h-2">
                                <div 
                                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                  style={{ width: `${subGoal.progress}%` }}
                                ></div>
                              </div>
                              <span className="text-xs text-gray-600 font-medium">{subGoal.progress}%</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-500">진행률 없음</span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="py-3">
                          {subGoal.organization === '키워드' && subGoal.keyword ? (
                            <Badge variant="secondary" className="text-xs font-medium px-3 py-1.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full text-center">
                              {subGoal.keyword}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs font-medium px-3 py-1.5 border-slate-200 text-slate-700 rounded-full text-center bg-white">
                              {subGoal.organization}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="py-3 text-sm">{subGoal.assignee}</TableCell>
                        <TableCell className="py-3 text-sm text-gray-600">{subGoal.period}</TableCell>
                        <TableCell className="py-3">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              <DropdownMenuItem onClick={() => {
                                setEditingGoal({
                                  title: subGoal.title,
                                  cycleId: selectedCycle,
                                  startDate: subGoal.period.split('~')[0].trim(),
                                  endDate: subGoal.period.split('~')[1].trim(),
                                  organization: subGoal.organization,
                                  assignee: subGoal.assignee,
                                  hasMetric: subGoal.hasMetric || false,
                                  metricName: subGoal.metricName || '',
                                  startValue: subGoal.startValue?.toString() || '',
                                  targetValue: subGoal.targetValue?.toString() || '',
                                  description: subGoal.description || '',
                                  keyword: subGoal.keyword,
                                  useCyclePeriod: false,
                                  parentGoalId: goal.id
                                })
                                setParentGoal({ id: goal.id, title: goal.title })
                                setIsGoalFormOpen(true)
                              }}>
                                <Edit className="w-4 h-4 mr-2" />
                                수정
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openDeleteDialog(subGoal.id, subGoal.title)}>
                                <Trash2 className="w-4 h-4 mr-2" />
                                삭제
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </React.Fragment>
                ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

                <TabsContent value="common" className="space-y-0 mt-0">
          <Card className="border border-gray-200 shadow-sm p-0">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50 hover:bg-gray-50">
                    <TableHead className="font-semibold text-gray-700 py-3 rounded-tl-xl">목표</TableHead>
                    <TableHead className="font-semibold text-gray-700 py-3">상태</TableHead>
                    <TableHead className="font-semibold text-gray-700 py-3">진행률</TableHead>
                    <TableHead className="font-semibold text-gray-700 py-3">구분</TableHead>
                    <TableHead className="font-semibold text-gray-700 py-3">담당자</TableHead>
                    <TableHead className="font-semibold text-gray-700 py-3">기간</TableHead>
                    <TableHead className="font-semibold text-gray-700 py-3 w-12 rounded-tr-xl text-center"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredGoals.map((goal) => (
                    <React.Fragment key={goal.id}>
                      <TableRow className="hover:bg-gray-50 border-b border-gray-100">
                        <TableCell className="font-medium py-4">
                          <div className="flex items-center gap-2">
                            {goal.hasSubGoals ? (
                              <button
                                onClick={() => toggleCollapse(goal.id)}
                                className="hover:bg-gray-100 rounded transition-colors"
                              >
                                {collapsedGoals.has(goal.id) ? (
                                  <ChevronRight className="w-4 h-4 text-gray-500" />
                                ) : (
                                  <ChevronDown className="w-4 h-4 text-gray-500" />
                                )}
                              </button>
                            ) : (
                              <div className="w-2 h-2 bg-gray-400 rounded-full ml-1"></div>
                            )}
                          <button
                            className="text-left hover:text-blue-600 transition-colors text-sm font-medium"
                            onClick={() => {
                              setSelectedGoal({
                                ...goal,
                                status: goal.status,
                                progress: goal.progress,
                                organization: goal.organization,
                                assignee: goal.assignee,
                                period: goal.period,
                                cycle: selectedCycle,
                                keyword: goal.keyword
                              })
                              setIsDetailOpen(true)
                            }}
                          >
                            {goal.title}
                          </button>
                        </div>
                      </TableCell>
                      <TableCell className="py-4">
                        <Badge className={`${statusColors[goal.status]} text-xs font-medium px-3 py-1.5 border rounded-full text-center`}>
                          {statusText[goal.status]}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-4">
                        {goal.hasMetric ? (
                          <div className="flex items-center gap-2">
                            <div className="w-16 bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${goal.progress}%` }}
                              ></div>
                            </div>
                            <span className="text-xs text-gray-600 font-medium">{goal.progress}%</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500">진행률 없음</span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="py-4">
                        <div className="flex justify-start">
                          {goal.organization === '키워드' && goal.keyword ? (
                            <Badge variant="secondary" className="text-xs font-medium px-3 py-1.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full text-center">
                              {goal.keyword}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs font-medium px-3 py-1.5 border-slate-200 text-slate-700 rounded-full text-center bg-white">
                              {goal.organization}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="py-4 text-sm">{goal.assignee}</TableCell>
                      <TableCell className="py-4 text-sm text-gray-600">{goal.period}</TableCell>
                      <TableCell className="py-4">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem onClick={() => handleCreateSubGoal(goal)}>
                              <Plus className="w-4 h-4 mr-2" />
                              하위 목표 만들기
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => {
                              setEditingGoal({
                                title: goal.title,
                                cycleId: selectedCycle,
                                startDate: goal.period.split('~')[0].trim(),
                                endDate: goal.period.split('~')[1].trim(),
                                organization: goal.organization,
                                assignee: goal.assignee,
                                hasMetric: goal.hasMetric || false,
                                metricName: goal.metricName || '',
                                startValue: goal.startValue?.toString() || '',
                                targetValue: goal.targetValue?.toString() || '',
                                description: goal.description || '',
                                keyword: goal.keyword,
                                useCyclePeriod: false
                              })
                            }}>
                              <Edit className="w-4 h-4 mr-2" />
                              수정
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Trash2 className="w-4 h-4 mr-2" />
                              삭제
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                    {!collapsedGoals.has(goal.id) && goal.subGoals?.map((subGoal) => (
                      <TableRow key={subGoal.id} className="bg-gray-50 hover:bg-gray-100 border-b border-gray-100">
                        <TableCell className="font-medium py-4 pl-8">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-gray-400 rounded-full ml-1"></div>
                            <button
                              className="text-left hover:text-blue-600 transition-colors text-sm font-medium"
                              onClick={() => {
                                setSelectedGoal({
                                  ...subGoal,
                                  status: subGoal.status,
                                  progress: subGoal.progress,
                                  organization: subGoal.organization,
                                  assignee: subGoal.assignee,
                                  period: subGoal.period,
                                  cycle: selectedCycle,
                                  keyword: subGoal.keyword
                                })
                                setIsDetailOpen(true)
                              }}
                            >
                              {subGoal.title}
                            </button>
                          </div>
                        </TableCell>
                        <TableCell className="py-3">
                          <Badge className={`${statusColors[subGoal.status]} text-xs font-medium px-3 py-1.5 border rounded-full text-center`}>
                            {statusText[subGoal.status]}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-3">
                          {subGoal.hasMetric ? (
                            <div className="flex items-center gap-2">
                              <div className="w-16 bg-gray-200 rounded-full h-2">
                                <div 
                                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                  style={{ width: `${subGoal.progress}%` }}
                                ></div>
                              </div>
                              <span className="text-xs text-gray-600 font-medium">{subGoal.progress}%</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-500">진행률 없음</span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="py-3">
                          <div className="flex justify-start">
                            {subGoal.organization === '키워드' && subGoal.keyword ? (
                              <Badge variant="secondary" className="text-xs font-medium px-3 py-1.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full text-center">
                                {subGoal.keyword}
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs font-medium px-3 py-1.5 border-slate-200 text-slate-700 rounded-full text-center bg-white">
                                {subGoal.organization}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="py-3 text-sm">{subGoal.assignee}</TableCell>
                        <TableCell className="py-3 text-sm text-gray-600">{subGoal.period}</TableCell>
                        <TableCell className="py-3">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              <DropdownMenuItem onClick={() => {
                                setEditingGoal({
                                  title: subGoal.title,
                                  cycleId: selectedCycle,
                                  startDate: subGoal.period.split('~')[0].trim(),
                                  endDate: subGoal.period.split('~')[1].trim(),
                                  organization: subGoal.organization,
                                  assignee: subGoal.assignee,
                                  hasMetric: subGoal.hasMetric || false,
                                  metricName: subGoal.metricName || '',
                                  startValue: subGoal.startValue?.toString() || '',
                                  targetValue: subGoal.targetValue?.toString() || '',
                                  description: subGoal.description || '',
                                  keyword: subGoal.keyword,
                                  useCyclePeriod: false,
                                  parentGoalId: goal.id
                                })
                                setParentGoal({ id: goal.id, title: goal.title })
                                setIsGoalFormOpen(true)
                              }}>
                                <Edit className="w-4 h-4 mr-2" />
                                수정
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openDeleteDialog(subGoal.id, subGoal.title)}>
                                <Trash2 className="w-4 h-4 mr-2" />
                                삭제
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                    </React.Fragment>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

                <TabsContent value="individual" className="space-y-0 mt-0">
          <Card className="border border-gray-200 shadow-sm p-0">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50 hover:bg-gray-50">
                    <TableHead className="font-semibold text-gray-700 py-3 rounded-tl-xl">목표</TableHead>
                    <TableHead className="font-semibold text-gray-700 py-3">상태</TableHead>
                    <TableHead className="font-semibold text-gray-700 py-3">진행률</TableHead>
                    <TableHead className="font-semibold text-gray-700 py-3">구분</TableHead>
                    <TableHead className="font-semibold text-gray-700 py-3">담당자</TableHead>
                    <TableHead className="font-semibold text-gray-700 py-3">기간</TableHead>
                    <TableHead className="font-semibold text-gray-700 py-3 w-12 rounded-tr-xl text-center"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredGoals.map((goal) => (
                    <React.Fragment key={goal.id}>
                      <TableRow className="hover:bg-gray-50 border-b border-gray-100">
                        <TableCell className="font-medium py-4">
                          <div className="flex items-center gap-2">
                            {goal.hasSubGoals ? (
                              <button
                                onClick={() => toggleCollapse(goal.id)}
                                className="hover:bg-gray-100 rounded transition-colors"
                              >
                                {collapsedGoals.has(goal.id) ? (
                                  <ChevronRight className="w-4 h-4 text-gray-500" />
                                ) : (
                                  <ChevronDown className="w-4 h-4 text-gray-500" />
                                )}
                              </button>
                            ) : (
                              <div className="w-2 h-2 bg-gray-400 rounded-full ml-1"></div>
                            )}
                          <button
                            className="text-left hover:text-blue-600 transition-colors text-sm font-medium"
                            onClick={() => {
                              setSelectedGoal({
                                ...goal,
                                status: goal.status,
                                progress: goal.progress,
                                organization: goal.organization,
                                assignee: goal.assignee,
                                period: goal.period,
                                cycle: selectedCycle,
                                keyword: goal.keyword
                              })
                              setIsDetailOpen(true)
                            }}
                          >
                            {goal.title}
                          </button>
                        </div>
                      </TableCell>
                      <TableCell className="py-4">
                        <Badge className={`${statusColors[goal.status]} text-xs font-medium px-3 py-1.5 border rounded-full text-center`}>
                          {statusText[goal.status]}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-4">
                        {goal.hasMetric ? (
                          <div className="flex items-center gap-2">
                            <div className="w-16 bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${goal.progress}%` }}
                              ></div>
                            </div>
                            <span className="text-xs text-gray-600 font-medium">{goal.progress}%</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500">진행률 없음</span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="py-4">
                        <div className="flex justify-start">
                          {goal.organization === '키워드' && goal.keyword ? (
                            <Badge variant="secondary" className="text-xs font-medium px-3 py-1.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full text-center">
                              {goal.keyword}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs font-medium px-3 py-1.5 border-slate-200 text-slate-700 rounded-full text-center bg-white">
                              {goal.organization}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="py-4 text-sm">{goal.assignee}</TableCell>
                      <TableCell className="py-4 text-sm text-gray-600">{goal.period}</TableCell>
                      <TableCell className="py-4">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem onClick={() => handleCreateSubGoal(goal)}>
                              <Plus className="w-4 h-4 mr-2" />
                              하위 목표 만들기
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => {
                              setEditingGoal({
                                title: goal.title,
                                cycleId: selectedCycle,
                                startDate: goal.period.split('~')[0].trim(),
                                endDate: goal.period.split('~')[1].trim(),
                                organization: goal.organization,
                                assignee: goal.assignee,
                                hasMetric: goal.hasMetric || false,
                                metricName: goal.metricName || '',
                                startValue: goal.startValue?.toString() || '',
                                targetValue: goal.targetValue?.toString() || '',
                                description: goal.description || '',
                                keyword: goal.keyword,
                                useCyclePeriod: false
                              })
                            }}>
                              <Edit className="w-4 h-4 mr-2" />
                              수정
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Trash2 className="w-4 h-4 mr-2" />
                              삭제
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                    {!collapsedGoals.has(goal.id) && goal.subGoals?.map((subGoal) => (
                      <TableRow key={subGoal.id} className="bg-gray-50 hover:bg-gray-100 border-b border-gray-100">
                        <TableCell className="font-medium py-4 pl-8">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-gray-400 rounded-full ml-1"></div>
                            <button
                              className="text-left hover:text-blue-600 transition-colors text-sm font-medium"
                              onClick={() => {
                                setSelectedGoal({
                                  ...subGoal,
                                  status: subGoal.status,
                                  progress: subGoal.progress,
                                  organization: subGoal.organization,
                                  assignee: subGoal.assignee,
                                  period: subGoal.period,
                                  cycle: selectedCycle,
                                  keyword: subGoal.keyword
                                })
                                setIsDetailOpen(true)
                              }}
                            >
                              {subGoal.title}
                            </button>
                          </div>
                        </TableCell>
                        <TableCell className="py-3">
                          <Badge className={`${statusColors[subGoal.status]} text-xs font-medium px-3 py-1.5 border rounded-full text-center`}>
                            {statusText[subGoal.status]}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-3">
                          {subGoal.hasMetric ? (
                            <div className="flex items-center gap-2">
                              <div className="w-16 bg-gray-200 rounded-full h-2">
                                <div 
                                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                  style={{ width: `${subGoal.progress}%` }}
                                ></div>
                              </div>
                              <span className="text-xs text-gray-600 font-medium">{subGoal.progress}%</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-500">진행률 없음</span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="py-3">
                          <div className="flex justify-start">
                            {subGoal.organization === '키워드' && subGoal.keyword ? (
                              <Badge variant="secondary" className="text-xs font-medium px-3 py-1.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full text-center">
                                {subGoal.keyword}
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs font-medium px-3 py-1.5 border-slate-200 text-slate-700 rounded-full text-center bg-white">
                                {subGoal.organization}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="py-3 text-sm">{subGoal.assignee}</TableCell>
                        <TableCell className="py-3 text-sm text-gray-600">{subGoal.period}</TableCell>
                        <TableCell className="py-3">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              <DropdownMenuItem onClick={() => {
                                setEditingGoal({
                                  title: subGoal.title,
                                  cycleId: selectedCycle,
                                  startDate: subGoal.period.split('~')[0].trim(),
                                  endDate: subGoal.period.split('~')[1].trim(),
                                  organization: subGoal.organization,
                                  assignee: subGoal.assignee,
                                  hasMetric: subGoal.hasMetric || false,
                                  metricName: subGoal.metricName || '',
                                  startValue: subGoal.startValue?.toString() || '',
                                  targetValue: subGoal.targetValue?.toString() || '',
                                  description: subGoal.description || '',
                                  keyword: subGoal.keyword,
                                  useCyclePeriod: false,
                                  parentGoalId: goal.id
                                })
                                setParentGoal({ id: goal.id, title: goal.title })
                                setIsGoalFormOpen(true)
                              }}>
                                <Edit className="w-4 h-4 mr-2" />
                                수정
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openDeleteDialog(subGoal.id, subGoal.title)}>
                                <Trash2 className="w-4 h-4 mr-2" />
                                삭제
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                    </React.Fragment>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 목표 생성/수정 폼 */}
      <GoalForm
        isOpen={isGoalFormOpen || editingGoal !== null}
        onClose={() => {
          setIsGoalFormOpen(false)
          setEditingGoal(null)
          setParentGoal(null)
        }}
        initialData={editingGoal || undefined}
        parentGoal={parentGoal || undefined}
        onSubmit={(goalData) => {
          if (editingGoal) {
            console.log('목표 수정:', goalData)
            // TODO: API 호출로 목표 수정
          } else {
            console.log('새 목표 생성:', goalData)
            // 새 목표를 목록에 추가
            const newGoal: Goal = {
              id: Date.now().toString(),
              title: goalData.title,
              status: 'pending',
              progress: 0,
              organization: goalData.organization,
              assignee: goalData.assignee,
              period: `${goalData.startDate} ~ ${goalData.endDate}`,
              cycle: goalData.cycleId,
              keyword: goalData.keyword,
              hasMetric: goalData.hasMetric,
              metricName: goalData.metricName,
              startValue: goalData.startValue ? parseFloat(goalData.startValue) : undefined,
              targetValue: goalData.targetValue ? parseFloat(goalData.targetValue) : undefined,
              currentValue: 0,
              description: goalData.description,
              parentGoalId: goalData.parentGoalId
            }
            setMockGoals(prev => [newGoal, ...prev])
          }
          setEditingGoal(null)
          setParentGoal(null)
        }}
      />

      {/* 목표 상세 패널 */}
      <GoalDetail
        goal={selectedGoal}
        isOpen={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false)
          setSelectedGoal(null)
        }}
        onProgressUpdate={handleProgressUpdate}
        onStatusUpdate={handleStatusUpdate}
      />

      {/* 사이클 관리 다이얼로그 */}
      <CycleManagementDialog
        isOpen={isCycleManagementOpen}
        onClose={() => setIsCycleManagementOpen(false)}
        onCycleChange={handleCycleChange}
        onDefaultCycleChange={() => {
          // 기본 사이클이 변경되면 사이클 데이터를 다시 로드하고 기본 사이클 선택
          loadCycles().then(() => {
            const defaultCycle = cycles.find(cycle => cycle.is_default)
            if (defaultCycle) {
              setSelectedCycle(defaultCycle.id)
            }
          })
        }}
      />

      {/* 삭제 확인 모달 */}
      <DeleteConfirmDialog
        isOpen={deleteDialog.isOpen}
        onClose={closeDeleteDialog}
        onConfirm={() => {
          if (deleteDialog.goalId) {
            handleDeleteGoal(deleteDialog.goalId)
          }
        }}
        title={`"${deleteDialog.goalTitle}" 삭제`}
        description="이 목표를 삭제하면 하위 목표도 함께 삭제됩니다. 이 작업은 되돌릴 수 없습니다."
        isLoading={deleteDialog.isLoading}
      />


    </div>
  )
}