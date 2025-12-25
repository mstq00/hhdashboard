"use client";

import React, { useState, useCallback, useEffect } from 'react';
import { analyzeAudioForSuno } from '@/lib/suno';
import { Button } from '@/components/ui/button';
import { Upload, Copy, Check, Sparkles, Music, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useRightPanel } from '@/lib/context/right-panel-context';

export default function SunoPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isInstrumental, setIsInstrumental] = useState<boolean>(false);
  const [copied, setCopied] = useState(false);

  const { setContent } = useRightPanel();

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setAnalysisResult(null);
      setError(null);
    }
  }, []);

  const handleAnalyzeClick = useCallback(async () => {
    if (!selectedFile) {
      setError("먼저 오디오 파일을 선택해주세요.");
      toast.error("먼저 오디오 파일을 선택해주세요.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setAnalysisResult(null);

    try {
      const result = await analyzeAudioForSuno(selectedFile, isInstrumental);
      setAnalysisResult(result);
      toast.success('프롬프트가 생성되었습니다!');
    } catch (err: any) {
      const errorMsg = err.message || "분석 중 예상치 못한 오류가 발생했습니다.";
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  }, [selectedFile, isInstrumental]);

  const handleCopy = () => {
    if (analysisResult) {
      navigator.clipboard.writeText(analysisResult);
      setCopied(true);
      toast.success('클립보드에 복사되었습니다!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // 우측 패널 콘텐츠 메모이제이션
  const rightPanelContent = React.useMemo(() => (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-1.5 h-5 bg-primary rounded-full"></div>
        <h3 className="text-lg font-bold">생성 옵션</h3>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 transition-all hover:bg-slate-100/50">
          <div className="space-y-0.5">
            <label htmlFor="instrumental-toggle" className="text-sm font-bold text-slate-700 cursor-pointer">
              Instrumental
            </label>
            <p className="text-[10px] text-slate-400 font-medium">연주곡 전용 프롬프트 생성</p>
          </div>
          <button
            id="instrumental-toggle"
            onClick={() => setIsInstrumental((prev) => !prev)}
            disabled={isLoading}
            className={`relative inline-flex items-center h-6 rounded-full w-11 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary/20 disabled:cursor-not-allowed ${isInstrumental ? 'bg-primary' : 'bg-slate-200'
              }`}
          >
            <span
              className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform duration-300 shadow-sm ${isInstrumental ? 'translate-x-6' : 'translate-x-1'
                }`}
            />
          </button>
        </div>

        <Button
          onClick={handleAnalyzeClick}
          disabled={!selectedFile || isLoading}
          className="w-full shadow-lg shadow-primary/20"
          size="lg"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              분석 중...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-5 w-5" />
              프롬프트 생성
            </>
          )}
        </Button>

        {error && (
          <div className="p-3 bg-red-50 border border-red-100 text-red-500 rounded-xl text-xs font-medium">
            {error}
          </div>
        )}
      </div>

      <div className="p-5 bg-blue-50/50 rounded-2xl border border-blue-100/50">
        <h4 className="text-xs font-bold text-blue-700 mb-2 flex items-center gap-1.5">
          <Sparkles className="w-3 h-3" />
          TIP
        </h4>
        <p className="text-[11px] text-blue-600/80 leading-relaxed font-medium">
          최근 유행하는 스타일의 오디오 파일을 업로드하면 SUNO에서 바로 사용 가능한 고품질 프롬프트를 얻을 수 있습니다.
        </p>
      </div>
    </div>
  ), [isInstrumental, isLoading, selectedFile, error, handleAnalyzeClick]);

  // 우측 패널 설정
  useEffect(() => {
    setContent(rightPanelContent);
  }, [setContent, rightPanelContent]);

  // 언마운트 시에만 콘텐츠 초기화
  useEffect(() => {
    return () => setContent(null);
  }, [setContent]);

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Main Upload Card */}
      <div className="bg-white rounded-[2.5rem] p-10 shadow-sm border border-slate-200/60 space-y-8">
        <div>
          <input
            type="file"
            id="audio-file"
            onChange={handleFileSelect}
            className="hidden"
            accept="audio/*"
            disabled={isLoading}
          />
          <label
            htmlFor="audio-file"
            className={`flex flex-col items-center justify-center w-full p-16 border-2 border-dashed rounded-3xl cursor-pointer transition-all duration-300 ${selectedFile
              ? 'border-primary bg-primary/5 shadow-inner'
              : 'border-slate-200 hover:border-primary/50 hover:bg-slate-50'
              } ${isLoading ? 'cursor-not-allowed opacity-50' : ''}`}
          >
            <div className="flex flex-col items-center gap-4">
              <div className={`p-5 rounded-2xl transition-all duration-300 ${selectedFile ? 'bg-primary text-white scale-110 shadow-lg shadow-primary/30' : 'bg-slate-100 text-slate-400 group-hover:bg-primary/10 group-hover:text-primary'}`}>
                <Upload size={32} strokeWidth={1.5} />
              </div>
              <div className="text-center">
                <p className="text-xl font-bold text-slate-700">
                  {selectedFile ? (
                    <span className="text-primary">{selectedFile.name}</span>
                  ) : (
                    <span>오디오 파일을 업로드하세요</span>
                  )}
                </p>
                <p className="text-sm text-slate-400 mt-1 font-medium italic">MP3, WAV, FLAC (최대 10MB)</p>
              </div>
              {selectedFile && (
                <div className="mt-2 px-4 py-1.5 bg-green-50 text-green-600 text-xs font-bold rounded-full border border-green-100 flex items-center gap-1.5 animate-in slide-in-from-top-2">
                  <Check className="h-3 w-3" />
                  파일 선택됨
                </div>
              )}
            </div>
          </label>
        </div>
      </div>

      {/* Analysis Result */}
      {analysisResult && (
        <div className="animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
          <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-200/60 overflow-hidden ring-4 ring-primary/5">
            <div className="px-10 py-8 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-primary" />
                </div>
                <h3 className="text-xl font-bold text-slate-800">생성된 SUNO 프롬프트</h3>
              </div>
              <Button
                onClick={handleCopy}
                variant="ghost"
                size="sm"
                className={`rounded-xl h-10 px-4 transition-all ${copied ? 'bg-green-50 text-green-600 border border-green-100' : 'hover:bg-primary/10 hover:text-primary border border-transparent hover:border-primary/20'}`}
              >
                {copied ? (
                  <><Check className="mr-2 h-4 w-4" />복사됨</>
                ) : (
                  <><Copy className="mr-2 h-4 w-4" />복사하기</>
                )}
              </Button>
            </div>
            <div className="p-10">
              <div className="bg-slate-50 p-8 rounded-[2rem] border border-slate-100 text-slate-700 leading-relaxed font-mono whitespace-pre-wrap select-all transition-all hover:bg-slate-100/50 shadow-inner">
                {analysisResult}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

