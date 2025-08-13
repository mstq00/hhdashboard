'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Sentence, VoiceSettings } from '@/types/tts';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';
import { AuthDialog } from '@/components/auth/auth-dialog';

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
  Mic
} from 'lucide-react';
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
  const generateAllAudio = async () => {
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
  };

  // 전체 다운로드 (ZIP)
  const downloadAllAudio = async () => {
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
  };

  const textValidation = validateTextLength(inputText);
  const generatedCount = sentences.filter(s => s.isGenerated).length;
  const canGenerateAll = selectedVoice && sentences.length > 0 && !isGeneratingAll;
  const canDownloadAll = generatedCount > 0;

  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto space-y-8">

      <div className="grid lg:grid-cols-3 gap-8">
        {/* 왼쪽: 텍스트 입력 및 설정 */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6 space-y-6">
          {/* 텍스트 입력 */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              <h3 className="text-lg font-semibold">텍스트 입력</h3>
            </div>
            
            <Textarea
              placeholder="음성으로 변환할 텍스트를 입력하세요..."
              value={inputText}
              onChange={(e) => handleTextChange(e.target.value)}
              className="min-h-[200px] resize-none"
            />
            
            <div className="flex items-center justify-between text-sm">
              <span className={textValidation.isValid ? 'text-gray-500' : 'text-red-500'}>
                {inputText.length} / 10,000자
              </span>
              <div className="flex items-center gap-4">
                {!textValidation.isValid && textValidation.message && (
                  <span className="text-red-600">
                    {textValidation.message}
                  </span>
                )}
                {sentences.length > 0 && (
                  <span className="text-blue-600">
                    {sentences.length}개 문장으로 분할됨
                  </span>
                )}
              </div>
            </div>

            {/* 한글 발음 개선 옵션 */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="improveKorean"
                checked={improveKorean}
                onChange={(e) => setImproveKorean(e.target.checked)}
                className="rounded"
              />
              <label htmlFor="improveKorean" className="text-sm text-gray-700">
                발음 사전 적용 (사용자 정의)
              </label>
            </div>
          </div>

          {/* 전체 작업 버튼 */}
          <div className="space-y-3">
            <Button
              onClick={generateAllAudio}
              disabled={!canGenerateAll}
              className="w-full"
              size="lg"
            >
              {isGeneratingAll ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  배치 생성 중... (5개씩 처리)
                </>
              ) : (
                <>
                  <Zap className="w-5 h-5 mr-2" />
                  전체 음성 생성
                </>
              )}
            </Button>

            <Button
              onClick={downloadAllAudio}
              disabled={!canDownloadAll}
              variant="outline"
              className="w-full"
              size="lg"
            >
              <Package className="w-5 h-5 mr-2" />
              전체 다운로드 (ZIP)
              {generatedCount > 0 && (
                <span className="ml-1">({generatedCount}개)</span>
              )}
            </Button>
          </div>

          {/* 현재 사용 중인 음성 정보 */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Mic className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-semibold">현재 음성</h3>
            </div>
            <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <strong className="text-blue-800">헤이두</strong>
                <span className="text-xs text-gray-500">(ID: z1UGxWwTeXMFFo7RBruy)</span>
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
        </div>

        {/* 오른쪽: 문장 목록 */}
        <div className="lg:col-span-2">
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
        </div>
      </div>
        </div>
      </div>
    </div>
  );
} 