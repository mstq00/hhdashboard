'use client';

import { useState } from 'react';
import { VoiceSettings } from '@/types/tts';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { ChevronDown, ChevronUp, Settings, RotateCcw } from 'lucide-react';
import { getDefaultVoiceSettings } from '@/lib/voice-settings';

interface VoiceSettingsProps {
  settings: VoiceSettings;
  onSettingsChange: (settings: VoiceSettings) => void;
}

export function VoiceSettingsPanel({ settings, onSettingsChange }: VoiceSettingsProps) {
  const [isOpen, setIsOpen] = useState(false);

  const updateSetting = (key: keyof VoiceSettings, value: number | boolean) => {
    onSettingsChange({
      ...settings,
      [key]: value,
    });
  };

  const resetToDefaults = () => {
    onSettingsChange(getDefaultVoiceSettings());
  };

  return (
    <div className="border border-gray-200 rounded-lg bg-white">
      <Button
        variant="ghost"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full justify-between p-4 h-auto"
      >
        <div className="flex items-center gap-2">
          <Settings className="w-5 h-5" />
          <span className="font-semibold">음성 설정</span>
        </div>
        {isOpen ? (
          <ChevronUp className="w-4 h-4" />
        ) : (
          <ChevronDown className="w-4 h-4" />
        )}
      </Button>

      {isOpen && (
        <div className="p-4 pt-0 space-y-6">
          {/* Stability */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">
                안정성 (Stability)
              </label>
              <span className="text-sm text-gray-500">
                {settings.stability.toFixed(2)}
              </span>
            </div>
            <Slider
              min={0}
              max={1}
              step={0.01}
              value={[settings.stability]}
              onValueChange={(value) => updateSetting('stability', value[0])}
            />
            <p className="text-xs text-gray-500">
              낮을수록 감정적이고 변화가 많음, 높을수록 안정적이고 일관됨
            </p>
          </div>

          {/* Similarity */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">
                유사성 (Similarity)
              </label>
              <span className="text-sm text-gray-500">
                {settings.similarity.toFixed(2)}
              </span>
            </div>
            <Slider
              min={0}
              max={1}
              step={0.01}
              value={[settings.similarity]}
              onValueChange={(value) => updateSetting('similarity', value[0])}
            />
            <p className="text-xs text-gray-500">
              원본 음성과의 유사도, 높을수록 더 명확하고 일관된 음성
            </p>
          </div>

          {/* Speed */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">
                속도 (Speed)
              </label>
              <span className="text-sm text-gray-500">
                {settings.speed.toFixed(1)}x
              </span>
            </div>
            <Slider
              min={0.7}
              max={1.2}
              step={0.1}
              value={[settings.speed]}
              onValueChange={(value) => updateSetting('speed', value[0])}
            />
            <p className="text-xs text-gray-500">
              말하기 속도 조절 (0.7x ~ 1.2x)
            </p>
          </div>

          {/* Style Exaggeration */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">
                스타일 과장 (Style Exaggeration)
              </label>
              <span className="text-sm text-gray-500">
                {settings.style_exaggeration.toFixed(2)}
              </span>
            </div>
            <Slider
              min={0}
              max={1}
              step={0.01}
              value={[settings.style_exaggeration]}
              onValueChange={(value) => updateSetting('style_exaggeration', value[0])}
            />
            <p className="text-xs text-gray-500">
              원본 화자의 스타일을 강조, 일반적으로 0에서 사용 권장
            </p>
          </div>

          {/* Speaker Boost */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">
                스피커 부스트 (Speaker Boost)
              </label>
              <button
                onClick={() => updateSetting('use_speaker_boost', !settings.use_speaker_boost)}
                className={`
                  w-12 h-6 rounded-full transition-colors relative
                  ${settings.use_speaker_boost ? 'bg-blue-500' : 'bg-gray-300'}
                `}
              >
                <div
                  className={`
                    w-5 h-5 bg-white rounded-full transition-transform absolute top-0.5
                    ${settings.use_speaker_boost ? 'transform translate-x-6' : 'translate-x-0.5'}
                  `}
                />
              </button>
            </div>
            <p className="text-xs text-gray-500">
              원본 화자와의 유사성을 높이지만 처리 시간이 약간 증가
            </p>
          </div>

          {/* Reset Button */}
          <div className="pt-2 border-t border-gray-100">
            <Button
              variant="outline"
              size="sm"
              onClick={resetToDefaults}
              className="w-full"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              기본값으로 재설정
            </Button>
          </div>
        </div>
      )}
    </div>
  );
} 