"use client";

import React, { useState, useEffect } from 'react';
import { Download, Sparkles, RefreshCcw, Layers, Trash2, Sliders, PenTool } from 'lucide-react';
import { FileUpload } from '@/components/lineart/file-upload';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { LineStyle } from '@/types/lineart';
import { generateLineArt, removeWhiteBackground } from '@/lib/lineart';
import { toast } from 'sonner';
import { useRightPanel } from '@/lib/context/right-panel-context';

export default function LineArtPage() {
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [processedImage, setProcessedImage] = useState<string | null>(null);

  const [isGenerating, setIsGenerating] = useState(false);
  const [isProcessingBg, setIsProcessingBg] = useState(false);
  const [removeBg, setRemoveBg] = useState(true);

  const [selectedStyle, setSelectedStyle] = useState<LineStyle>(LineStyle.MINIMAL);
  const [customPrompt, setCustomPrompt] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { setContent } = useRightPanel();

  const handleReset = React.useCallback(() => {
    setOriginalImage(null);
    setGeneratedImage(null);
    setProcessedImage(null);
    setError(null);
  }, []);

  const handleGenerate = React.useCallback(async () => {
    if (!originalImage) return;

    setIsGenerating(true);
    setError(null);
    setGeneratedImage(null);
    setProcessedImage(null);

    try {
      const result = await generateLineArt(originalImage, selectedStyle, customPrompt);
      setGeneratedImage(result);
      toast.success('라인아트가 생성되었습니다!');
    } catch (err: any) {
      const errorMessage = err.message || "선화 생성에 실패했습니다. 다시 시도해 주세요.";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsGenerating(false);
    }
  }, [originalImage, selectedStyle, customPrompt]);

  // Effect to handle background removal whenever generated image changes or toggle changes
  useEffect(() => {
    const processBg = async () => {
      if (!generatedImage) return;

      if (!removeBg) {
        setProcessedImage(generatedImage);
        return;
      }

      setIsProcessingBg(true);
      try {
        const transparentResult = await removeWhiteBackground(generatedImage);
        setProcessedImage(transparentResult);
      } catch (e) {
        console.error("BG Removal failed", e);
        setProcessedImage(generatedImage); // Fallback
      } finally {
        setIsProcessingBg(false);
      }
    };

    processBg();
  }, [generatedImage, removeBg]);

  const handleDownload = React.useCallback(() => {
    if (!processedImage) return;
    const link = document.createElement('a');
    link.href = processedImage;
    link.download = `lineart-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('이미지가 다운로드되었습니다!');
  }, [processedImage]);

  // 우측 패널 기본 가이드 콘텐츠
  const guideContent = React.useMemo(() => (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-1.5 h-5 bg-primary rounded-full"></div>
        <h3 className="text-lg font-bold text-slate-800">라인아트 스튜디오</h3>
      </div>
      <div className="p-5 bg-blue-50/50 rounded-3xl border border-blue-100/50 flex gap-4">
        <div className="w-10 h-10 bg-blue-100 rounded-2xl flex items-center justify-center shrink-0">
          <Sparkles className="w-5 h-5 text-blue-600" />
        </div>
        <div className="space-y-1">
          <h5 className="text-xs font-black text-blue-800 uppercase">Usage Guide</h5>
          <p className="text-[11px] text-blue-600/80 leading-relaxed font-medium">이미지를 업로드하면 AI가 정밀한 라인아트를 생성해드립니다. 다양한 스타일 중 하나를 선택해보세요.</p>
        </div>
      </div>
    </div>
  ), []);

  // 우측 패널 콘텐츠 메모이제이션
  const rightPanelContent = React.useMemo(() => (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-1.5 h-5 bg-primary rounded-full"></div>
        <h3 className="text-lg font-bold text-slate-800">설정</h3>
      </div>

      <div className="space-y-6">
        {/* 스타일 프리셋 */}
        <div className="space-y-3">
          <label className="text-sm font-bold text-slate-700 ml-1">스타일 프리셋</label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: LineStyle.MINIMAL, label: '미니멀' },
              { id: LineStyle.DETAILED, label: '디테일' },
              { id: LineStyle.ORGANIC, label: '손그림' }
            ].map((style) => (
              <button
                key={style.id}
                onClick={() => setSelectedStyle(style.id)}
                className={`px-3 py-2.5 text-xs font-bold rounded-xl border transition-all
                  ${selectedStyle === style.id
                    ? 'bg-primary text-white border-primary shadow-md shadow-primary/20'
                    : 'bg-white border-slate-200 text-slate-500 hover:border-primary/50 hover:bg-slate-50'}`}
              >
                {style.label}
              </button>
            ))}
          </div>
        </div>

        {/* 추가 요청사항 */}
        <div className="space-y-3">
          <label className="text-sm font-bold text-slate-700 ml-1">추가 요청사항 (선택)</label>
          <Textarea
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            placeholder="예: 선을 더 굵게, 배경 디테일 제거..."
            className="min-h-[100px] border-slate-200 bg-white focus-visible:ring-primary/20 p-4 rounded-2xl resize-none"
          />
        </div>

        <Button
          onClick={handleGenerate}
          disabled={isGenerating || !originalImage}
          className="w-full h-14 text-sm font-bold shadow-lg shadow-primary/10 rounded-2xl"
        >
          {isGenerating ? (
            <RefreshCcw className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="mr-2 h-4 w-4" />
          )}
          {generatedImage ? '다시 생성하기' : '일러스트 생성하기'}
        </Button>

        <Button
          onClick={handleReset}
          variant="outline"
          className="w-full h-12 text-xs font-bold border-slate-200 text-slate-500 rounded-2xl hover:bg-red-50 hover:text-red-500 hover:border-red-100 transition-colors"
        >
          <Trash2 size={14} className="mr-2" /> 초기화
        </Button>

        {/* 원본 미리보기 */}
        {originalImage && (
          <div className="pt-6 border-t border-slate-100 uppercase mt-4">
            <p className="text-[10px] font-bold text-slate-400 tracking-wider mb-3 ml-1">SOURCE IMAGE</p>
            <div className="aspect-square rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 relative">
              <img src={originalImage} alt="Original" className="w-full h-full object-contain" />
            </div>
          </div>
        )}
      </div>
    </div>
  ), [originalImage, generatedImage, isGenerating, selectedStyle, customPrompt, handleGenerate, handleReset]);

  // 우측 패널 설정
  useEffect(() => {
    setContent(originalImage ? rightPanelContent : guideContent);
  }, [setContent, rightPanelContent, guideContent, originalImage]);

  useEffect(() => {
    return () => setContent(null);
  }, [setContent]);

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="bg-white rounded-[2.5rem] p-10 shadow-sm border border-slate-200/60 space-y-8">
        {!originalImage ? (
          <div className="pt-4">
            <FileUpload onImageSelected={setOriginalImage} />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Toolbar for generated image */}
            <div className="flex items-center justify-end gap-4">
              <div className="flex items-center gap-2 group cursor-pointer select-none" onClick={() => setRemoveBg(!removeBg)}>
                <div
                  className={`w-10 h-6 rounded-full transition-all relative ${removeBg ? 'bg-primary' : 'bg-slate-200'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${removeBg ? 'left-5' : 'left-1'}`} />
                </div>
                <span className="text-xs font-bold text-slate-600">배경 제거</span>
              </div>
              {generatedImage && (
                <Button
                  disabled={!processedImage}
                  onClick={handleDownload}
                  size="sm"
                  className="h-10 px-6 rounded-xl font-bold shadow-md shadow-primary/10"
                >
                  <Download size={16} className="mr-2" />
                  PNG 다운로드
                </Button>
              )}
            </div>

            {/* Canvas Area */}
            <div className="relative flex items-center justify-center p-12 bg-slate-50/50 rounded-3xl border border-slate-100 min-h-[500px]">
              {/* 투명 배경 패턴 */}
              {removeBg && (
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
                  style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
              )}

              {!generatedImage ? (
                <div className="text-center">
                  {isGenerating ? (
                    <div className="space-y-6">
                      <div className="w-20 h-20 bg-primary/10 rounded-3xl mx-auto flex items-center justify-center relative">
                        <RefreshCcw className="animate-spin text-primary" size={32} />
                        <div className="absolute inset-0 rounded-3xl border-2 border-primary/20 animate-ping opacity-20"></div>
                      </div>
                      <div>
                        <p className="text-xl font-bold text-slate-800 mb-1">일러스트 변환 중</p>
                        <p className="text-sm text-slate-400 font-medium">선화를 정밀하게 추출하고 있습니다...</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4 text-slate-300">
                      <Layers size={64} className="mx-auto opacity-20" />
                      <p className="font-bold">우측 설정 패널에서 생성을 시작하세요</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="relative w-full h-full flex items-center justify-center animate-in fade-in zoom-in-95 duration-500">
                  {isProcessingBg && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-sm z-10 rounded-2xl">
                      <div className="flex flex-col items-center">
                        <div className="animate-spin w-10 h-10 border-4 border-primary border-t-transparent rounded-full mb-4 shadow-sm"></div>
                        <span className="text-sm font-bold text-primary">배경 투명화 처리 중...</span>
                      </div>
                    </div>
                  )}
                  <img
                    src={processedImage || generatedImage}
                    alt="Generated Line Art"
                    className="max-w-full max-h-[600px] object-contain shadow-2xl rounded-sm ring-1 ring-slate-200/50"
                    style={{ imageRendering: 'high-quality' as any }}
                  />
                </div>
              )}

              {error && (
                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 max-w-md w-full bg-red-50 text-red-600 px-6 py-4 rounded-2xl border border-red-100 text-sm font-bold flex items-center justify-between shadow-lg animate-in slide-in-from-bottom-4">
                  <span className="flex-1">{error}</span>
                  <button onClick={() => setError(null)} className="ml-4 p-1 hover:bg-red-100 rounded-lg">&times;</button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
