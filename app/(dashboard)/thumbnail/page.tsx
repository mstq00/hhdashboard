"use client";

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Upload, Download, RefreshCcw, Trash2, Image as ImageIcon, Sparkles, Eraser } from 'lucide-react';
import { generateThumbnailScene, editImageWithMask, resizeImage } from '@/lib/thumbnail';
import { toast } from 'sonner';
import { useRightPanel } from '@/lib/context/right-panel-context';

enum AppState {
  IDLE = 'IDLE',
  GENERATING = 'GENERATING',
  EDITING = 'EDITING',
  ERROR = 'ERROR'
}

interface Point {
  x: number;
  y: number;
}

// 한글 입력(IME) 시 자음/모음 분리 방지를 위해 별도의 컴포넌트로 분리
interface StableTextareaProps {
  label: string;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

const StableTextarea = React.memo(({ label, value, onChange, placeholder, disabled, className }: StableTextareaProps) => {
  const [localValue, setLocalValue] = useState(value);
  const isComposing = useRef(false);

  useEffect(() => {
    if (!isComposing.current) {
      setLocalValue(value);
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setLocalValue(newValue);

    if (!isComposing.current) {
      onChange(newValue);
    }
  };

  const handleCompositionStart = () => {
    isComposing.current = true;
  };

  const handleCompositionEnd = (e: React.CompositionEvent<HTMLTextAreaElement>) => {
    isComposing.current = false;
    onChange(e.currentTarget.value);
  };

  return (
    <div className="space-y-2">
      <Label className="text-sm font-bold text-slate-700 ml-1">{label}</Label>
      <Textarea
        className={className}
        placeholder={placeholder}
        value={localValue}
        onChange={handleChange}
        onCompositionStart={handleCompositionStart}
        onCompositionEnd={handleCompositionEnd}
        disabled={disabled}
      />
    </div>
  );
});

StableTextarea.displayName = 'StableTextarea';

export default function ThumbnailPage() {
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);

  // Main Images (Max 6)
  const [mainFiles, setMainFiles] = useState<File[]>([]);
  const [mainPreviewUrls, setMainPreviewUrls] = useState<string[]>([]);

  // Drag and Drop State
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // Background/Prop Images (Max 2)
  const [bgFiles, setBgFiles] = useState<File[]>([]);
  const [bgPreviewUrls, setBgPreviewUrls] = useState<string[]>([]);

  // Reference Images (Max 1)
  const [refFiles, setRefFiles] = useState<File[]>([]);
  const [refPreviewUrls, setRefPreviewUrls] = useState<string[]>([]);

  // Text Prompt
  const [userPrompt, setUserPrompt] = useState<string>("");

  // Aspect Ratio
  const [aspectRatio, setAspectRatio] = useState<"16:9" | "9:16">("16:9");

  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Lasso/Inpainting State
  const [isDrawing, setIsDrawing] = useState(false);
  const [lassoPoints, setLassoPoints] = useState<Point[]>([]);
  const [editPrompt, setEditPrompt] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  const { setContent } = useRightPanel();

  // Refs
  const mainInputRef = useRef<HTMLInputElement>(null);
  const bgInputRef = useRef<HTMLInputElement>(null);
  const refInputRef = useRef<HTMLInputElement>(null);
  const imageContainerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement>(null);

  // Initialize Canvas with ResizeObserver
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = imageContainerRef.current;
    if (!canvas || !container) return;

    const updateCanvasSize = () => {
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
    };

    const resizeObserver = new ResizeObserver(() => {
      updateCanvasSize();
    });

    resizeObserver.observe(container);
    updateCanvasSize();

    return () => {
      resizeObserver.disconnect();
    };
  }, [generatedImageUrl, aspectRatio]);

  // Handle Drawing
  const getPoint = (e: React.MouseEvent | React.TouchEvent): Point | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    const point = getPoint(e);
    if (!point) return;
    setIsDrawing(true);
    setLassoPoints([point]);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const point = getPoint(e);
    if (!point) return;

