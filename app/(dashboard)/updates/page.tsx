'use client';

import React, { useState, useEffect } from 'react';
import {
  History,
  Plus,
  ChevronRight,
  ChevronDown,
  Tag,
  Calendar,
  Rocket,
  Wrench,
  Zap,
  PlusCircle,
  ChevronUp,
  Edit,
  Trash2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { toast } from 'sonner';

interface UpdateLog {
  id: string;
  version: string;
  title: string;
  content: string;
  type: 'feature' | 'fix' | 'improvement' | 'chore';
  created_at: string;
}

export default function UpdatesPage() {
  const [updates, setUpdates] = useState<UpdateLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  // 새 업데이트 폼 상태
  const [newUpdate, setNewUpdate] = useState<{
    version: string;
    title: string;
    content: string;
    type: UpdateLog['type'];
    created_at: Date;
  }>({
    version: '4.1.1',
    title: '',
    content: '',
    type: 'feature',
    created_at: new Date()
  });

  useEffect(() => {
    fetchUpdates();
  }, []);

  const fetchUpdates = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/update-logs');
      const data = await res.json();
      if (data.success) {
        setUpdates(data.data);
        // 카드는 항상 닫힌 상태로 시작 (setExpandedId(null)이 기본값)
      }
    } catch (error) {
      console.error('Error fetching updates:', error);
      toast.error('업데이트 내역을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (update: UpdateLog) => {
    setNewUpdate({
      version: update.version,
      title: update.title,
      content: update.content,
      type: update.type,
      created_at: new Date(update.created_at)
    });
    setEditingId(update.id);
    setIsOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('정말로 이 업데이트 내역을 삭제하시겠습니까?')) return;

    try {
      const res = await fetch(`/api/update-logs?id=${id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        toast.success('삭제되었습니다.');
        fetchUpdates();
      }
    } catch (error) {
      toast.error('삭제에 실패했습니다.');
    }
  };

  const handleSave = async () => {
    if (!newUpdate.title || !newUpdate.content) {
      toast.error('제목과 내용을 입력해주세요.');
      return;
    }

    try {
      const method = editingId ? 'PUT' : 'POST';
      // date를 ISO 문자열로 변환하여 전송
      const body = editingId
        ? { ...newUpdate, id: editingId, created_at: newUpdate.created_at.toISOString() }
        : { ...newUpdate, created_at: newUpdate.created_at.toISOString() };

      const res = await fetch('/api/update-logs', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (data.success) {
        toast.success(editingId ? '수정되었습니다.' : '업데이트 내역이 저장되었습니다.');
        setIsOpen(false);
        setNewUpdate({ version: '4.1.1', title: '', content: '', type: 'feature', created_at: new Date() });
        setEditingId(null);
        fetchUpdates();
      }
    } catch (error) {
      toast.error('저장에 실패했습니다.');
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'feature': return <Badge className="bg-blue-500 hover:bg-blue-600 border-none text-[10px] h-5 px-1.5"><Rocket className="w-2.5 h-2.5 mr-1" /> 신규 기능</Badge>;
      case 'fix': return <Badge className="bg-red-500 hover:bg-red-600 border-none text-[10px] h-5 px-1.5"><Wrench className="w-2.5 h-2.5 mr-1" /> 버그 수정</Badge>;
      case 'improvement': return <Badge className="bg-emerald-500 hover:bg-emerald-600 border-none text-[10px] h-5 px-1.5"><Zap className="w-2.5 h-2.5 mr-1" /> 성능 개선</Badge>;
      default: return <Badge variant="outline" className="text-slate-500 text-[10px] h-5 px-1.5"><Tag className="w-2.5 h-2.5 mr-1" /> 기타</Badge>;
    }
  };

  // 마크다운 줄바꿈 처리 유틸리티
  const formatMarkdown = (content: string) => {
    return content.replace(/\\n/g, '\n');
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500">
      {/* 관리자 도구 */}
      <div className="flex justify-end gap-3 mb-4">
        <Button
          variant="ghost"
          size="sm"
          className="text-slate-300 hover:text-slate-500 font-bold text-xs"
          onClick={() => setIsAdmin(!isAdmin)}
        >
          {isAdmin ? '관리자 모드 종료' : '관리자 인증'}
        </Button>

        {isAdmin && (
          <Dialog open={isOpen} onOpenChange={(val) => {
            setIsOpen(val);
            if (!val) {
              setEditingId(null);
              setNewUpdate({ version: '4.1.1', title: '', content: '', type: 'feature', created_at: new Date() });
            }
          }}>
            <DialogTrigger asChild>
              <Button size="sm" className="rounded-xl font-bold bg-primary shadow-lg shadow-primary/20">
                <PlusCircle className="w-4 h-4 mr-2" /> 새 기록
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl rounded-[32px] border-none max-h-[90vh] flex flex-col overflow-hidden">
              <DialogHeader className="px-6 pt-6 shrink-0">
                <DialogTitle className="text-2xl font-black">
                  {editingId ? '업데이트 내역 수정' : '새 업데이트 기록'}
                </DialogTitle>
              </DialogHeader>

              <div className="flex-1 overflow-y-auto px-6 py-4 custom-scrollbar space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                  <div className="md:col-span-3 space-y-2">
                    <label className="text-xs font-bold text-slate-500 ml-1">버전명</label>
                    <Input
                      value={newUpdate.version}
                      onChange={(e) => setNewUpdate({ ...newUpdate, version: e.target.value })}
                      className="rounded-xl border-slate-200"
                      placeholder="예: 4.1.0"
                    />
                  </div>
                  <div className="md:col-span-4 space-y-2">
                    <label className="text-xs font-bold text-slate-500 ml-1">유형</label>
                    <Select
                      value={newUpdate.type}
                      onValueChange={(val: any) => setNewUpdate({ ...newUpdate, type: val })}
                    >
                      <SelectTrigger className="rounded-xl border-slate-200">
                        <SelectValue placeholder="유형 선택" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="feature">신규 기능</SelectItem>
                        <SelectItem value="fix">버그 수정</SelectItem>
                        <SelectItem value="improvement">성능 개선</SelectItem>
                        <SelectItem value="chore">기타 작업</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="md:col-span-5 space-y-2">
                    <label className="text-xs font-bold text-slate-500 ml-1">날짜</label>
                    <DatePicker
                      date={newUpdate.created_at}
                      setDate={(date) => setNewUpdate({ ...newUpdate, created_at: date || new Date() })}
                      className="rounded-xl border-slate-200"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 ml-1">제목</label>
                  <Input
                    value={newUpdate.title}
                    onChange={(e) => setNewUpdate({ ...newUpdate, title: e.target.value })}
                    className="rounded-xl border-slate-200"
                    placeholder="업데이트 핵심 내용을 요약해주세요"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 ml-1">내용 (마크다운 지원)</label>
                  <Textarea
                    value={newUpdate.content}
                    onChange={(e) => setNewUpdate({ ...newUpdate, content: e.target.value })}
                    className="rounded-xl border-slate-200 min-h-[300px] resize-none"
                    placeholder="상세 업데이트 내용을 마크다운으로 작성하세요"
                  />
                </div>
              </div>

              <DialogFooter className="px-6 pb-6 pt-2 shrink-0">
                <Button variant="ghost" onClick={() => setIsOpen(false)} className="rounded-xl font-bold text-slate-400">취소</Button>
                <Button onClick={handleSave} className="rounded-xl font-bold bg-primary shadow-lg shadow-primary/20 min-w-[100px]">
                  {editingId ? '수정 완료' : '저장하기'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* 업데이트 리스트 */}
      <div className="relative space-y-6">
        {/* 타임라인 바 */}
        {!loading && updates.length > 0 && (
          <div className="absolute left-[94px] top-6 bottom-6 w-0.5 bg-slate-200/50" />
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="size-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          </div>
        ) : updates.length === 0 ? (
          <div className="text-center py-20 bg-slate-50 rounded-[32px] border border-dashed border-slate-200">
            <History className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 font-medium">기록된 업데이트 내역이 없습니다.</p>
          </div>
        ) : (
          updates.map((update) => (
            <div key={update.id} className="relative pl-28 group">
              {/* 날짜 및 점 (수평 정렬 통합) */}
              <div className="absolute left-0 top-[23px] flex items-center justify-end w-[100px] gap-2.5">
                <span className={`text-[11px] font-black tabular-nums tracking-tighter transition-all duration-300 ${expandedId === update.id ? 'text-primary' : 'text-slate-400'}`}>
                  {format(new Date(update.created_at), 'yyyy.MM.dd', { locale: ko })}
                </span>
                <div className={`size-2.5 rounded-full border-2 border-white transition-all duration-300 z-10 shadow-sm shrink-0 ${expandedId === update.id
                  ? 'bg-primary scale-125 ring-4 ring-primary/10'
                  : 'bg-slate-300 group-hover:bg-primary group-hover:scale-125'
                  }`} />
              </div>

              <Card
                className={`rounded-2xl border-slate-100 shadow-sm transition-all duration-300 overflow-hidden bg-white hover:border-primary/20 ${expandedId === update.id ? 'ring-1 ring-primary/10' : ''}`}
              >
                <div
                  onClick={() => setExpandedId(expandedId === update.id ? null : update.id)}
                  className={`w-full text-left cursor-pointer transition-all duration-300 ${expandedId === update.id ? 'sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-slate-50 shadow-sm' : 'hover:bg-slate-50/50'}`}
                >
                  <CardHeader className="p-4 flex flex-row items-center gap-4 space-y-0">
                    <div className="flex items-center shrink-0">
                      {getTypeBadge(update.type)}
                    </div>

                    <CardTitle className="text-sm font-bold text-slate-800 flex-1 truncate pr-4">
                      {update.title}
                    </CardTitle>

                    <div className="flex items-center gap-4 shrink-0">
                      <Badge variant="outline" className="bg-slate-50 text-slate-500 border-slate-200 text-[10px] h-5 px-2 font-black tabular-nums">
                        v{update.version}
                      </Badge>

                      {isAdmin && (
                        <div className="flex items-center gap-1 mr-2 bg-slate-100/50 p-0.5 rounded-lg">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-slate-400 hover:text-primary hover:bg-white transition-all"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEdit(update);
                            }}
                          >
                            <Edit className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-slate-400 hover:text-red-500 hover:bg-white transition-all"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(update.id);
                            }}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      )}

                      <div className={`p-1 rounded-full transition-colors ${expandedId === update.id ? 'bg-primary/10' : 'bg-slate-50'}`}>
                        {expandedId === update.id ? (
                          <ChevronUp className="w-4 h-4 text-primary" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-slate-400" />
                        )}
                      </div>
                    </div>
                  </CardHeader>
                </div>

                {expandedId === update.id && (
                  <CardContent className="p-5 pt-0 border-t border-slate-50/50 bg-slate-50/30 animate-in slide-in-from-top-2 duration-300">
                    <div className="mt-4 prose prose-slate max-w-none">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          h1: ({ node, ...props }) => <h1 className="text-base font-bold mt-4 mb-2 text-slate-800" {...props} />,
                          h2: ({ node, ...props }) => <h2 className="text-sm font-bold mt-3 mb-2 text-slate-700 border-l-3 border-primary/30 pl-2" {...props} />,
                          h3: ({ node, ...props }) => <h3 className="text-xs font-bold mt-3 mb-1 text-slate-600 uppercase tracking-wider" {...props} />,
                          p: ({ node, ...props }) => <p className="text-xs text-slate-600 leading-relaxed mb-2" {...props} />,
                          ul: ({ node, ...props }) => <ul className="list-disc list-inside space-y-1 mb-3" {...props} />,
                          li: ({ node, ...props }) => <li className="text-xs text-slate-600 marker:text-primary/50" {...props} />,
                          strong: ({ node, ...props }) => <strong className="font-bold text-slate-900" {...props} />,
                          blockquote: ({ node, ...props }) => <blockquote className="border-l-4 border-slate-200 pl-4 italic text-slate-500 my-2 text-xs" {...props} />,
                        }}
                      >
                        {formatMarkdown(update.content)}
                      </ReactMarkdown>
                    </div>
                  </CardContent>
                )}
              </Card>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
