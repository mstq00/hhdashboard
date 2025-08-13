'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { 
  BookOpen, 
  Plus, 
  Trash2, 
  ChevronDown, 
  ChevronUp,
  Download,
  Upload
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { PronunciationDictionary } from '@/types/tts';

interface DictionaryManagerProps {
  onDictionaryChange?: () => void;
}

export function DictionaryManager({ onDictionaryChange }: DictionaryManagerProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [dictionary, setDictionary] = useState<PronunciationDictionary>({});
  const [newOriginal, setNewOriginal] = useState('');
  const [newPronunciation, setNewPronunciation] = useState('');
  const [importText, setImportText] = useState('');
  const [showImport, setShowImport] = useState(false);

  // 사전 로드
  useEffect(() => {
    loadDictionary();
  }, []);

  const loadDictionary = async () => {
    try {
      // 현재 세션 토큰 가져오기
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        console.error('No active session');
        return;
      }

      const response = await fetch('/api/dictionary', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });
      const data = await response.json();
      
      if (data.success) {
        setDictionary(data.dictionary);
      } else {
        console.error('Failed to load dictionary:', data.error);
      }
    } catch (error) {
      console.error('Error loading dictionary:', error);
    }
  };

  // 단어 추가
  const handleAddWord = async () => {
    if (!newOriginal.trim() || !newPronunciation.trim()) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        console.error('No active session');
        return;
      }

      const response = await fetch('/api/dictionary', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          original_word: newOriginal.trim(),
          pronunciation_word: newPronunciation.trim(),
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        await loadDictionary();
        setNewOriginal('');
        setNewPronunciation('');
        onDictionaryChange?.();
      } else {
        console.error('Failed to add word:', data.error);
      }
    } catch (error) {
      console.error('Error adding word:', error);
    }
  };

  // 단어 삭제
  const handleRemoveWord = async (original: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        console.error('No active session');
        return;
      }

      const response = await fetch(`/api/dictionary?word=${encodeURIComponent(original)}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      const data = await response.json();
      
      if (data.success) {
        await loadDictionary();
        onDictionaryChange?.();
      } else {
        console.error('Failed to remove word:', data.error);
      }
    } catch (error) {
      console.error('Error removing word:', error);
    }
  };

  // 사전 내보내기
  const handleExportDictionary = () => {
    const exportData = Object.entries(dictionary)
      .map(([original, pronunciation]) => `${original} -> ${pronunciation}`)
      .join('\n');
    
    const blob = new Blob([exportData], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tts-dictionary.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  // 사전 가져오기
  const handleImportDictionary = async () => {
    const lines = importText.split('\n').filter(line => line.trim());
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        console.error('No active session');
        return;
      }

      for (const line of lines) {
        const match = line.match(/^(.+?)\s*->\s*(.+)$/);
        if (match) {
          const [, original, pronunciation] = match;
          await fetch('/api/dictionary', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              original_word: original.trim(),
              pronunciation_word: pronunciation.trim(),
            }),
          });
        }
      }
      
      await loadDictionary();
      setImportText('');
      setShowImport(false);
      onDictionaryChange?.();
    } catch (error) {
      console.error('Error importing dictionary:', error);
    }
  };

  const dictionaryEntries = Object.entries(dictionary);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5" />
          <h3 className="text-lg font-semibold">발음 사전 관리</h3>
          <span className="text-sm text-gray-500">({dictionaryEntries.length}개)</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </Button>
      </div>

      {isExpanded && (
        <div className="space-y-4 bg-white p-4 rounded-lg border border-gray-200">
          {/* 단어 추가 */}
          <div className="space-y-3">
            <h4 className="font-medium text-gray-800">새 단어 추가</h4>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="원래 단어"
                value={newOriginal}
                onChange={(e) => setNewOriginal(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                onKeyDown={(e) => e.key === 'Enter' && handleAddWord()}
              />
              <input
                type="text"
                placeholder="발음하기 쉬운 단어"
                value={newPronunciation}
                onChange={(e) => setNewPronunciation(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                onKeyDown={(e) => e.key === 'Enter' && handleAddWord()}
              />
            </div>
            <Button
              onClick={handleAddWord}
              disabled={!newOriginal.trim() || !newPronunciation.trim()}
              size="sm"
              className="w-full"
            >
              <Plus className="w-4 h-4 mr-2" />
              단어 추가
            </Button>
          </div>

          {/* 사전 목록 */}
          {dictionaryEntries.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-gray-800">등록된 단어</h4>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExportDictionary}
                  >
                    <Download className="w-4 h-4 mr-1" />
                    내보내기
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowImport(!showImport)}
                  >
                    <Upload className="w-4 h-4 mr-1" />
                    가져오기
                  </Button>
                </div>
              </div>

              {showImport && (
                <div className="space-y-2 p-3 bg-gray-50 rounded-md">
                  <Textarea
                    placeholder="가져올 사전 데이터를 입력하세요&#10;형식: 원래단어 -> 발음개선단어&#10;예: 협력 -> 협력"
                    value={importText}
                    onChange={(e) => setImportText(e.target.value)}
                    className="text-sm"
                    rows={4}
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleImportDictionary}>
                      가져오기
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setShowImport(false)}>
                      취소
                    </Button>
                  </div>
                </div>
              )}

              <div className="max-h-40 overflow-y-auto space-y-2">
                {dictionaryEntries.map(([original, pronunciation]) => (
                  <div
                    key={original}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded-md"
                  >
                    <span className="text-sm">
                      <span className="font-medium text-red-600">{original}</span>
                      <span className="text-gray-500 mx-2">→</span>
                      <span className="text-blue-600">{pronunciation}</span>
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveWord(original)}
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="text-xs text-gray-500 bg-blue-50 p-2 rounded">
            💡 팁: 발음이 어려운 단어를 발음하기 쉬운 단어로 대체하여 더 자연스러운 음성을 만들 수 있습니다.<br/>
            예: &quot;법률&quot; → &quot;범뉼&quot;, &quot;협력&quot; → &quot;혐녁&quot; 등 발음만 개선하는 용도로 사용하세요.
          </div>
        </div>
      )}
    </div>
  );
} 