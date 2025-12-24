"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileUpload } from "@/components/bgm/file-upload";
import { Music, Youtube, Upload, Edit3, AlertCircle, Layers, ArrowLeftRight } from "lucide-react";
import { MusicGenerationRequest } from "@/types/bgm";
import { supabase } from "@/lib/supabase";

interface BGMFormProps {
  onMusicGenerated: (music: any) => void;
  isGenerating: boolean;
  setIsGenerating: (generating: boolean) => void;
  onPromptChange?: (prompt: string) => void;
  currentPrompt?: string;
}

export function BGMForm({ onMusicGenerated, isGenerating, setIsGenerating, onPromptChange, currentPrompt }: BGMFormProps) {
  const [prompt, setPrompt] = useState(currentPrompt || "");
  
  // 외부에서 currentPrompt가 변경되면 내부 상태도 업데이트
  useEffect(() => {
    if (currentPrompt !== undefined && currentPrompt !== prompt) {
      setPrompt(currentPrompt);
    }
  }, [currentPrompt, prompt]);


  const [musicLengthMs, setMusicLengthMs] = useState<number | undefined>(30000);
  const [autoDuration, setAutoDuration] = useState(false);
  // 변형 선택 제거: 항상 1개 생성
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [preciseMode, setPreciseMode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadedFileType, setUploadedFileType] = useState<string>("");

  const handleFileAnalysis = async (file: File, fileType: string) => {
    setIsAnalyzing(true);
    setError(null);
    
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("fileType", fileType);

      const response = await fetch("/api/bgm/analyze-file", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      if (data.success) {
        setPrompt(data.prompt);
        if (onPromptChange) {
          onPromptChange(data.prompt);
        }
        setError(null);
      } else {
        throw new Error(data.error || "분석에 실패했습니다.");
      }
    } catch (error) {
      console.error("파일 분석 오류:", error);
      const errorMessage = error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.";
      setError(`파일 분석에 실패했습니다: ${errorMessage}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleFileSelect = (file: File, type: string) => {
    setSelectedFile(file);
    setUploadedFileType(type);
  };

  const handleGenerateMusic = async () => {
    if (!prompt.trim()) {
      setError("프롬프트를 입력해주세요.");
      return;
    }

    setError(null);
    const request: MusicGenerationRequest = {
      prompt: prompt.trim(),
      musicLengthMs: autoDuration ? undefined : musicLengthMs,
      autoDuration,
      numVariants: 1,
    };

    setIsGenerating(true);
    try {
      console.log("음악 생성 요청 시작:", request);
      
      const response = await fetch("/api/bgm/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      });

      console.log("음악 생성 API 응답 상태:", response.status);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error("음악 생성 API 오류 응답:", errorData);
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log("음악 생성 API 성공 응답:", data);
      
      if (data.success) {
        const items = Array.isArray(data.music) ? data.music : [data.music];
        items.forEach((item: any) => onMusicGenerated(item));
        // 생성 기록 저장 (인증 필요 시 토큰 헤더 추가 필요)
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            // 소스 타입과 데이터 결정
            let sourceType = 'manual';
            let sourceData = null;
            let fileType: string | null = null;

            if (selectedFile) {
              sourceType = 'file';
              sourceData = selectedFile.name;
              fileType = uploadedFileType || null;
            }
            for (const [idx, item] of items.entries()) {
              await fetch('/api/bgm/history', {
                method: 'POST',
                headers: { 
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${session.access_token}`
                },
                body: JSON.stringify({
                  prompt: item.prompt,
                  audioUrl: item.audioUrl,
                  duration: item.duration,
                  variantIndex: 1,
                  numVariants: 1,
                  sourceType,
                  sourceData,
                  fileType,
                }),
              });
            }
          }
        } catch (e) {
          console.warn('BGM 기록 저장 실패(무시 가능):', e);
        }
        setPrompt(""); // 프롬프트 초기화
        if (onPromptChange) {
          onPromptChange("");
        }
        setError(null);
        alert("음악이 성공적으로 생성되었습니다!");
      } else {
        throw new Error(data.error || "음악 생성에 실패했습니다.");
      }
    } catch (error) {
      console.error("음악 생성 오류:", error);
      const errorMessage = error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.";
      setError(`음악 생성에 실패했습니다: ${errorMessage}`);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 오류 메시지 표시 */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-500" />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        </div>
      )}

      {/* 입력 영역 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">음악 생성 프롬프트</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">


          {/* 파일 업로드 */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              파일 업로드 분석
            </Label>
            <FileUpload 
              onFileAnalyzed={handleFileAnalysis} 
              onFileSelected={handleFileSelect} 
              isAnalyzing={isAnalyzing}
            />
            <p className="text-xs text-muted-foreground">
              이미지, 오디오, 텍스트 파일을 업로드하면 AI가 분석하여 음악 생성 프롬프트를 자동으로 작성합니다.
            </p>
          </div>

          {/* 직접 프롬프트 입력 */}
          <div className="space-y-2">
            <Label htmlFor="prompt" className="flex items-center gap-2">
              <Edit3 className="h-4 w-4" />
              직접 프롬프트 작성
            </Label>
            <Textarea
              id="prompt"
              placeholder="예: Create a calm and peaceful ambient track in C major at a slow tempo. Use soft piano melodies with gentle strings and subtle nature sounds. The music should convey tranquility and relaxation..."
              value={prompt}
              onChange={(e) => {
                const newPrompt = e.target.value;
                setPrompt(newPrompt);
                if (onPromptChange) {
                  onPromptChange(newPrompt);
                }
              }}
              rows={4}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              원하는 음악의 분위기, 템포, 악기, 조성 등을 영어로 자세히 설명해주세요.
            </p>
          </div>

          {/* 프롬프트 하단 퀵 설정 바 */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="px-2"
                  onClick={() => setAutoDuration((a) => !a)}
                  title="Auto 길이 전환"
                >
                  <ArrowLeftRight className="h-4 w-4 mr-1" />
                  <span>{autoDuration ? 'Auto' : `${(musicLengthMs || 0) / 1000}s`}</span>
                </Button>
                {!autoDuration && (
                  <div className="flex gap-1">
                    {[10000, 30000, 60000, 120000].map((len) => (
                      <Button
                        key={len}
                        variant={musicLengthMs === len ? 'secondary' : 'outline'}
                        size="sm"
                        onClick={() => setMusicLengthMs(len)}
                      >
                        {len / 1000}s
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* 생성 버튼 */}
            <Button
              onClick={handleGenerateMusic}
              disabled={isGenerating || !prompt.trim()}
              size="sm"
              className="flex items-center gap-2"
            >
              <Music className="h-4 w-4" />
              {isGenerating ? "생성 중..." : "Generate"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 생성 설정 요약 */}
      {prompt && (
        <div className="text-center text-sm text-muted-foreground">
          생성 설정: {autoDuration ? 'Auto duration' : `${(musicLengthMs || 0) / 1000}초`}
        </div>
      )}
    </div>
  );
}