    setLassoPoints(prev => [...prev, point]);
    renderLasso([...lassoPoints, point]);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    // Close the loop visually
    if (lassoPoints.length > 2) {
      renderLasso(lassoPoints, true);
    }
  };

  const renderLasso = (points: Point[], closePath = false) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (points.length < 2) return;

    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    if (closePath) {
      ctx.closePath();
      ctx.fillStyle = 'rgba(239, 68, 68, 0.3)'; // red-500 with 30% opacity
      ctx.fill();
    }
    ctx.strokeStyle = '#ef4444'; // red-500
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.stroke();
  };

  const clearSelection = useCallback(() => {
    setLassoPoints([]);
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    ctx?.clearRect(0, 0, canvas!.width, canvas!.height);
  }, []);

  const handleApplyEdit = useCallback(async () => {
    if (lassoPoints.length < 3) {
      toast.error("영역을 선택해주세요.");
      return;
    }
    if (!editPrompt.trim()) {
      toast.error("수정할 내용을 입력해주세요.");
      return;
    }
    if (!generatedImageUrl) return;

    setIsEditing(true);

    try {
      // Generate Binary Mask
      const maskCanvas = maskCanvasRef.current;
      const displayCanvas = canvasRef.current;
      if (!maskCanvas || !displayCanvas) return;

      maskCanvas.width = displayCanvas.width;
      maskCanvas.height = displayCanvas.height;
      const ctx = maskCanvas.getContext('2d');
      if (!ctx) return;

      // Black background
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);

      // White shape
      ctx.beginPath();
      ctx.moveTo(lassoPoints[0].x, lassoPoints[0].y);
      for (let i = 1; i < lassoPoints.length; i++) {
        ctx.lineTo(lassoPoints[i].x, lassoPoints[i].y);
      }
      ctx.closePath();
      ctx.fillStyle = '#ffffff';
      ctx.fill();

      const maskBase64 = maskCanvas.toDataURL('image/png');

      const newImageUrl = await editImageWithMask(generatedImageUrl, maskBase64, editPrompt);
      setGeneratedImageUrl(newImageUrl);

      // Cleanup
      clearSelection();
      setEditPrompt("");
      toast.success('이미지가 수정되었습니다!');
    } catch (e) {
      console.error(e);
      toast.error("이미지 수정에 실패했습니다.");
    } finally {
      setIsEditing(false);
    }
  }, [lassoPoints, editPrompt, generatedImageUrl, clearSelection]);

  const handleMainFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      const remainingSlots = 6 - mainFiles.length;

      if (remainingSlots <= 0) {
        toast.error("최대 6개까지만 업로드 가능합니다.");
        return;
      }

      const filesToAdd = newFiles.slice(0, remainingSlots);

      const newPreviewPromises = filesToAdd.map(file => {
        return new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            resolve(reader.result as string);
          };
          reader.readAsDataURL(file);
        });
      });

      const newPreviews = await Promise.all(newPreviewPromises);

      setMainFiles(prev => [...prev, ...filesToAdd]);
      setMainPreviewUrls(prev => [...prev, ...newPreviews]);
      setErrorMsg(null);

      e.target.value = '';
    }
  };

  const handleRemoveMainImage = (index: number) => {
    setMainFiles(prev => prev.filter((_, i) => i !== index));
    setMainPreviewUrls(prev => prev.filter((_, i) => i !== index));
  };

  // Drag and Drop Handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) return;

    const newFiles = [...mainFiles];
    const newPreviews = [...mainPreviewUrls];

    // Remove dragged item
    const [draggedFile] = newFiles.splice(draggedIndex, 1);
    const [draggedPreview] = newPreviews.splice(draggedIndex, 1);

    // Insert at target
    newFiles.splice(targetIndex, 0, draggedFile);
    newPreviews.splice(targetIndex, 0, draggedPreview);

    setMainFiles(newFiles);
    setMainPreviewUrls(newPreviews);
    setDraggedIndex(null);
  };

  const handleBgFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      const validFiles = files.slice(0, 2 - bgFiles.length); // 남은 슬롯만큼만 추가

      if (validFiles.length === 0) {
        toast.error("최대 2개까지만 업로드 가능합니다.");
        e.target.value = '';
        return;
      }

      const newPreviewPromises = validFiles.map(file => {
        return new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            resolve(reader.result as string);
          };
          reader.readAsDataURL(file);
        });
      });

      const newPreviews = await Promise.all(newPreviewPromises);
      setBgFiles(prev => [...prev, ...validFiles]);
      setBgPreviewUrls(prev => [...prev, ...newPreviews]);
      e.target.value = '';
    }
  };

  const handleRemoveBgImage = (index: number) => {
    setBgFiles(prev => prev.filter((_, i) => i !== index));
    setBgPreviewUrls(prev => prev.filter((_, i) => i !== index));
  };

  const handleRemoveRefImage = () => {
    setRefFiles([]);
    setRefPreviewUrls([]);
  };

  const handleRefFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];

      setRefFiles([file]);

      const reader = new FileReader();
      reader.onloadend = () => {
        if (reader.result) {
          setRefPreviewUrls([reader.result as string]);
        }
      };
      reader.readAsDataURL(file);
      e.target.value = '';
    }
  };

  const handleGenerate = useCallback(async () => {
    if (mainFiles.length === 0) {
      toast.error("메인 이미지를 최소 1개 업로드해주세요.");
      return;
    }

    setAppState(AppState.GENERATING);
    setErrorMsg(null);

    try {
      const resultUrl = await generateThumbnailScene(mainFiles, bgFiles, refFiles, userPrompt, aspectRatio);
      setGeneratedImageUrl(resultUrl);
      setAppState(AppState.EDITING);
      toast.success('썸네일이 생성되었습니다!');
    } catch (err) {
      console.error(err);
      setErrorMsg("이미지 생성에 실패했습니다. API 키를 확인하거나 다른 이미지를 시도해 보세요.");
      setAppState(AppState.ERROR);
      toast.error("이미지 생성에 실패했습니다.");
    }
  }, [mainFiles, bgFiles, refFiles, userPrompt, aspectRatio]);

  const handleResize = useCallback(async (targetRatio: "16:9" | "9:16") => {
    if (!generatedImageUrl) return;
    if (targetRatio === aspectRatio) return;

    setAppState(AppState.GENERATING);
    setErrorMsg(null);

    try {
      const newUrl = await resizeImage(generatedImageUrl, targetRatio);
      setGeneratedImageUrl(newUrl);
      setAspectRatio(targetRatio);
      setAppState(AppState.EDITING);
      toast.success('이미지 비율이 변경되었습니다!');
    } catch (err) {
      console.error(err);
      setErrorMsg("이미지 비율 변경에 실패했습니다.");
      setAppState(AppState.ERROR);
      toast.error("이미지 비율 변경에 실패했습니다.");
    }
  }, [generatedImageUrl, aspectRatio]);

  const handleReset = useCallback(() => {
    setAppState(AppState.IDLE);
    setGeneratedImageUrl(null);
    setMainFiles([]);
    setMainPreviewUrls([]);
    setBgFiles([]);
    setBgPreviewUrls([]);
    setRefFiles([]);
    setRefPreviewUrls([]);
    setUserPrompt("");
    setErrorMsg(null);
    clearSelection();
    setEditPrompt("");
  }, [clearSelection]);

  const handleDownload = useCallback(() => {
    if (!generatedImageUrl) return;
    const link = document.createElement('a');
    link.download = `thumbnail-${Date.now()}.png`;
    link.href = generatedImageUrl;
    link.click();
    toast.success('이미지가 다운로드되었습니다!');
  }, [generatedImageUrl]);

  // 우측 패널 콘텐츠 메모이제이션
  const rightPanelContent = useMemo(() => {
    if (appState === AppState.GENERATING) return null;

    if (appState === AppState.EDITING && generatedImageUrl) {
      return (
        <div className="space-y-6">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-1.5 h-5 bg-primary rounded-full"></div>
            <h3 className="text-lg font-bold">이미지 편집</h3>
          </div>

          <div className="space-y-4">
            <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10 text-[11px] space-y-2 leading-relaxed font-medium text-slate-600">
              <p className="font-bold text-primary">인페인팅 가이드:</p>
              <p>1. 왼쪽 이미지에서 수정할 영역을 드래그하세요.</p>
              <p>2. 아래에 변경할 내용을 입력하고 적용하세요.</p>
            </div>

            <StableTextarea
              label="수정 프롬프트"
              placeholder="예: 이 부분을 빨간색 모자로 바꿔줘, 또는 이 물체를 지워줘"
              value={editPrompt}
              onChange={setEditPrompt}
              disabled={isEditing}
              className="min-h-[100px] bg-slate-50/50 border-slate-200 rounded-xl focus:ring-primary/20 resize-none p-4 text-sm"
            />

            <div className="flex gap-2">
              <Button
                onClick={clearSelection}
                variant="outline"
                className="flex-1 h-12 rounded-xl border-slate-200 font-bold"
                disabled={isEditing}
              >
                <Eraser className="h-4 w-4 mr-2" />
                영역 취소
              </Button>
              <Button
                onClick={handleApplyEdit}
                disabled={lassoPoints.length === 0 || isEditing}
                className="flex-[1.5] h-12 rounded-xl font-bold shadow-sm"
              >
                {isEditing ? (
                  <RefreshCcw className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Sparkles className="h-4 w-4 mr-2" />
                )}
                부분 수정 적용
              </Button>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 space-y-3">
            <div className="flex items-center gap-2 mb-1 px-1">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Actions</span>
            </div>
            <Button onClick={handleDownload} className="w-full h-12 rounded-xl font-bold shadow-lg shadow-primary/10">
              <Download className="h-4 w-4 mr-2" />
              이미지 다운로드
            </Button>
            <Button onClick={handleReset} variant="outline" className="w-full h-12 rounded-xl font-bold border-slate-200 text-slate-500">
              <RefreshCcw className="h-4 w-4 mr-2" />
              새로 만들기
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-1.5 h-5 bg-primary rounded-full"></div>
          <h3 className="text-lg font-bold">생성 설정</h3>
        </div>

        <div className="space-y-4">
          <StableTextarea
            label="분위기 / 연출 가이드"
            placeholder="예: 따뜻하고 포근한 크리스마스 분위기, 또는 깔끔하고 미니멀한 스타일. 비워두면 밝고 자연스러운 브이로그 스타일로 생성됩니다."
            value={userPrompt}
            onChange={setUserPrompt}
            className="min-h-[120px] bg-slate-50/50 border-slate-200 rounded-xl focus:ring-primary/20 resize-none p-4 text-sm"
          />

          <div className="space-y-2">
            <Label className="text-sm font-bold text-slate-700 ml-1">이미지 비율</Label>
            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={() => setAspectRatio("16:9")}
                variant={aspectRatio === "16:9" ? "default" : "outline"}
                className={`h-auto py-4 flex-col gap-2 rounded-2xl border-2 transition-all ${aspectRatio === "16:9" ? 'border-primary ring-2 ring-primary/10' : 'border-slate-100'}`}
              >
                <div className="w-10 h-6 border-2 border-current rounded-sm opacity-60"></div>
                <span className="font-bold text-xs">가로형 (16:9)</span>
              </Button>
              <Button
                onClick={() => setAspectRatio("9:16")}
                variant={aspectRatio === "9:16" ? "default" : "outline"}
                className={`h-auto py-4 flex-col gap-2 rounded-2xl border-2 transition-all ${aspectRatio === "9:16" ? 'border-primary ring-2 ring-primary/10' : 'border-slate-100'}`}
              >
                <div className="w-5 h-8 border-2 border-current rounded-sm opacity-60"></div>
                <span className="font-bold text-xs">세로형 (9:16)</span>
              </Button>
            </div>
          </div>

          <Button
            onClick={handleGenerate}
            className="w-full h-14 text-lg font-bold shadow-lg shadow-primary/20 rounded-2xl mt-4"
            disabled={mainFiles.length === 0}
          >
            <Sparkles className="mr-2 h-5 w-5" />
            이미지 생성하기
          </Button>
        </div>

        <div className="p-5 bg-blue-50/50 rounded-2xl border border-blue-100/50">
          <h4 className="text-[10px] font-bold text-blue-700 mb-1.5 uppercase tracking-wider">Information</h4>
          <ul className="text-[11px] text-blue-600/80 space-y-1.5 font-medium leading-relaxed">
            <li>• 메인 아이템을 먼저 업로드하세요.</li>
            <li>• 1번 사진이 가장 크게 배치됩니다.</li>
            <li>• 배경 소품은 이미지의 품질을 높여줍니다.</li>
          </ul>
        </div>
      </div>
    );
  }, [appState, generatedImageUrl, editPrompt, isEditing, clearSelection, handleApplyEdit, lassoPoints.length, handleDownload, handleReset, userPrompt, aspectRatio, handleGenerate, mainFiles.length]);

  // 우측 패널 설정
  useEffect(() => {
    setContent(rightPanelContent);
  }, [setContent, rightPanelContent]);

  // 언마운트 시에만 콘텐츠 초기화
  useEffect(() => {
    return () => setContent(null);
  }, [setContent]);

  const aspectClass = aspectRatio === "16:9" ? "aspect-video" : "aspect-[9/16] max-w-sm mx-auto";

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* IDLE State: Upload & Configure */}
      {appState === AppState.IDLE && (
        <div className="space-y-8 animate-in fade-in duration-700">
          {/* Main Content Area */}
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200/60 p-8 space-y-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-primary/10 rounded-xl">
                  <ImageIcon className="w-5 h-5 text-primary" />
                </div>
                <h2 className="text-2xl font-bold text-slate-800 tracking-tight">메인 아이템</h2>
              </div>
              {mainFiles.length > 0 && (
                <Button variant="ghost" size="sm" onClick={() => { setMainFiles([]); setMainPreviewUrls([]); }} className="text-slate-400 hover:text-red-500 rounded-xl">
                  <Trash2 className="w-4 h-4 mr-1.5" /> 전체 삭제
                </Button>
              )}
            </div>

            <div className="border-2 border-dashed border-slate-200 rounded-3xl p-10 cursor-pointer relative hover:border-primary/50 hover:bg-slate-50 transition-all group">
              <input
                ref={mainInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleMainFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                disabled={mainFiles.length >= 6}
              />
              <div className="flex flex-col items-center text-center">
                {mainPreviewUrls.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-6 w-full relative z-20">
                    {mainPreviewUrls.map((url, idx) => (
                      <div
                        key={url}
                        draggable
                        onDragStart={(e) => handleDragStart(e, idx)}
                        onDragOver={(e) => handleDragOver(e, idx)}
                        onDrop={(e) => handleDrop(e, idx)}
                        className={`aspect-square rounded-2xl overflow-hidden relative group cursor-grab active:cursor-grabbing transition-all ring-1 ring-slate-200/50 shadow-sm ${draggedIndex === idx ? 'opacity-50 scale-95 border-2 border-primary ring-4 ring-primary/5' : 'hover:scale-[1.02] hover:shadow-md'
                          }`}
                      >
                        <img src={url} alt={`Main ${idx}`} className="w-full h-full object-cover pointer-events-none" />
                        <div className="absolute top-3 left-3 bg-black/60 text-[10px] font-bold text-white px-2 py-1 rounded backdrop-blur-md z-10 pointer-events-none shadow-lg">
                          ITEM {idx + 1}
                        </div>
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[1px]">
                          <Button
                            size="icon"
                            variant="secondary"
                            className="rounded-xl shadow-lg"
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleRemoveMainImage(idx); }}
                          >
                            <Trash2 className="h-5 w-5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    {mainFiles.length < 6 && (
                      <div
                        onClick={() => mainInputRef.current?.click()}
                        className="aspect-square rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-300 hover:border-primary/50 hover:text-primary transition-all cursor-pointer bg-white"
                      >
                        <Upload className="w-8 h-8 mb-2" />
                        <span className="text-xs font-bold">추가하기</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center space-y-4">
                    <div className="w-20 h-20 bg-slate-100 rounded-3xl flex items-center justify-center text-slate-400 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                      <Upload className="w-10 h-10" />
                    </div>
                    <div>
                      <p className="text-xl font-bold text-slate-700 mb-1">썸네일에 넣을 메인 아이템을 올려보세요</p>
                      <p className="text-sm text-slate-400 font-medium tracking-tight">여기에 클릭하여 이미지를 업로드하거나 드래그 앤 드롭 하세요 (최대 6개)</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200/60 p-8 space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-blue-50 rounded-xl">
                    <ImageIcon className="w-5 h-5 text-blue-500" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-800 tracking-tight">배경 소품</h3>
                </div>
                {bgFiles.length > 0 && (
                  <Button variant="ghost" size="sm" onClick={() => { setBgFiles([]); setBgPreviewUrls([]); }} className="text-slate-400 hover:text-red-500 rounded-xl">
                    <Trash2 className="w-4 h-4 mr-1.5" /> 삭제
                  </Button>
                )}
              </div>

              <div className="border-2 border-dashed border-slate-100 rounded-3xl p-6 cursor-pointer relative hover:border-blue-500/50 hover:bg-slate-50/50 transition-all group min-h-[160px] flex items-center justify-center">
                <input
                  ref={bgInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleBgFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  disabled={bgFiles.length >= 2}
                />
                <div className="w-full">
                  {bgPreviewUrls.length > 0 ? (
                    <div className="grid grid-cols-2 gap-4 w-full relative z-20">
                      {bgPreviewUrls.map((url, idx) => (
                        <div key={url} className="aspect-square rounded-2xl overflow-hidden relative group ring-1 ring-slate-100 shadow-sm">
                          <img src={url} alt={`Bg ${idx}`} className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Button
                              size="icon"
                              variant="secondary"
                              className="rounded-xl shadow-lg h-8 w-8"
                              onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleRemoveBgImage(idx); }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                      {bgFiles.length < 2 && (
                        <div
                          onClick={() => bgInputRef.current?.click()}
                          className="aspect-square rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-300 hover:border-blue-500/50 hover:text-blue-500 transition-all cursor-pointer bg-white"
                        >
                          <Upload className="w-6 h-6 mb-1" />
                          <span className="text-[10px] font-bold">추가</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center text-slate-300">
                      <Upload className="w-8 h-8 mb-2" />
                      <span className="text-sm font-bold">배경 소품 업로드</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-3xl shadow-sm border border-slate-200/60 p-8 space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-orange-50 rounded-xl">
                    <Sparkles className="w-5 h-5 text-orange-500" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-800 tracking-tight">구도 참고</h3>
                </div>
                {refFiles.length > 0 && (
                  <Button variant="ghost" size="sm" onClick={handleRemoveRefImage} className="text-slate-400 hover:text-red-500 rounded-xl">
                    <Trash2 className="w-4 h-4 mr-1.5" /> 삭제
                  </Button>
                )}
              </div>

              <div className="border-2 border-dashed border-slate-100 rounded-3xl p-6 cursor-pointer relative hover:border-orange-500/50 hover:bg-slate-50/50 transition-all group min-h-[160px] flex items-center justify-center">
                <input
                  ref={refInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleRefFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  disabled={refFiles.length >= 1}
                />
                <div className="w-full">
                  {refPreviewUrls.length > 0 ? (
                    <div className="w-full aspect-video rounded-2xl overflow-hidden relative mx-auto bg-muted z-20 ring-1 ring-slate-100 shadow-sm">
                      <img src={refPreviewUrls[0]} alt="Reference" className="w-full h-full object-contain" />
                      <div className="absolute inset-0 bg-orange-500/10 pointer-events-none border-2 border-orange-400/50 rounded-2xl"></div>
                      <div className="absolute top-2 right-2 bg-orange-500 text-[10px] font-bold text-white px-2 py-1 rounded shadow-lg backdrop-blur-md">분석 중</div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center text-slate-300">
                      <ImageIcon className="w-8 h-8 mb-2" />
                      <span className="text-sm font-bold">레퍼런스 이미지 업로드</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* GENERATING State */}
      {appState === AppState.GENERATING && (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
          <div className="w-24 h-24 bg-gradient-to-tr from-primary to-purple-600 rounded-full animate-spin mb-8 blur-sm"></div>
          <h2 className="text-2xl font-bold mb-2">이미지를 생성하고 있습니다...</h2>
          <p className="text-muted-foreground max-w-md">
            Gemini가 요청하신 아이템을 멋지게 배치하고 있습니다. 잠시만 기다려주세요.
          </p>
        </div>
      )}

      {/* ERROR State */}
      {appState === AppState.ERROR && (
        <div className="flex flex-col items-center justify-center min-h-[50vh] text-center space-y-4">
          <div className="bg-destructive/10 text-destructive p-6 rounded-xl max-w-md">
            <h3 className="font-bold text-lg mb-2">생성 실패</h3>
            <p>{errorMsg}</p>
          </div>
          <Button onClick={() => setAppState(AppState.IDLE)} variant="secondary">
            다시 시도하기
          </Button>
        </div>
      )}

      {/* EDITING State */}
      {appState === AppState.EDITING && generatedImageUrl && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700">
          <Card className="rounded-3xl shadow-xl border-slate-200/60 overflow-hidden ring-4 ring-primary/5">
            <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-xl">
                  <Sparkles className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-800">생성된 썸네일</h3>
                  <p className="text-sm text-slate-400 font-medium tracking-tight">영역을 드래그하여 부분 수정할 수 있습니다.</p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={handleGenerate} className="rounded-xl border-slate-200 bg-white font-bold text-slate-600 shadow-sm hover:text-primary transition-all px-4 h-10">
                <RefreshCcw className="h-4 w-4 mr-2" /> 재생성
              </Button>
            </div>
            <CardContent className="p-8">
              <div
                ref={imageContainerRef}
                className={`relative w-full ${aspectClass} rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 shadow-inner group`}
              >
                <img
                  src={generatedImageUrl}
                  alt="Generated"
                  className="absolute inset-0 w-full h-full object-cover select-none pointer-events-none"
                />

                <canvas
                  ref={canvasRef}
                  className={`absolute inset-0 w-full h-full z-10 touch-none ${isDrawing ? 'cursor-crosshair' : 'cursor-default group-hover:bg-black/5 transition-all'}`}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                />

                {isEditing && (
                  <div className="absolute inset-0 bg-black/60 z-20 flex items-center justify-center backdrop-blur-md">
                    <div className="bg-white px-8 py-6 rounded-3xl flex flex-col items-center gap-4 shadow-2xl animate-in zoom-in-95">
                      <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                      <span className="font-extrabold text-slate-800 tracking-tight">수정 중...</span>
                    </div>
                  </div>
                )}

                {lassoPoints.length > 0 && !isEditing && (
                  <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-black/80 text-white text-[11px] font-bold px-4 py-2 rounded-full backdrop-blur-xl z-20 border border-white/10 flex items-center gap-2">
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                    수정 영역 선택됨
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 mt-8 max-w-lg mx-auto">
                <Button
                  onClick={() => handleResize("16:9")}
                  variant={aspectRatio === "16:9" ? "default" : "outline"}
                  className={`h-14 rounded-2xl font-bold transition-all shadow-sm ${aspectRatio === "16:9" ? 'shadow-primary/20 ring-2 ring-primary/10' : 'border-slate-200'}`}
                >
                  가로형 (16:9)
                </Button>
                <Button
                  onClick={() => handleResize("9:16")}
                  variant={aspectRatio === "9:16" ? "default" : "outline"}
                  className={`h-14 rounded-2xl font-bold transition-all shadow-sm ${aspectRatio === "9:16" ? 'shadow-primary/20 ring-2 ring-primary/10' : 'border-slate-200'}`}
                >
                  세로형 (9:16)
                </Button>
              </div>
            </CardContent>
          </Card>
          {/* Hidden mask canvas */}
          <canvas ref={maskCanvasRef} className="hidden" />
        </div>
      )}
    </div>
  );
}
