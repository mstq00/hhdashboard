'use client';

import { useState, useEffect } from 'react';
import { Sentence, VoiceSettings } from '@/types/tts';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { 
  Play, 
  Pause, 
  Download, 
  RefreshCw, 
  Edit, 
  Check, 
  X, 
  Loader2,
  Plus,
  Trash2
} from 'lucide-react';
import { saveAs } from 'file-saver';
import { supabase } from '@/lib/supabase';
import { getHighlightedText } from '@/lib/text-utils';
import { PronunciationDictionary } from '@/types/tts';

interface SentenceListProps {
  sentences: Sentence[];
  onSentencesChange: (sentences: Sentence[]) => void;
  voiceId: string;
  voiceSettings: VoiceSettings;
  improveKorean?: boolean;
  onTextChange?: (newText: string) => void;
}

// 하이라이트된 텍스트를 렌더링하는 컴포넌트
function HighlightedText({ text, improveKorean, userDictionary }: { 
  text: string; 
  improveKorean?: boolean;
  userDictionary?: PronunciationDictionary;
}) {
  if (!improveKorean) {
    return <span>{text}</span>;
  }

  const highlightedParts = getHighlightedText(text, userDictionary || {});
  


  return (
    <>
      {highlightedParts.map((part, index) => (
        part.isChanged ? (
          <span
            key={index}
            className="bg-green-100 text-green-800 px-1 rounded font-medium relative group cursor-help"
          >
            {part.text}
            {/* 말풍선 툴팁 */}
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-10">
              입력 단어: {part.originalWord || part.text}
              {/* 말풍선 화살표 */}
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800"></div>
            </div>
          </span>
        ) : (
          <span key={index}>{part.text}</span>
        )
      ))}
    </>
  );
}

