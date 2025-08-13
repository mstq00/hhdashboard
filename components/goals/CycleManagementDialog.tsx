"use client"

import React, { useState, useEffect } from 'react'
import { X, Plus, Settings, Edit, Trash2, Target } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'

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

interface CycleManagementDialogProps {
  isOpen: boolean
  onClose: () => void
  onCycleChange: (cycleId: string) => void
  onDefaultCycleChange?: () => void
}



export function CycleManagementDialog({ isOpen, onClose, onCycleChange, onDefaultCycleChange }: CycleManagementDialogProps) {
  const [cycles, setCycles] = useState<Cycle[]>([])
  const [loading, setLoading] = useState(false)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [deletingCycle, setDeletingCycle] = useState<Cycle | null>(null)
  const [deleteConfirmation, setDeleteConfirmation] = useState('')
  const [editingCycle, setEditingCycle] = useState<Cycle | null>(null)
  const [newCycle, setNewCycle] = useState({
    name: '',
    startDate: '',
    endDate: '',
    keywords: [] as Keyword[],
    isDefault: false
  })
  const [newKeyword, setNewKeyword] = useState({
    name: '',
    description: ''
  })

  // 사이클 데이터 로드
  const loadCycles = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/goals/cycles')
      if (response.ok) {
        const data = await response.json()
        // DB 데이터를 프론트엔드 형식으로 변환
        const transformedCycles = data.map((cycle: any) => {
          // 키워드 데이터 변환
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
            id: cycle.id,
            name: cycle.name,
            startDate: cycle.start_date,
            endDate: cycle.end_date,
            keywords: keywords,
            isDefault: cycle.is_default
          }
        })
        
        // 시작일 기준으로 최신순 정렬
        transformedCycles.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())
        
        setCycles(transformedCycles)
      } else {
        console.error('사이클 로드 실패')
      }
    } catch (error) {
      console.error('사이클 로드 오류:', error)
    } finally {
      setLoading(false)
    }
  }

  // 다이얼로그가 열릴 때 사이클 데이터 로드
  useEffect(() => {
    if (isOpen) {
      loadCycles()
    }
  }, [isOpen])

  const handleAddKeyword = () => {
    if (!newKeyword.name.trim()) {
      alert('키워드명을 입력해주세요.')
      return
    }

    setNewCycle(prev => ({
      ...prev,
      keywords: [...prev.keywords, { ...newKeyword }]
    }))
    setNewKeyword({ name: '', description: '' })
  }

  const handleRemoveKeyword = (index: number) => {
    setNewCycle(prev => ({
      ...prev,
      keywords: prev.keywords.filter((_, i) => i !== index)
    }))
  }

  const handleCreateCycle = async () => {
    if (!newCycle.name || !newCycle.startDate || !newCycle.endDate) {
      alert('필수 항목을 입력해주세요.')
      return
    }

    try {
      const response = await fetch('/api/goals/cycles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newCycle.name,
          start_date: newCycle.startDate,
          end_date: newCycle.endDate,
          keywords: newCycle.keywords,
          is_default: newCycle.isDefault
        })
      })
      
      if (response.ok) {
        setNewCycle({ name: '', startDate: '', endDate: '', keywords: [], isDefault: false })
        setIsCreateDialogOpen(false)
        
        // 데이터 다시 로드
        await loadCycles()
        
        // 기본 사이클로 설정했다면 콜백 호출
        if (newCycle.isDefault && onDefaultCycleChange) {
          onDefaultCycleChange()
        }
      } else {
        console.error('사이클 생성 실패')
      }
    } catch (error) {
      console.error('사이클 생성 오류:', error)
    }
  }

  const handleEditCycle = (cycle: Cycle) => {
    setEditingCycle(cycle)
    setNewCycle({
      name: cycle.name,
      startDate: cycle.startDate,
      endDate: cycle.endDate,
      keywords: [...cycle.keywords],
      isDefault: cycle.isDefault
    })
    setIsEditDialogOpen(true)
  }

  const handleUpdateCycle = async () => {
    if (!editingCycle || !newCycle.name || !newCycle.startDate || !newCycle.endDate) {
      alert('필수 항목을 입력해주세요.')
      return
    }

    try {
      const response = await fetch(`/api/goals/cycles/${editingCycle.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newCycle.name,
          start_date: newCycle.startDate,
          end_date: newCycle.endDate,
          keywords: newCycle.keywords
        })
      })
      
      if (response.ok) {
        setEditingCycle(null)
        setNewCycle({ name: '', startDate: '', endDate: '', keywords: [], isDefault: false })
        setIsEditDialogOpen(false)
        
        // 데이터 다시 로드
        await loadCycles()
      } else {
        console.error('사이클 수정 실패')
      }
    } catch (error) {
      console.error('사이클 수정 오류:', error)
    }
  }

  const handleDeleteCycle = (cycle: Cycle) => {
    if (cycle.isDefault) {
      alert('기본 사이클은 삭제할 수 없습니다. 다른 사이클을 기본으로 설정한 후 삭제해주세요.')
      return
    }
    setDeletingCycle(cycle)
    setDeleteConfirmation('')
    setIsDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (deleteConfirmation === deletingCycle?.name) {
      try {
        const response = await fetch(`/api/goals/cycles/${deletingCycle?.id}`, {
          method: 'DELETE'
        })
        
        if (response.ok) {
          setIsDeleteDialogOpen(false)
          setDeletingCycle(null)
          setDeleteConfirmation('')
          
          // 데이터 다시 로드
          await loadCycles()
        } else {
          console.error('사이클 삭제 실패')
        }
      } catch (error) {
        console.error('사이클 삭제 오류:', error)
      }
    } else {
      alert('사이클 이름이 정확하지 않습니다. 다시 확인해주세요.')
    }
  }

  const cancelDelete = () => {
    setIsDeleteDialogOpen(false)
    setDeletingCycle(null)
    setDeleteConfirmation('')
  }

  const handleSetDefault = async (cycleId: string) => {
    try {
      // 모든 사이클의 기본 설정을 해제
      const updatedCycles = cycles.map(cycle => ({
        ...cycle,
        isDefault: cycle.id === cycleId
      }))
      
      // API 호출하여 DB 업데이트
      const response = await fetch('/api/goals/cycles/default', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ cycleId })
      })
      
      if (response.ok) {
        onCycleChange(cycleId)
        // 데이터 다시 로드
        await loadCycles()
        // 기본 사이클 변경 시 콜백 호출
        if (onDefaultCycleChange) {
          onDefaultCycleChange()
        }
      } else {
        console.error('기본 사이클 설정 실패')
      }
    } catch (error) {
      console.error('기본 사이클 설정 오류:', error)
    }
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              사이클 관리
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* 사이클 목록 */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">사이클 목록</h3>
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  새 사이클 만들기
                </Button>
              </div>

              <div className="grid gap-4">
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="text-gray-500">사이클을 불러오는 중...</div>
                  </div>
                ) : cycles.length === 0 ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="text-gray-500">등록된 사이클이 없습니다.</div>
                  </div>
                ) : (
                  cycles.map((cycle) => (
                    <Card key={cycle.id} className="border border-gray-200">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <CardTitle className="text-base">{cycle.name}</CardTitle>
                          {cycle.isDefault && (
                            <Badge variant="secondary" className="text-xs">
                              기본 사이클
                            </Badge>
                          )}
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <Settings className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem onClick={() => handleEditCycle(cycle)}>
                              <Edit className="w-4 h-4 mr-2" />
                              수정
                            </DropdownMenuItem>
                            {!cycle.isDefault && (
                              <DropdownMenuItem onClick={() => handleSetDefault(cycle.id)}>
                                <Target className="w-4 h-4 mr-2" />
                                기본으로 설정
                              </DropdownMenuItem>
                            )}
                            {!cycle.isDefault && (
                              <DropdownMenuItem onClick={() => handleDeleteCycle(cycle)}>
                                <Trash2 className="w-4 h-4 mr-2" />
                                삭제
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <Label className="text-gray-600">기간</Label>
                          <p>{cycle.startDate} ~ {cycle.endDate}</p>
                        </div>
                        <div>
                          <Label className="text-gray-600">키워드 수</Label>
                          <p>{cycle.keywords.length}개</p>
                        </div>
                      </div>
                      
                      {cycle.keywords.length > 0 && (
                        <div>
                          <Label className="text-gray-600 text-sm">키워드</Label>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {cycle.keywords.map((keyword, index) => (
                              <div key={index} className="bg-blue-50 border border-blue-200 rounded-lg p-2">
                                <div className="font-medium text-blue-900 text-sm">{keyword.name}</div>
                                {keyword.description && (
                                  <div className="text-blue-700 text-xs mt-1">{keyword.description}</div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 새 사이클 생성 다이얼로그 */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>새 사이클 만들기</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>사이클명</Label>
                <Input
                  value={newCycle.name}
                  onChange={(e) => setNewCycle({ ...newCycle, name: e.target.value })}
                  placeholder="사이클명을 입력하세요"
                />
              </div>
              <div className="space-y-2">
                <Label>기본 사이클</Label>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="isDefault"
                    checked={newCycle.isDefault}
                    onChange={(e) => setNewCycle({ ...newCycle, isDefault: e.target.checked })}
                  />
                  <Label htmlFor="isDefault" className="text-sm">기본으로 설정</Label>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>시작일</Label>
                <Input
                  type="date"
                  value={newCycle.startDate}
                  onChange={(e) => setNewCycle({ ...newCycle, startDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>종료일</Label>
                <Input
                  type="date"
                  value={newCycle.endDate}
                  onChange={(e) => setNewCycle({ ...newCycle, endDate: e.target.value })}
                />
              </div>
            </div>

            <Separator />

            {/* 키워드 추가 */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>키워드</Label>
                <Button size="sm" onClick={handleAddKeyword}>
                  <Plus className="w-4 h-4 mr-2" />
                  키워드 추가
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>키워드명</Label>
                  <Input
                    value={newKeyword.name}
                    onChange={(e) => setNewKeyword({ ...newKeyword, name: e.target.value })}
                    placeholder="키워드명"
                  />
                </div>
                <div className="space-y-2">
                  <Label>설명</Label>
                  <Input
                    value={newKeyword.description}
                    onChange={(e) => setNewKeyword({ ...newKeyword, description: e.target.value })}
                    placeholder="키워드 설명 (선택사항)"
                  />
                </div>
              </div>

              {/* 추가된 키워드 목록 */}
              {newCycle.keywords.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm text-gray-600">추가된 키워드</Label>
                  <div className="space-y-2">
                    {newCycle.keywords.map((keyword, index) => (
                      <div key={index} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                        <div>
                          <div className="font-medium text-sm">{keyword.name}</div>
                          {keyword.description && (
                            <div className="text-gray-600 text-xs mt-1">{keyword.description}</div>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveKeyword(index)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                취소
              </Button>
              <Button onClick={handleCreateCycle}>
                생성
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 사이클 수정 다이얼로그 */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>사이클 수정</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>사이클명</Label>
                <Input
                  value={newCycle.name}
                  onChange={(e) => setNewCycle({ ...newCycle, name: e.target.value })}
                  placeholder="사이클명을 입력하세요"
                />
              </div>
              <div className="space-y-2">
                <Label>기본 사이클</Label>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="isDefaultEdit"
                    checked={newCycle.isDefault}
                    onChange={(e) => setNewCycle({ ...newCycle, isDefault: e.target.checked })}
                  />
                  <Label htmlFor="isDefaultEdit" className="text-sm">기본으로 설정</Label>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>시작일</Label>
                <Input
                  type="date"
                  value={newCycle.startDate}
                  onChange={(e) => setNewCycle({ ...newCycle, startDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>종료일</Label>
                <Input
                  type="date"
                  value={newCycle.endDate}
                  onChange={(e) => setNewCycle({ ...newCycle, endDate: e.target.value })}
                />
              </div>
            </div>

            <Separator />

            {/* 키워드 수정 */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>키워드</Label>
                <Button size="sm" onClick={handleAddKeyword}>
                  <Plus className="w-4 h-4 mr-2" />
                  키워드 추가
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>키워드명</Label>
                  <Input
                    value={newKeyword.name}
                    onChange={(e) => setNewKeyword({ ...newKeyword, name: e.target.value })}
                    placeholder="키워드명"
                  />
                </div>
                <div className="space-y-2">
                  <Label>설명</Label>
                  <Input
                    value={newKeyword.description}
                    onChange={(e) => setNewKeyword({ ...newKeyword, description: e.target.value })}
                    placeholder="키워드 설명 (선택사항)"
                  />
                </div>
              </div>

              {/* 수정된 키워드 목록 */}
              {newCycle.keywords.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm text-gray-600">키워드 목록</Label>
                  <div className="space-y-2">
                    {newCycle.keywords.map((keyword, index) => (
                      <div key={index} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                        <div>
                          <div className="font-medium text-sm">{keyword.name}</div>
                          {keyword.description && (
                            <div className="text-gray-600 text-xs mt-1">{keyword.description}</div>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveKeyword(index)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                취소
              </Button>
              <Button onClick={handleUpdateCycle}>
                수정
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 삭제 확인 다이얼로그 */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={cancelDelete}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="w-5 h-5" />
              사이클 삭제 확인
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
                <div className="space-y-2">
                  <p className="text-sm font-medium text-red-800">
                    <strong>"{deletingCycle?.name}"</strong> 사이클을 삭제하시겠습니까?
                  </p>
                  <p className="text-xs text-red-700">
                    이 작업은 되돌릴 수 없습니다. 사이클에 연결된 모든 목표와 데이터가 함께 삭제됩니다.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="deleteConfirmation" className="text-sm font-medium">
                삭제를 확인하려면 사이클 이름을 정확히 입력하세요
              </Label>
              <Input
                id="deleteConfirmation"
                value={deleteConfirmation}
                onChange={(e) => setDeleteConfirmation(e.target.value)}
                placeholder={`"${deletingCycle?.name}"`}
                className="border-red-200 focus:border-red-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={cancelDelete}>
                취소
              </Button>
              <Button 
                variant="destructive" 
                onClick={confirmDelete}
                disabled={deleteConfirmation !== deletingCycle?.name}
              >
                삭제
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
} 