"use client"

import React, { useState, useEffect, useMemo } from 'react'
import { X, Calendar, Users, Target, BarChart3, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import { DatePicker } from '@/components/ui/date-picker'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface Goal {
  id: string
  title: string
  status: 'pending' | 'on_track' | 'difficult' | 'completed' | 'stopped'
  progress: number
  organization: string
  assignee: string
  period: string
  cycle?: string
  keyword?: string
  hasMetric?: boolean
  metricName?: string
  startValue?: number
  targetValue?: number
  currentValue?: number
  description?: string
}

interface MetricEntry {
  id: string
  date: string
  value: string
  note: string
}

interface GoalDetailProps {
  goal: Goal | null
  isOpen: boolean
  onClose: () => void
  onProgressUpdate?: (goalId: string, progress: number) => void
  onStatusUpdate?: (goalId: string, status: string) => void
  hideHeader?: boolean
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

export function GoalDetail({ goal, isOpen, onClose, onProgressUpdate, onStatusUpdate, hideHeader }: GoalDetailProps) {
  // 로컬 목표 상태 (실시간 업데이트를 위해)
  const [localGoal, setLocalGoal] = useState<Goal | null>(null)

  // goal prop이 변경될 때 로컬 상태 업데이트
  useEffect(() => {
    setLocalGoal(goal)
  }, [goal])

  // 목표별 지표 데이터를 관리하기 위한 상태
  const [goalMetrics, setGoalMetrics] = useState<Record<string, MetricEntry[]>>({
    // 초기 샘플 데이터 (지표가 있는 목표들)
    '550e8400-e29b-41d4-a716-446655440101': [
      { id: '1', date: '2025-01-15', value: '4.1', note: '1월 중간 점검' }
    ],
    '550e8400-e29b-41d4-a716-446655440102': [
      { id: '2', date: '2025-01-20', value: '100', note: '시스템 구축 완료' }
    ],
    '550e8400-e29b-41d4-a716-446655440103': [
      { id: '3', date: '2025-02-01', value: '60', note: '교육 프로그램 개발 중' }
    ],
    '550e8400-e29b-41d4-a716-446655440104': [
      { id: '4', date: '2025-01-25', value: '9', note: '매출 증가율 측정' }
    ],
    '550e8400-e29b-41d4-a716-446655440105': [
      { id: '5', date: '2025-02-01', value: '15', note: '출시 준비 진행 중' }
    ],
    '550e8400-e29b-41d4-a716-446655440106': [
      { id: '6', date: '2025-01-30', value: '4.2', note: '직원 만족도 조사' }
    ],
    '550e8400-e29b-41d4-a716-446655440107': [
      { id: '7', date: '2025-01-15', value: '100', note: '전략 수립 완료' }
    ]
    // 지표가 없는 목표들 (550e8400-e29b-41d4-a716-446655440108, 550e8400-e29b-41d4-a716-446655440109)은 빈 배열로 처리
  })

  // 현재 목표의 지표 데이터
  const metricEntries = useMemo(() =>
    localGoal ? (goalMetrics[localGoal.id] || []) : [],
    [localGoal, goalMetrics]
  )
  const setMetricEntries = (entries: MetricEntry[]) => {
    if (localGoal) {
      setGoalMetrics(prev => ({
        ...prev,
        [localGoal.id]: entries
      }))
    }
  }
  const [isAddingMetric, setIsAddingMetric] = useState(false)
  const [newMetricEntry, setNewMetricEntry] = useState({
    date: '',
    value: '',
    note: ''
  })
  const [currentProgress, setCurrentProgress] = useState(0)

  // 진행률 계산 함수
  const calculateProgress = (entries: MetricEntry[], startValue: number, targetValue: number): number => {
    if (entries.length === 0) return 0

    // 가장 최근 지표값 가져오기
    const latestEntry = entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]
    const currentValue = parseFloat(latestEntry.value)

    // 진행률 계산: (현재값 - 시작값) / (목표값 - 시작값) * 100
    const progress = ((currentValue - startValue) / (targetValue - startValue)) * 100

    // 0-100 범위로 제한
    return Math.max(0, Math.min(100, Math.round(progress)))
  }

  // 지표값이 변경될 때마다 진행률 재계산
  useEffect(() => {
    if (localGoal?.hasMetric && localGoal.startValue !== undefined && localGoal.targetValue !== undefined) {
      const progress = calculateProgress(metricEntries, localGoal.startValue, localGoal.targetValue)
      setCurrentProgress(progress)
    }
  }, [metricEntries, localGoal?.hasMetric, localGoal?.startValue, localGoal?.targetValue, localGoal?.id])

  if (!localGoal) return null

  const handleAddMetric = async () => {
    if (!newMetricEntry.date || !newMetricEntry.value) {
      alert('날짜와 지표값을 입력해주세요.')
      return
    }

    const entry: MetricEntry = {
      id: Date.now().toString(),
      date: newMetricEntry.date,
      value: newMetricEntry.value,
      note: newMetricEntry.note
    }

    // 현재는 목 데이터에만 추가 (DB 연동 전)
    try {
      setMetricEntries([...metricEntries, entry])
      setNewMetricEntry({ date: '', value: '', note: '' })
      setIsAddingMetric(false)
      console.log('지표값 저장 성공:', entry)

      // 지표값이 추가된 후 진행률 업데이트
      if (localGoal?.hasMetric && localGoal.startValue !== undefined && localGoal.targetValue !== undefined) {
        const newProgress = calculateProgress([...metricEntries, entry], localGoal.startValue, localGoal.targetValue)
        if (onProgressUpdate && localGoal.id) {
          onProgressUpdate(localGoal.id, newProgress)
        }
      }
    } catch (error) {
      console.error('지표값 저장 오류:', error)
      alert('지표값 저장에 실패했습니다.')
    }
  }

  const handleDeleteMetric = async (id: string) => {
    try {
      // 현재는 목 데이터에서만 삭제 (DB 연동 전)
      const updatedEntries = metricEntries.filter(entry => entry.id !== id)
      setMetricEntries(updatedEntries)
      console.log('지표값 삭제 성공:', id)

      // 지표값이 삭제된 후 진행률 업데이트
      if (localGoal?.hasMetric && localGoal.startValue !== undefined && localGoal.targetValue !== undefined) {
        const newProgress = calculateProgress(updatedEntries, localGoal.startValue, localGoal.targetValue)
        if (onProgressUpdate && localGoal.id) {
          onProgressUpdate(localGoal.id, newProgress)
        }
      }
    } catch (error) {
      console.error('지표값 삭제 오류:', error)
      alert('지표값 삭제에 실패했습니다.')
    }
  }

  const handleStatusChange = (newStatus: string) => {
    try {
      // 로컬 상태 즉시 업데이트
      if (localGoal) {
        setLocalGoal({
          ...localGoal,
          status: newStatus as 'pending' | 'on_track' | 'difficult' | 'completed' | 'stopped'
        })
      }

      // 부모 컴포넌트에 상태 변경 알림 (디바운스 적용)
      if (onStatusUpdate && localGoal) {
        setTimeout(() => {
          onStatusUpdate(localGoal.id, newStatus)
        }, 100)
      }

      console.log('목표 상태 변경:', { goalId: localGoal?.id, newStatus })
    } catch (error) {
      console.error('목표 상태 변경 오류:', error)
    }
  }

  // 실제 진행률 사용 (계산된 값 또는 기본값)
  const displayProgress = localGoal.hasMetric ? currentProgress : localGoal.progress

  return (
    <div className="h-full flex flex-col">
      <div className={`${hideHeader ? '' : 'p-1'} space-y-6`}>
        {/* 헤더 */}
        {!hideHeader && (
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">목표 상세 정보</h2>
            <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
              <X className="w-4 h-4" />
            </Button>
          </div>
        )}

        {/* 목표 제목 - 패널 헤더와 중복되므로 인라인 시 제거 고려 가능하나, 여기서는 유지하되 스타일만 조정 */}
        {!hideHeader && (
          <div className="space-y-2">
            <h3 className="text-xl font-bold text-gray-900">{localGoal.title}</h3>
            <div className="flex items-center gap-2">
              <Badge className={`${statusColors[localGoal.status]} text-xs font-medium px-3 py-1.5 border rounded-full text-center`}>
                {statusText[localGoal.status]}
              </Badge>
              {localGoal.organization === '키워드' && localGoal.keyword ? (
                <Badge variant="secondary" className="text-xs font-medium px-3 py-1.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full text-center">
                  {localGoal.keyword}
                </Badge>
              ) : (
                <Badge variant="outline" className="text-xs font-medium px-3 py-1.5 border-slate-200 text-slate-700 rounded-full text-center bg-white">
                  {localGoal.organization}
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* 진행률 */}
        <Card className="border border-gray-200 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-semibold text-gray-900">진행률</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {localGoal.hasMetric ? (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">진행률</span>
                  <span className="font-medium">{displayProgress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                    style={{ width: `${displayProgress}%` }}
                  ></div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">현재 상태</Label>
                  <Select value={localGoal.status} onValueChange={handleStatusChange}>
                    <SelectTrigger className="h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">대기</SelectItem>
                      <SelectItem value="on_track">순항</SelectItem>
                      <SelectItem value="difficult">난항</SelectItem>
                      <SelectItem value="completed">완료</SelectItem>
                      <SelectItem value="stopped">중단</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-center py-4">
                  <p className="text-sm text-gray-500">지표가 설정되지 않은 목표입니다.</p>
                  <p className="text-xs text-gray-400 mt-1">수동으로 완료 상태를 변경할 수 있습니다.</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">현재 상태</Label>
                  <Select value={localGoal.status} onValueChange={handleStatusChange}>
                    <SelectTrigger className="h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">대기</SelectItem>
                      <SelectItem value="on_track">순항</SelectItem>
                      <SelectItem value="difficult">난항</SelectItem>
                      <SelectItem value="completed">완료</SelectItem>
                      <SelectItem value="stopped">중단</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 기본 정보 */}
        <Card className="border border-gray-200 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-semibold text-gray-900">기본 정보</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">담당자</Label>
                <p className="text-sm text-gray-900">{localGoal.assignee}</p>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">기간</Label>
                <p className="text-sm text-gray-900">{localGoal.period}</p>
              </div>
            </div>
            {localGoal.description && (
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">설명</Label>
                <p className="text-sm text-gray-900">{localGoal.description}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 지표 정보 */}
        <Card className="border border-gray-200 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-semibold text-gray-900">지표 정보</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {localGoal.hasMetric && localGoal.metricName ? (
              <>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">지표명</Label>
                    <p className="text-sm text-gray-900">{localGoal.metricName}</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">시작값</Label>
                    <p className="text-sm text-gray-900">{localGoal.startValue}</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">목표값</Label>
                    <p className="text-sm text-gray-900">{localGoal.targetValue}</p>
                  </div>
                </div>

                <Separator />

                {/* 현재 진행상태 입력 */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">현재 진행상태</Label>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsAddingMetric(true)}
                      className="h-8"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      지표값 입력
                    </Button>
                  </div>

                  {isAddingMetric && (
                    <Card className="border-dashed border-gray-300">
                      <CardContent className="p-4 space-y-4">
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">날짜</Label>
                          <DatePicker
                            date={newMetricEntry.date ? new Date(newMetricEntry.date) : undefined}
                            setDate={(date) => {
                              if (date) {
                                const formattedDate = date.toISOString().split('T')[0]
                                setNewMetricEntry({ ...newMetricEntry, date: formattedDate })
                              } else {
                                setNewMetricEntry({ ...newMetricEntry, date: '' })
                              }
                            }}
                            placeholder="날짜 선택"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">지표값</Label>
                          <Input
                            type="number"
                            placeholder="0"
                            value={newMetricEntry.value}
                            onChange={(e) => setNewMetricEntry({ ...newMetricEntry, value: e.target.value })}
                            className="h-10"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">메모 (선택)</Label>
                          <Textarea
                            placeholder="진행 상황이나 특이사항을 입력하세요"
                            value={newMetricEntry.note}
                            onChange={(e) => setNewMetricEntry({ ...newMetricEntry, note: e.target.value })}
                            rows={3}
                            className="resize-none"
                          />
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setIsAddingMetric(false)
                              setNewMetricEntry({ date: '', value: '', note: '' })
                            }}
                            className="h-8"
                          >
                            취소
                          </Button>
                          <Button size="sm" onClick={handleAddMetric} className="h-8">
                            추가
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* 지표값 기록 */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">지표값 기록</Label>
                    <div className="space-y-2">
                      {metricEntries.length > 0 ? (
                        metricEntries.map((entry) => (
                          <div key={entry.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex-1">
                              <div className="flex items-center gap-3">
                                <span className="text-sm font-medium">{entry.date}</span>
                                <span className="text-sm text-gray-600">{entry.value}</span>
                                {entry.note && (
                                  <span className="text-xs text-gray-500">({entry.note})</span>
                                )}
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteMetric(entry.id)}
                              className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-gray-500 text-center py-4">
                          아직 지표값이 입력되지 않았습니다.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <BarChart3 className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="text-sm text-gray-500">지표가 설정되지 않은 목표입니다.</p>
                <p className="text-xs text-gray-400 mt-1">지표를 설정하면 진행상태를 추적할 수 있습니다.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 