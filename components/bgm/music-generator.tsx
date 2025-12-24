"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Music, Loader2, CheckCircle, XCircle } from "lucide-react";
import { MusicGenerationRequest } from "@/types/bgm";

interface MusicGeneratorProps {
  prompt: string;
  musicLengthMs: number;
  onMusicGenerated: (music: any) => void;
  onError: (error: string) => void;
}

export function MusicGenerator({ 
  prompt, 
  musicLengthMs, 
  onMusicGenerated, 
  onError 
}: MusicGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<'idle' | 'generating' | 'completed' | 'error'>('idle');

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      onError('프롬프트를 입력해주세요.');
      return;
    }

    setIsGenerating(true);
    setStatus('generating');
    setProgress(0);

    try {
      // 진행률 시뮬레이션 (실제로는 API 응답을 기다려야 함)
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 500);

      const request: MusicGenerationRequest = {
        prompt: prompt.trim(),
        musicLengthMs,
      };

      const response = await fetch("/api/bgm/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      });

      clearInterval(progressInterval);
      setProgress(100);

      const data = await response.json();
      if (data.success) {
        setStatus('completed');
        onMusicGenerated(data.music);
        setTimeout(() => {
          setStatus('idle');
          setProgress(0);
        }, 2000);
      } else {
        throw new Error(data.error || '음악 생성에 실패했습니다.');
      }
    } catch (error) {
      setStatus('error');
      setProgress(0);
      onError(error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.');
      setTimeout(() => {
        setStatus('idle');
      }, 3000);
    } finally {
      setIsGenerating(false);
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'generating':
        return <Loader2 className="h-5 w-5 animate-spin" />;
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Music className="h-5 w-5" />;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'generating':
        return '음악 생성 중...';
      case 'completed':
        return '음악 생성 완료!';
      case 'error':
        return '음악 생성 실패';
      default:
        return '음악 생성 준비됨';
    }
  };

  const getButtonText = () => {
    switch (status) {
      case 'generating':
        return '생성 중...';
      case 'completed':
        return '다시 생성';
      case 'error':
        return '재시도';
      default:
        return '음악 생성하기';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {getStatusIcon()}
          {getStatusText()}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 진행률 표시 */}
        {status === 'generating' && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>생성 진행률</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} className="w-full" />
          </div>
        )}

        {/* 상태별 메시지 */}
        {status === 'completed' && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-md">
            <p className="text-sm text-green-800">
              음악이 성공적으로 생성되었습니다! 생성된 음악 목록에서 확인할 수 있습니다.
            </p>
          </div>
        )}

        {status === 'error' && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-800">
              음악 생성 중 오류가 발생했습니다. 다시 시도해주세요.
            </p>
          </div>
        )}

        {/* 생성 버튼 */}
        <Button
          onClick={handleGenerate}
          disabled={isGenerating || !prompt.trim()}
          className="w-full"
          size="lg"
        >
          {getButtonText()}
        </Button>

        {/* 음악 길이 정보 */}
        <div className="text-center text-sm text-muted-foreground">
          생성될 음악 길이: {musicLengthMs / 1000}초
        </div>
      </CardContent>
    </Card>
  );
}



