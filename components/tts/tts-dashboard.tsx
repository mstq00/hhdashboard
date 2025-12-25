'use client';

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { Sentence, VoiceSettings } from '@/types/tts';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';
import { AuthDialog } from '@/components/auth/auth-dialog';
import { useRightPanel } from '@/lib/context/right-panel-context';

import { VoiceSettingsPanel } from './voice-settings';
import { DictionaryManager } from './dictionary-manager';
import { SentenceList } from './sentence-list';
import {
  FileText,
  Zap,
  Loader2,
  Package,
  LogOut,
  User as UserIcon,
  Mic,
  X,
  Search,
  RefreshCcw
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  splitTextIntoSentences,
  createSentencesFromText,
  validateTextLength,
  improveKoreanPronunciationSync
} from '@/lib/text-utils';
import { getDefaultVoiceSettings } from '@/lib/voice-settings';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

export function TTSDashboard() {
  const [inputText, setInputText] = useState('');
  const [sentences, setSentences] = useState<Sentence[]>([]);
  // 고정된 보이스 ID 사용
  const selectedVoice = 'z1UGxWwTeXMFFo7RBruy';
  const [voiceSettings, setVoiceSettings] = useState<VoiceSettings>(getDefaultVoiceSettings());
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);
  const [improveKorean, setImproveKorean] = useState(true);

  const isUpdatingFromSentences = useRef(false); // 문장 목록에서 텍스트를 업데이트하는 중인지 확인

  // 음성 설정 불러오기
  const loadVoiceSettings = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const response = await fetch('/api/voice-settings', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setVoiceSettings(data.settings);
      }
    } catch (error) {
      console.error('Error loading voice settings:', error);
    }
  }, []);

  // 음성 설정 저장
  const saveVoiceSettings = useCallback(async (newSettings: VoiceSettings) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        console.error('No access token available');
        return;
      }

      console.log('Saving voice settings:', newSettings);

      const response = await fetch('/api/voice-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ settings: newSettings }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('Failed to save voice settings:', data);
        console.error('Response status:', response.status);
        console.error('Response details:', data.details);
      } else {
        console.log('Voice settings saved successfully');
      }
    } catch (error) {
      console.error('Error saving voice settings:', error);
    }
  }, []);

  // 음성 설정 변경 핸들러
  const handleVoiceSettingsChange = useCallback((newSettings: VoiceSettings) => {
    setVoiceSettings(newSettings);
    saveVoiceSettings(newSettings);
  }, [saveVoiceSettings]);

  // 인증 상태 확인
  useEffect(() => {
    // 현재 사용자 확인
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      // setUser(user); // Removed as per edit hint
    };

    getUser();

    // 인증 상태 변경 감지
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        // setUser(session?.user || null); // Removed as per edit hint
        if (event === 'SIGNED_OUT') {
          // 로그아웃 시 상태 초기화
          setInputText('');
          setSentences([]);
          setVoiceSettings(getDefaultVoiceSettings());
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // 사용자 로그인 시 음성 설정 불러오기
  useEffect(() => {
    loadVoiceSettings();
  }, [loadVoiceSettings]);

  // 텍스트 변경 시 문장 분할 (사전 적용)
  const handleTextChange = useCallback((text: string, skipSplit = false) => {
    console.log('handleTextChange called with:', text, 'skipSplit:', skipSplit);

    setInputText(text);

    // skipSplit이 true이거나 문장 목록에서 오는 업데이트인 경우 문장 분할을 하지 않음
    if (skipSplit || isUpdatingFromSentences.current) {
      console.log('Skipping sentence split');
      if (isUpdatingFromSentences.current) {
        isUpdatingFromSentences.current = false;
      }
      return;
    }

    if (text.trim()) {
      const sentenceTexts = splitTextIntoSentences(text);
      console.log('Split sentences:', sentenceTexts);
      // 사전 적용하여 문장 생성
      const processedSentences = sentenceTexts.map(sentence =>
        improveKorean ? improveKoreanPronunciationSync(sentence) : sentence
      );
      const newSentences = createSentencesFromText(processedSentences);
      console.log('New sentences created:', newSentences.map(s => s.text));
      setSentences(newSentences);
    } else {
      setSentences([]);
    }
  }, [improveKorean]);

  // 사전 변경 시 처리 (기존 오디오는 유지)
  const handleDictionaryChange = useCallback(() => {
    // 사전이 변경되어도 기존 생성된 오디오는 그대로 유지
    // 새로 생성할 때만 변경된 사전이 적용됨
  }, []);

  // 문장 목록에서 텍스트 변경 시 처리 (문장 재분할 없이 텍스트만 업데이트)
  const handleTextChangeFromSentences = useCallback((newText: string) => {
    console.log('handleTextChangeFromSentences called - using skipSplit flag');
    handleTextChange(newText, true); // skipSplit = true로 호출
  }, [handleTextChange]);

  // 전체 음성 생성 (5개씩 배치 처리)
  const generateAllAudio = useCallback(async () => {
    if (!selectedVoice || sentences.length === 0) return;

    setIsGeneratingAll(true);

    try {
      // 생성이 필요한 문장들만 필터링
      const sentencesToGenerate = sentences.filter(sentence =>
        !sentence.isGenerated || !sentence.audioUrl
      );

      if (sentencesToGenerate.length === 0) {
        setIsGeneratingAll(false);
        return;
      }

      // 5개씩 배치로 나누기
      const batchSize = 5;
      const batches = [];
      for (let i = 0; i < sentencesToGenerate.length; i += batchSize) {
        batches.push(sentencesToGenerate.slice(i, i + batchSize));
      }

      // 각 배치를 순차적으로 처리
      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex];

        // 현재 배치의 문장들을 "생성 중" 상태로 설정
        setSentences(prevSentences =>
          prevSentences.map(sentence => {
            const isInCurrentBatch = batch.some(batchSentence => batchSentence.id === sentence.id);
            return isInCurrentBatch
              ? { ...sentence, isGenerating: true, error: undefined }
              : sentence;
          })
        );

        // 현재 배치의 모든 요청을 병렬로 처리
        const batchPromises = batch.map(async (sentence) => {
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
                voiceId: selectedVoice,
                voiceSettings,
                modelId: 'eleven_multilingual_v2',
                improveKorean,
              }),
            });

            const data = await response.json();

            if (data.success) {
              return {
                id: sentence.id,
                isGenerating: false,
                isGenerated: true,
                audioUrl: data.audioUrl,
                error: undefined,
              };
            } else {
              return {
                id: sentence.id,
                isGenerating: false,
                error: data.error || 'Failed to generate audio',
              };
            }
          } catch {
            return {
              id: sentence.id,
              isGenerating: false,
              error: 'Network error occurred',
            };
          }
        });

        // 현재 배치 완료 대기
        const batchResults = await Promise.all(batchPromises);

        // 결과를 상태에 반영
        setSentences(prevSentences =>
          prevSentences.map(sentence => {
            const result = batchResults.find(r => r.id === sentence.id);
            return result ? { ...sentence, ...result } : sentence;
          })
        );

        // 다음 배치 전에 잠시 대기 (API 부하 분산)
        if (batchIndex < batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    } catch (error) {
      console.error('Error generating all audio:', error);
    } finally {
      setIsGeneratingAll(false);
    }
  }, [selectedVoice, sentences, voiceSettings, improveKorean]);

  // 전체 다운로드 (ZIP)
  const downloadAllAudio = useCallback(async () => {
    const generatedSentences = sentences.filter(s => s.audioUrl);

    if (generatedSentences.length === 0) {
      alert('다운로드할 음성 파일이 없습니다.');
      return;
    }

    try {
      const zip = new JSZip();

      generatedSentences.forEach((sentence, index) => {
        if (sentence.audioUrl) {
          const base64Data = sentence.audioUrl.split(',')[1];
          const fileName = `sentence-${String(index + 1).padStart(2, '0')}.mp3`;
          zip.file(fileName, base64Data, { base64: true });
        }
      });

      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, 'tts-audio-files.zip');
    } catch (error) {
      console.error('Error creating ZIP file:', error);
      alert('ZIP 파일 생성에 실패했습니다.');
    }
  }, [sentences]);

  const textValidation = useMemo(() => validateTextLength(inputText), [inputText]);
  const generatedCount = sentences.filter(s => s.isGenerated).length;
  const canGenerateAll = selectedVoice && sentences.length > 0 && !isGeneratingAll;
  const canDownloadAll = generatedCount > 0;

  // Right Panel Context
  const { setContent, open, close } = useRightPanel();

  // Update Right Panel Content
  useEffect(() => {
    const panelContent = (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-2 mb-2">
          <div className="w-1.5 h-5 bg-primary rounded-full"></div>
          <h3 className="text-lg font-bold">TTS 설정</h3>
        </div>

        {/* 텍스트 입력 */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 ml-1">
            <FileText className="w-4 h-4 text-slate-500" />
            <span className="text-xs font-bold text-slate-700">텍스트 입력</span>
          </div>

          <Textarea
            placeholder="음성으로 변환할 텍스트를 입력하세요..."
            value={inputText}
            onChange={(e) => handleTextChange(e.target.value)}
            className="min-h-[200px] resize-none bg-slate-50 border-slate-200 rounded-xl focus:ring-primary/20 text-sm"
          />

          <div className="flex items-center justify-between text-xs px-1">
            <span className={textValidation.isValid ? 'text-slate-400 font-medium' : 'text-red-500 font-bold'}>
              {inputText.length} / 10,000자
            </span>
            <div className="flex items-center gap-4">
              {!textValidation.isValid && textValidation.message && (
                <span className="text-red-500 font-bold">
                  {textValidation.message}
                </span>
              )}
              {sentences.length > 0 && (
                <span className="text-primary font-bold">
                  {sentences.length}개 문장
                </span>
              )}
            </div>
          </div>

          {/* 한글 발음 개선 옵션 */}
          <div className="flex items-center gap-2 pt-2 px-1">
            <input
              type="checkbox"
              id="improveKorean"
              checked={improveKorean}
              onChange={(e) => setImproveKorean(e.target.checked)}
              className="rounded border-slate-300 text-primary focus:ring-primary/20"
            />
            <label htmlFor="improveKorean" className="text-xs font-bold text-slate-700 cursor-pointer select-none">
              발음 사전 적용 (사용자 정의)
            </label>
          </div>
        </div>

        {/* 전체 작업 버튼 */}
        <div className="space-y-3 pt-2">
          <Button
            onClick={generateAllAudio}
            disabled={!canGenerateAll}
            className="w-full h-12 text-sm font-bold shadow-lg shadow-primary/10 rounded-2xl transition-all hover:scale-[1.02] active:scale-[0.98]"
            size="lg"
          >
            {isGeneratingAll ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                배치 생성 중...
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 mr-2" />
                전체 음성 생성
              </>
            )}
          </Button>

          <Button
            onClick={downloadAllAudio}
            disabled={!canDownloadAll}
            variant="outline"
            className="w-full h-12 text-sm font-bold shadow-lg shadow-slate-200/50 rounded-2xl border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-all"
            size="lg"
          >
            <Package className="w-4 h-4 mr-2" />
            전체 다운로드 (ZIP)
            {generatedCount > 0 && (
              <span className="ml-1 text-primary">({generatedCount})</span>
            )}
          </Button>
        </div>

        {/* 현재 사용 중인 음성 정보 */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 ml-1">
            <Mic className="w-4 h-4 text-slate-500" />
            <span className="text-xs font-bold text-slate-700">현재 음성</span>
          </div>
          <div className="text-sm text-slate-600 bg-primary/5 p-4 rounded-2xl border border-primary/20">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full shadow-[0_0_8px_rgba(34,197,94,0.5)]"></div>
              <strong className="text-primary font-bold">헤이두</strong>
              <span className="text-[10px] text-slate-400 font-mono bg-white px-1.5 py-0.5 rounded border border-slate-100">ID: z1UG...Bruy</span>
            </div>
          </div>
        </div>

        {/* 음성 설정 */}
        <VoiceSettingsPanel
          settings={voiceSettings}
          onSettingsChange={handleVoiceSettingsChange}
        />

        {/* 발음 사전 관리 */}
        <DictionaryManager
          onDictionaryChange={handleDictionaryChange}
        />
      </div>
    );

    setContent(panelContent);
    open();
  }, [
    inputText,
    handleTextChange,
    textValidation,
    sentences.length,
    improveKorean,
    generateAllAudio,
    canGenerateAll,
    isGeneratingAll,
    downloadAllAudio,
    canDownloadAll,
    generatedCount,
    voiceSettings,
    handleVoiceSettingsChange,
    handleDictionaryChange,
    setContent,
    open,
    close
  ]);

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
      <SentenceList
        sentences={sentences}
        onSentencesChange={setSentences}
        voiceId={selectedVoice}
        voiceSettings={voiceSettings}
        improveKorean={improveKorean}
        onTextChange={handleTextChangeFromSentences}
      />
    </div>
  );
} 