export function SentenceList({ 
  sentences, 
  onSentencesChange, 
  voiceId, 
  voiceSettings,
  improveKorean = true,
  onTextChange
}: SentenceListProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [newSentenceText, setNewSentenceText] = useState('');
  const [userDictionary, setUserDictionary] = useState<PronunciationDictionary>({});
  const [isAddingSentence, setIsAddingSentence] = useState(false);

  // 사전 로드
  useEffect(() => {
    const loadDictionary = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) return;

        const response = await fetch('/api/dictionary', {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        });
        const data = await response.json();
        
        if (data.success) {
          setUserDictionary(data.dictionary);
        }
      } catch (error) {
        console.error('Error loading dictionary:', error);
      }
    };

    loadDictionary();
  }, []);

  const updateSentence = (id: string, updates: Partial<Sentence>) => {
    const updatedSentences = sentences.map(sentence =>
      sentence.id === id ? { ...sentence, ...updates } : sentence
    );
    onSentencesChange(updatedSentences);
  };

  const generateAudio = async (sentence: Sentence) => {
    updateSentence(sentence.id, { isGenerating: true, error: undefined });

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch('/api/tts/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          text: sentence.text,
          voiceId,
          voiceSettings,
          modelId: 'eleven_multilingual_v2',
        }),
      });

      const data = await response.json();

      if (data.success) {
        updateSentence(sentence.id, {
          isGenerating: false,
          isGenerated: true,
          audioUrl: data.audioUrl,
          error: undefined, // 성공 시 이전 오류 제거
        });
      } else {
        updateSentence(sentence.id, {
          isGenerating: false,
          error: data.error || 'Failed to generate audio',
        });
      }
    } catch {
      updateSentence(sentence.id, {
        isGenerating: false,
        error: 'Network error occurred',
      });
    }
  };

  const playAudio = (sentence: Sentence) => {
    if (!sentence.audioUrl) return;

    if (playingId === sentence.id) {
      setPlayingId(null);
      return;
    }

    setPlayingId(sentence.id);
    const audio = new Audio(sentence.audioUrl);
    audio.play();
    audio.onended = () => setPlayingId(null);
    audio.onerror = () => setPlayingId(null);
  };

  const downloadAudio = (sentence: Sentence, index: number) => {
    if (!sentence.audioUrl) return;

    try {
      // Base64 데이터에서 실제 오디오 데이터 추출
      const base64Data = sentence.audioUrl.split(',')[1];
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'audio/mpeg' });
      
      saveAs(blob, `sentence-${String(index + 1).padStart(2, '0')}.mp3`);
    } catch (error) {
      console.error('Error downloading audio:', error);
    }
  };

  const startEditing = (sentence: Sentence) => {
    setEditingId(sentence.id);
    setEditText(sentence.text);
  };

  const saveEdit = () => {
    if (editingId) {
      const updatedSentences = sentences.map(sentence =>
        sentence.id === editingId ? { 
          ...sentence, 
          text: editText,
          // 텍스트가 변경되면 기존 오디오는 무효화
          audioUrl: undefined,
          isGenerated: false,
          error: undefined,
        } : sentence
      );
      
      onSentencesChange(updatedSentences);
      
      // 원래 텍스트도 업데이트
      if (onTextChange) {
        const sentenceTexts = updatedSentences.map(s => {
          const text = s.text.trim();
          // 문장 끝에 마침표, 물음표, 느낌표가 없으면 마침표 추가
          if (!/[.!?]$/.test(text)) {
            return text + '.';
          }
          return text;
        });
        const newText = sentenceTexts.join(' ');
        onTextChange(newText);
      }
      
      setEditingId(null);
      setEditText('');
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditText('');
  };

  const addNewSentence = () => {
    if (!newSentenceText.trim() || isAddingSentence) return;

    setIsAddingSentence(true);

    // 줄바꿈, 탭, 여러 공백을 모두 제거하고 정리
    const cleanText = newSentenceText
      .replace(/[\r\n\t]/g, ' ')  // 줄바꿈과 탭을 공백으로 변환
      .replace(/\s+/g, ' ')       // 여러 공백을 하나로
      .trim();                    // 앞뒤 공백 제거
    
    console.log('Original text:', JSON.stringify(newSentenceText));
    console.log('Cleaned text:', JSON.stringify(cleanText));

    if (!cleanText) {
      setIsAddingSentence(false);
      setNewSentenceText('');
      return;
    }

    const newSentence: Sentence = {
      id: `sentence-${Date.now()}`,
      text: cleanText,
      isGenerating: false,
      isGenerated: false,
    };

    const updatedSentences = [...sentences, newSentence];
    console.log('Updated sentences:', updatedSentences.map(s => s.text));
    onSentencesChange(updatedSentences);
    
    // 원래 텍스트도 업데이트 (문장 끝에 마침표가 없으면 추가)
    if (onTextChange) {
      const sentenceTexts = updatedSentences.map(s => {
        const text = s.text.trim();
        // 문장 끝에 마침표, 물음표, 느낌표가 없으면 마침표 추가
        if (!/[.!?]$/.test(text)) {
          return text + '.';
        }
        return text;
      });
      const newText = sentenceTexts.join(' ');
      console.log('New combined text:', newText);
      onTextChange(newText);
    }
    
    // 텍스트 필드를 완전히 비우기 (강제로 여러 번 실행)
    setNewSentenceText('');
    
    // 다음 렌더링 사이클에서도 한 번 더 비우기
    setTimeout(() => {
      setNewSentenceText('');
      setIsAddingSentence(false);
    }, 0);
    
    // 추가적으로 100ms 후에도 한 번 더 비우기
    setTimeout(() => {
      setNewSentenceText('');
    }, 100);
  };

  const deleteSentence = (sentenceId: string) => {
    const updatedSentences = sentences.filter(sentence => sentence.id !== sentenceId);
    onSentencesChange(updatedSentences);
    
    // 원래 텍스트도 업데이트
    if (onTextChange) {
      const sentenceTexts = updatedSentences.map(s => {
        const text = s.text.trim();
        // 문장 끝에 마침표, 물음표, 느낌표가 없으면 마침표 추가
        if (!/[.!?]$/.test(text)) {
          return text + '.';
        }
        return text;
      });
      const newText = sentenceTexts.join(' ');
      onTextChange(newText);
    }
    
    // 삭제된 문장이 재생 중이었다면 재생 중지
    if (playingId === sentenceId) {
      setPlayingId(null);
    }
    
    // 삭제된 문장이 편집 중이었다면 편집 모드 종료
    if (editingId === sentenceId) {
      setEditingId(null);
      setEditText('');
    }
  };

  // 빈 상태에서도 새 문장 추가 기능을 표시

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold">
        문장 목록 ({sentences.length}개)
      </h3>
      
      <div className="space-y-3">
        {sentences.map((sentence, index) => (
          <div
            key={sentence.id}
            className="border border-gray-200 rounded-lg p-4 bg-white"
          >
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
                {index + 1}
              </div>
              
              <div className="flex-1 min-w-0">
                {editingId === sentence.id ? (
                  <div className="space-y-2">
                    <Textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      className="min-h-[60px]"
                      placeholder="문장을 수정하세요..."
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={saveEdit}
                        disabled={!editText.trim()}
                      >
                        <Check className="w-4 h-4 mr-1" />
                        저장
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={cancelEdit}
                      >
                        <X className="w-4 h-4 mr-1" />
                        취소
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="text-gray-800 leading-relaxed">
                      <HighlightedText 
                        text={sentence.text} 
                        improveKorean={improveKorean} 
                        userDictionary={userDictionary}
                      />
                    </div>
                    
                    {sentence.error && (
                      <div className="mt-2 text-sm text-red-600 bg-red-50 p-2 rounded">
                        {sentence.error}
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              <div className="flex-shrink-0 flex gap-1">
                {!editingId && (
                  <>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => startEditing(sentence)}
                      title="문장 수정"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => generateAudio(sentence)}
                      disabled={sentence.isGenerating}
                      title={sentence.isGenerated ? "재생성" : "생성"}
                    >
                      {sentence.isGenerating ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <RefreshCw className="w-4 h-4" />
                      )}
                    </Button>
                    
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => playAudio(sentence)}
                      disabled={!sentence.audioUrl}
                      title="재생"
                      className={!sentence.audioUrl ? 'opacity-30' : ''}
                    >
                      {playingId === sentence.id ? (
                        <Pause className="w-4 h-4" />
                      ) : (
                        <Play className="w-4 h-4" />
                      )}
                    </Button>
                    
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => downloadAudio(sentence, index)}
                      disabled={!sentence.audioUrl}
                      title="다운로드"
                      className={!sentence.audioUrl ? 'opacity-30' : ''}
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                    
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteSentence(sentence.id)}
                      title="문장 삭제"
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </>
                )}
              </div>
            </div>
            
            {/* 상태 표시 */}
            <div className="mt-2 flex items-center gap-2 text-xs">
              {sentence.isGenerating && (
                <span className="text-blue-600 bg-blue-50 px-2 py-1 rounded">
                  생성 중...
                </span>
              )}
              {sentence.isGenerated && !sentence.isGenerating && (
                <span className="text-green-600 bg-green-50 px-2 py-1 rounded">
                  생성 완료
                </span>
              )}
              {sentence.error && (
                <span className="text-red-600 bg-red-50 px-2 py-1 rounded">
                  오류 발생
                </span>
              )}
            </div>
          </div>
        ))}
        
        {/* 새 문장 추가 */}
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 bg-gray-50">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-gray-400" />
              <span className="text-gray-600 font-medium">새 문장 추가</span>
            </div>
            <Textarea
              placeholder="새로운 문장을 입력하세요..."
              value={newSentenceText}
              onChange={(e) => setNewSentenceText(e.target.value)}
              className="min-h-[60px] bg-white"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.ctrlKey) {
                  e.preventDefault();
                  e.stopPropagation();
                  // 현재 텍스트를 즉시 저장
                  const currentText = e.currentTarget.value;
                  console.log('Ctrl+Enter pressed with text:', JSON.stringify(currentText));
                  addNewSentence();
                  return false;
                }
              }}
            />
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-500">
                Ctrl + Enter로 빠르게 추가할 수 있습니다
              </span>
              <Button
                size="sm"
                onClick={addNewSentence}
                disabled={!newSentenceText.trim()}
              >
                <Plus className="w-4 h-4 mr-1" />
                문장 추가
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 