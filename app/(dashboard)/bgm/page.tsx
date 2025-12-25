"use client";

import { useState, useEffect } from "react";
import { BGMForm } from "@/components/bgm/bgm-form";
import { MusicList } from "@/components/bgm/music-list";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Music, FileAudio, Youtube, History, RefreshCw } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";

export default function BGMStudioPage() {
  const [generatedMusic, setGeneratedMusic] = useState<any[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [currentPrompt, setCurrentPrompt] = useState("");


  const handleMusicGenerated = (music: any) => {
    setGeneratedMusic(prev => [music, ...prev]);
  };

  const loadHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch('/api/bgm/history', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setGeneratedMusic(result.data || []);
        }
      }
    } catch (error) {
      console.error('히스토리 로드 오류:', error);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleMusicDeleted = async (id: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(`/api/bgm/history?id=${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (response.ok) {
        setGeneratedMusic(prev => prev.filter(music => music.id !== id));
      }
    } catch (error) {
      console.error('음악 삭제 오류:', error);
    }
  };

  useEffect(() => {
    // 페이지 로드 시 히스토리 자동 로드
    loadHistory();
  }, []);

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center gap-3">
        <Music className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">BGM Studio</h1>
          <p className="text-muted-foreground">
            AI를 활용하여 고품질 배경음악을 생성하세요
          </p>
        </div>
      </div>

      {/* 음악 생성 섹션 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileAudio className="h-5 w-5" />
            음악 생성
          </CardTitle>
        </CardHeader>
        <CardContent>
          <BGMForm 
            onMusicGenerated={handleMusicGenerated}
            isGenerating={isGenerating}
            setIsGenerating={setIsGenerating}
            onPromptChange={setCurrentPrompt}
            currentPrompt={currentPrompt}
          />
        </CardContent>
      </Card>

      {/* 히스토리 토글 및 생성된 음악 목록 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              생성된 음악 ({generatedMusic.length})
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowHistory(!showHistory)}
              >
                {showHistory ? "숨기기" : "히스토리 보기"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={loadHistory}
                disabled={isLoadingHistory}
              >
                <RefreshCw className={`h-4 w-4 ${isLoadingHistory ? 'animate-spin' : ''}`} />
                새로고침
              </Button>
            </div>
          </div>
        </CardHeader>
        {showHistory && (
          <CardContent>
            <MusicList 
              musicList={generatedMusic}
              onMusicDeleted={handleMusicDeleted}
              onPromptReuse={(prompt) => setCurrentPrompt(prompt)}
            />
          </CardContent>
        )}
      </Card>
    </div>
  );
}
