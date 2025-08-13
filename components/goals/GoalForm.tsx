"use client"

import React, { useState, useEffect } from 'react'
import { X, Calendar, Users, Target, BarChart3 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
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

interface GoalFormProps {
  isOpen: boolean
  onClose: () => void
  initialData?: GoalFormData
  onSubmit: (data: GoalFormData) => void
  parentGoal?: { id: string; title: string }
}

const mockCycles = [
  { 
    id: '550e8400-e29b-41d4-a716-446655440001', 
    name: '25년 하반기', 
    keywords: [
      { name: '효율', description: '업무 효율성 향상과 프로세스 최적화' },
      { name: '혁신', description: '새로운 아이디어와 기술 도입' },
      { name: '확장', description: '비즈니스 규모 확대와 시장 진출' }
    ], 
    startDate: '2025-07-01', 
    endDate: '2025-12-31', 
    isDefault: true 
  },
  { 
    id: '550e8400-e29b-41d4-a716-446655440002', 
    name: '기본 사이클', 
    keywords: [
      { name: '성장', description: '지속적인 성장과 발전' },
      { name: '안정', description: '안정적인 운영과 관리' }
    ], 
    startDate: '2025-01-01', 
    endDate: '2025-12-31', 
    isDefault: false 
  },
  { 
    id: '550e8400-e29b-41d4-a716-446655440003', 
    name: 'Q1 목표', 
    keywords: [
      { name: '출시', description: '신제품 출시 준비' },
      { name: '마케팅', description: '마케팅 전략 수립 및 실행' }
    ], 
    startDate: '2025-01-01', 
    endDate: '2025-03-31', 
    isDefault: false 
  }
]

const mockGoals = [
  { id: '1', title: '고객 만족도 평균 5점 달성', organization: '개인' },
  { id: '2', title: '매출 20% 증가', organization: '키워드' },
  { id: '3', title: '신제품 출시', organization: '공통' }
]

export function GoalForm({ isOpen, onClose, initialData, onSubmit, parentGoal }: GoalFormProps) {
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

  // 사이클 데이터 로드
  useEffect(() => {
    const loadCycles = async () => {
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
          
          // 기본 사이클 찾기
          const defaultCycle = transformedData.find((cycle: any) => cycle.is_default)
          
          if (initialData) {
            setFormData(initialData)
            if (initialData.cycleId) {
              const cycle = transformedData.find(c => c.id === initialData.cycleId)
              setSelectedCycle(cycle)
            }
          } else {
            setFormData({
              title: '',
              cycleId: defaultCycle?.id || '',
              startDate: defaultCycle?.start_date || '',
              endDate: defaultCycle?.end_date || '',
              organization: '개인',
              assignee: '',
              hasMetric: false,
              metricName: '',
              startValue: '',
              targetValue: '',
              description: '',
              keyword: '',
              useCyclePeriod: false,
              parentGoalId: parentGoal?.id || ''
            })
            setSelectedCycle(defaultCycle)
          }
        }
      } catch (error) {
        console.error('사이클 로드 오류:', error)
        // 오류 시 mockCycles 사용
        setCycles(mockCycles)
        const defaultCycle = mockCycles.find(c => c.isDefault)
        setSelectedCycle(defaultCycle)
      }
    }
    
    loadCycles()
  }, [initialData, isOpen, parentGoal])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
    onClose()
  }

  const handleClose = () => {
    onClose()
  }

  const handleCycleChange = (cycleId: string) => {
    setFormData({ ...formData, cycleId })
    const cycle = cycles.find(c => c.id === cycleId)
    setSelectedCycle(cycle)
    // 사이클이 변경되면 키워드도 초기화
    if (formData.organization === '키워드') {
      setFormData(prev => ({ ...prev, cycleId, keyword: '' }))
    } else {
      setFormData(prev => ({ ...prev, cycleId }))
    }
  }

  const handleOrganizationChange = (organization: string) => {
    setFormData({ ...formData, organization, keyword: '' })
  }

  const handleUseCyclePeriodChange = (checked: boolean) => {
    setFormData({ 
      ...formData, 
      useCyclePeriod: checked,
      startDate: checked && selectedCycle ? selectedCycle.start_date : formData.startDate,
      endDate: checked && selectedCycle ? selectedCycle.end_date : formData.endDate
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-6">
          <DialogTitle className="text-lg font-semibold">
            {initialData ? '목표 수정' : parentGoal ? '하위 목표 만들기' : '새 목표 만들기'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* 목표 정보 */}
          <div className="space-y-6">
            {/* 상위 목표 표시 */}
            {parentGoal && (
              <div className="p-4 bg-blue-50 rounded-lg">
                <Label className="text-sm font-medium text-blue-700">상위 목표</Label>
                <p className="text-sm text-blue-600 mt-1">{parentGoal.title}</p>
              </div>
            )}

            {/* 사이클 선택 */}
            <div className="space-y-2">
              <Label htmlFor="cycle" className="text-sm font-medium">사이클</Label>
              <Select value={formData.cycleId} onValueChange={handleCycleChange}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="사이클 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">사이클 없음</SelectItem>
                  {cycles.map((cycle) => (
                    <SelectItem key={cycle.id} value={cycle.id}>
                      {cycle.name}
                      {cycle.is_default && ' (기본)'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title" className="text-sm font-medium">목표 *</Label>
              <Input
                id="title"
                placeholder="목표를 입력하세요"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="h-10"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="organization" className="text-sm font-medium">목표 구분 *</Label>
                <Select value={formData.organization} onValueChange={handleOrganizationChange}>
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="역할 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="개인">개인</SelectItem>
                    <SelectItem value="키워드">키워드</SelectItem>
                    <SelectItem value="공통">공통</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* 키워드 선택 (목표 구분이 '키워드'일 때만 표시) */}
              {formData.organization === '키워드' && selectedCycle && selectedCycle.keywords.length > 0 && (
                <div className="space-y-2">
                  <Label htmlFor="keyword" className="text-sm font-medium">키워드 *</Label>
                  <Select value={formData.keyword || ''} onValueChange={(value) => setFormData({ ...formData, keyword: value })}>
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="키워드 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedCycle.keywords.map((keyword: any) => (
                        <SelectItem key={keyword.name} value={keyword.name}>
                          {keyword.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  {/* 선택된 키워드 설명 표시 */}
                  {formData.keyword && (() => {
                    const selectedKeyword = selectedCycle.keywords.find((k: any) => k.name === formData.keyword)
                    return selectedKeyword && selectedKeyword.description ? (
                      <div className="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="text-sm font-medium text-gray-700 mb-1">{selectedKeyword.name}</div>
                        <div className="text-sm text-gray-600">{selectedKeyword.description}</div>
                      </div>
                    ) : null
                  })()}
                </div>
              )}
            </div>

            {/* 날짜 설정 */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="useCyclePeriod"
                  checked={formData.useCyclePeriod}
                  onCheckedChange={handleUseCyclePeriodChange}
                  disabled={!selectedCycle}
                />
                <Label htmlFor="useCyclePeriod" className="text-sm font-medium">
                  사이클 기간 내
                </Label>
                {!selectedCycle && (
                  <span className="text-xs text-gray-500">(사이클을 선택해야 합니다)</span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start-date" className="text-sm font-medium">시작 날짜 *</Label>
                  <Input
                    id="start-date"
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="h-10"
                    disabled={formData.useCyclePeriod}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end-date" className="text-sm font-medium">종료 날짜 *</Label>
                  <Input
                    id="end-date"
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="h-10"
                    disabled={formData.useCyclePeriod}
                    required
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="assignee" className="text-sm font-medium">담당자 *</Label>
              <Input
                id="assignee"
                placeholder="담당자를 입력하세요"
                value={formData.assignee}
                onChange={(e) => setFormData({ ...formData, assignee: e.target.value })}
                className="h-10"
                required
              />
            </div>
          </div>

          <Separator />

          {/* 지표 설정 */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="text-sm font-medium">지표 설정</Label>
                <p className="text-xs text-gray-500">목표 달성을 측정할 지표를 설정하세요</p>
              </div>
              <Switch
                checked={formData.hasMetric}
                onCheckedChange={(checked) => setFormData({ ...formData, hasMetric: checked })}
              />
            </div>

            {formData.hasMetric && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="metric-name" className="text-sm font-medium">지표명</Label>
                  <Input
                    id="metric-name"
                    placeholder="예) 매출액, 고객 만족도"
                    value={formData.metricName}
                    onChange={(e) => setFormData({ ...formData, metricName: e.target.value })}
                    className="h-10"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="start-value" className="text-sm font-medium">시작값</Label>
                    <Input
                      id="start-value"
                      type="number"
                      placeholder="0"
                      value={formData.startValue}
                      onChange={(e) => setFormData({ ...formData, startValue: e.target.value })}
                      className="h-10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="target-value" className="text-sm font-medium">목표값</Label>
                    <Input
                      id="target-value"
                      type="number"
                      placeholder="100"
                      value={formData.targetValue}
                      onChange={(e) => setFormData({ ...formData, targetValue: e.target.value })}
                      className="h-10"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* 설명 */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-medium">설명</Label>
            <Textarea
              id="description"
              placeholder="목표에 대한 상세한 설명을 입력하세요"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="resize-none"
            />
          </div>

          {/* 버튼 */}
          <div className="flex justify-end gap-3 pt-6 border-t">
            <Button type="button" variant="outline" onClick={handleClose} className="h-10 px-6">
              취소
            </Button>
            <Button type="submit" className="h-10 px-6">
              {initialData ? '수정' : '만들기'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
} 