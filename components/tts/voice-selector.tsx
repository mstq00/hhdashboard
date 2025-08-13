'use client';

import { useState, useEffect, useCallback } from 'react';
import { Voice } from '@/types/tts';
import { Button } from '@/components/ui/button';
import { Play, Pause, Volume2 } from 'lucide-react';

interface VoiceSelectorProps {
  selectedVoice: string;
  onVoiceChange: (voiceId: string) => void;
}

export function VoiceSelector({ selectedVoice, onVoiceChange }: VoiceSelectorProps) {
  const [voices, setVoices] = useState<Voice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [playingVoice, setPlayingVoice] = useState<string | null>(null);

  const fetchVoices = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/tts/voices');
      const data = await response.json();

      if (data.success) {
        setVoices(data.voices);
        if (data.voices.length > 0 && !selectedVoice) {
          onVoiceChange(data.voices[0].voice_id);
        }
      } else {
        setError(data.error || 'Failed to fetch voices');
      }
    } catch (err) {
      setError('Network error occurred');
      console.error('Error fetching voices:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedVoice, onVoiceChange]);

  useEffect(() => {
    fetchVoices();
  }, [fetchVoices]);

  const playVoicePreview = (voice: Voice) => {
    if (playingVoice === voice.voice_id) {
      setPlayingVoice(null);
      return;
    }

    if (voice.preview_url) {
      setPlayingVoice(voice.voice_id);
      const audio = new Audio(voice.preview_url);
      audio.play();
      audio.onended = () => setPlayingVoice(null);
      audio.onerror = () => setPlayingVoice(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Volume2 className="w-5 h-5" />
          음성 선택
        </h3>
        <div className="animate-pulse space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-200 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-3">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Volume2 className="w-5 h-5" />
          음성 선택
        </h3>
        <div className="text-red-500 text-sm bg-red-50 p-3 rounded-lg">
          {error}
        </div>
        <Button 
          onClick={fetchVoices} 
          variant="outline"
          size="sm"
        >
          다시 시도
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <Volume2 className="w-5 h-5" />
        음성 선택
      </h3>
      
      <div className="grid gap-2 max-h-60 overflow-y-auto">
        {voices.map((voice) => (
          <div
            key={voice.voice_id}
            className={`
              p-3 border rounded-lg cursor-pointer transition-all
              ${selectedVoice === voice.voice_id 
                ? 'bg-blue-50 border-blue-500' 
                : 'bg-white hover:bg-gray-50 border-gray-200'
              }
            `}
            onClick={() => onVoiceChange(voice.voice_id)}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="font-medium text-sm">{voice.name}</div>
                <div className="text-xs text-gray-500 mt-1">
                  {voice.labels?.accent && (
                    <span className="mr-2">{voice.labels.accent}</span>
                  )}
                  {voice.labels?.gender && (
                    <span className="mr-2">{voice.labels.gender}</span>
                  )}
                  {voice.labels?.age && (
                    <span>{voice.labels.age}</span>
                  )}
                </div>
                {voice.description && (
                  <div className="text-xs text-gray-400 mt-1 line-clamp-2">
                    {voice.description}
                  </div>
                )}
              </div>
              
              {voice.preview_url && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    playVoicePreview(voice);
                  }}
                  className="ml-2"
                >
                  {playingVoice === voice.voice_id ? (
                    <Pause className="w-4 h-4" />
                  ) : (
                    <Play className="w-4 h-4" />
                  )}
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 