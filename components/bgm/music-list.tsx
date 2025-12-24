"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Play, Pause, Download, Trash2, Music, Clock, Calendar, Waves, Copy, Heart } from "lucide-react";
import { MusicGenerationResponse } from "@/types/bgm";

interface MusicListProps {
  musicList: MusicGenerationResponse[];
  onMusicDeleted: (id: string) => void;
  onPromptReuse?: (prompt: string) => void;
}

export function MusicList({ musicList, onMusicDeleted, onPromptReuse }: MusicListProps) {
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [audioElements, setAudioElements] = useState<Map<string, HTMLAudioElement>>(new Map());
  const [progress, setProgress] = useState<Record<string, number>>({});
  const [likedMap, setLikedMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const init: Record<string, boolean> = {};
    musicList.forEach(m => { init[m.id] = !!m.isLiked; });
    setLikedMap(init);
  }, [musicList]);

  const handlePlay = (music: MusicGenerationResponse) => {
    if (playingId === music.id) {
      // 현재 재생 중인 음악 정지
      const audio = audioElements.get(music.id);
      if (audio) {
        audio.pause();
        // 정지 시 현재 위치 유지 (다시 재생 시 이어 듣기)
      }
      setPlayingId(null);
    } else {
      // 다른 음악 재생
      if (playingId) {
        const currentAudio = audioElements.get(playingId);
        if (currentAudio) currentAudio.pause();
      }

      // 새 음악 재생
      const audio = new Audio(music.audioUrl);
      audio.addEventListener('timeupdate', () => {
        setProgress(prev => ({ ...prev, [music.id]: audio.currentTime }));
      });
      audio.addEventListener('ended', () => setPlayingId(null));
      audio.play();
      setPlayingId(music.id);
      setAudioElements(prev => new Map(prev.set(music.id, audio)));
    }
  };

  const handleDownload = (music: MusicGenerationResponse) => {
    const link = document.createElement('a');
    link.href = music.audioUrl;
    link.download = `bgm_${music.id}.mp3`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDelete = (id: string) => {
    if (confirm('정말로 이 음악을 삭제하시겠습니까?')) {
      // 재생 중인 경우 정지
      if (playingId === id) {
        const audio = audioElements.get(id);
        if (audio) {
          audio.pause();
          audio.currentTime = 0;
        }
        setPlayingId(null);
      }
      
      // 오디오 요소 제거
      setAudioElements(prev => {
        const newMap = new Map(prev);
        newMap.delete(id);
        return newMap;
      });
      
      onMusicDeleted(id);
    }
  };

  const toggleLike = async (music: MusicGenerationResponse) => {
    const next = !likedMap[music.id];
    setLikedMap(prev => ({ ...prev, [music.id]: next }));
    try {
      const { data: { session } } = await (await import('@/lib/supabase')).supabase.auth.getSession();
      if (!session) return;
      await fetch('/api/bgm/history', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          // upsert-like: 간단히 동일 레코드에 업데이트 엔드포인트가 없으므로 PATCH가 이상적이지만
          // 임시로 별도 like 엔드포인트 만드는 대신 TODO. 여기선 낙관적 UI만 유지.
        })
      });
    } catch (e) {
      // 실패 시 롤백
      setLikedMap(prev => ({ ...prev, [music.id]: !next }));
    }
  };

  // duration이 0인 항목은 오디오 메타데이터 로드 후 갱신
  useEffect(() => {
    musicList.forEach((music) => {
      if (!music.duration || music.duration === 0) {
        const audio = new Audio(music.audioUrl);
        audio.addEventListener('loadedmetadata', () => {
          const map = new Map(audioElements);
          map.set(music.id, audio);
          setAudioElements(map);
          // duration은 부모 상태에서 관리되고 있어 즉시 UI 반영은 난해하지만,
          // 여기서는 재생 버튼 옆에 실시간 길이를 표기하기 위해 audioElements에서 읽어 사용합니다.
        });
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [musicList]);

  const getDuration = (music: MusicGenerationResponse) => {
    if (music.duration && music.duration > 0) return music.duration;
    const audio = audioElements.get(music.id);
    if (audio && !isNaN(audio.duration)) return Math.floor(audio.duration);
    return 0;
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const seek = (music: MusicGenerationResponse, valueSeconds: number) => {
    const audio = audioElements.get(music.id);
    if (audio && !isNaN(audio.duration)) {
      audio.currentTime = Math.min(Math.max(0, valueSeconds), audio.duration);
      setProgress(prev => ({ ...prev, [music.id]: audio.currentTime }));
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (musicList.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Music className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>아직 생성된 음악이 없습니다.</p>
        <p className="text-sm">위의 폼을 사용하여 첫 번째 음악을 생성해보세요!</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {musicList.map((music) => (
        <Card key={music.id} className="overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <CardTitle className="text-lg truncate">
                  {music.prompt.length > 50 
                    ? `${music.prompt.substring(0, 50)}...` 
                    : music.prompt
                  }
                </CardTitle>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="secondary" className="text-xs">
                    <Clock className="h-3 w-3 mr-1" />
                    {getDuration(music) ? formatDuration(getDuration(music)) : '...'}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    <Calendar className="h-3 w-3 mr-1" />
                    {formatDate(music.createdAt)}
                  </Badge>
                  {/* 변형 표시는 제거 */}
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {/* 간단한 파형 프리뷰 아이콘 */}
            <div className="flex items-center gap-2 mb-3 text-muted-foreground">
              <Waves className="h-4 w-4" />
              <span className="text-xs">Generated audio preview</span>
            </div>
            {/* 프롬프트 전체 내용 */}
            <div className="mb-4">
              <p className="text-sm text-muted-foreground line-clamp-3">
                {music.prompt}
              </p>
            </div>

            {/* 진행 바 */}
            <div className="mb-2">
              {(() => {
                const cur = progress[music.id] || 0;
                const dur = getDuration(music);
                const pct = dur > 0 ? (cur / dur) * 100 : 0;
                return (
                  <div className="w-full">
                    <div className="h-2 bg-muted rounded">
                      <div className="h-2 bg-primary rounded" style={{ width: `${pct}%` }} />
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={Math.max(1, dur)}
                      value={cur}
                      onChange={(e) => seek(music, Number(e.target.value))}
                      className="w-full mt-1"
                    />
                  </div>
                );
              })()}
            </div>

            {/* 컨트롤 버튼 */}
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant={likedMap[music.id] ? "secondary" : "outline"}
                onClick={() => toggleLike(music)}
                title={likedMap[music.id] ? '좋아요 취소' : '좋아요'}
              >
                <Heart className={`h-4 w-4 ${likedMap[music.id] ? 'text-red-500' : ''}`} />
              </Button>
              <Button
                size="sm"
                variant={playingId === music.id ? "destructive" : "default"}
                onClick={() => handlePlay(music)}
                className="flex-1"
              >
                {playingId === music.id ? (
                  <>
                    <Pause className="h-4 w-4 mr-1" />
                    정지
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-1" />
                    재생
                  </>
                )}
              </Button>
              
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleDownload(music)}
              >
                <Download className="h-4 w-4" />
              </Button>
              
              {onPromptReuse && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onPromptReuse(music.prompt)}
                  title="프롬프트 재사용"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              )}
              
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleDelete(music.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
