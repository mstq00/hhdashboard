"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Upload, Loader2 } from "lucide-react";
import { GoogleGenAI } from '@google/genai';
import { VIDEO_ANALYSIS_PROMPT } from '@/lib/prompts';

interface VideoUploadDialogProps {
  onAnalysisComplete: (result: any, meta: any) => void;
  children: React.ReactNode;
}

export function VideoUploadDialog({ onAnalysisComplete, children }: VideoUploadDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<string>('');

  // Gemini API 초기화
  const genAI = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY! });

  // 동영상에서 썸네일 생성
  const generateThumbnail = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      video.addEventListener('loadedmetadata', () => {
        canvas.width = Math.min(video.videoWidth, 320); // 최대 320px 너비
        canvas.height = (canvas.width / video.videoWidth) * video.videoHeight;
        
        video.currentTime = 1; // 1초 지점에서 썸네일 추출
      });
      
      video.addEventListener('seeked', () => {
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const thumbnailDataUrl = canvas.toDataURL('image/jpeg', 0.8);
          resolve(thumbnailDataUrl);
        } else {
          resolve('');
        }
        
        // 메모리 정리
        URL.revokeObjectURL(video.src);
      });
      
      video.addEventListener('error', () => {
        URL.revokeObjectURL(video.src);
        resolve('');
      });
      
      const url = URL.createObjectURL(file);
      video.src = url;
      video.load();
    });
  };

  // 파일 처리 완료 대기
  const waitForFileProcessing = async (fileName: string): Promise<void> => {
    const maxAttempts = 30; // 최대 30번 시도 (약 5분)
    const delay = 10000; // 10초 간격
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        setUploadProgress(`파일 처리 중... (${attempt + 1}/${maxAttempts})`);
        const fileInfo = await genAI.files.get({ name: fileName });
        console.log(`파일 처리 상태 (${attempt + 1}/${maxAttempts}):`, fileInfo.state);
        
        if (fileInfo.state === 'ACTIVE') {
          setUploadProgress('파일 처리 완료! 분석 시작...');
          return;
        }
        
        if (fileInfo.state === 'FAILED') {
          throw new Error('파일 처리 실패');
        }
      } catch (error) {
        console.error('파일 상태 확인 실패:', error);
      }
      
      // 10초 대기
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    throw new Error('파일 처리 시간 초과');
  };

  // Gemini로 직접 동영상 분석
  const analyzeVideoWithGemini = async (uploadedFile: any): Promise<any> => {
    const prompt = VIDEO_ANALYSIS_PROMPT;

    try {
      setUploadProgress('AI 분석 중...');
      console.log('Gemini API 분석 시작:', uploadedFile.name);

      const result = await genAI.models.generateContent({
        model: 'gemini-2.5-pro-preview-06-05',
        contents: [{
          role: 'user',
          parts: [
            {
              fileData: {
                mimeType: uploadedFile.mimeType,
                fileUri: uploadedFile.uri
              }
            },
            { text: prompt }
          ]
        }]
      });

      const text = result.text || '';
      
      console.log('Gemini API 응답:', text);
      
      if (!text) {
        throw new Error('Gemini API에서 응답을 받지 못했습니다.');
      }
      
      try {
        // JSON 추출 시도
        let jsonText = text.trim();
        
        // 마크다운 코드 블록 제거
        const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/i) || text.match(/```\s*([\s\S]*?)\s*```/i);
        if (jsonMatch) {
          jsonText = jsonMatch[1].trim();
        }
        
        // 텍스트가 {로 시작하지 않으면 JSON이 아님
        if (!jsonText.startsWith('{')) {
          throw new Error('올바른 JSON 형식이 아닙니다');
        }
        
        console.log('파싱할 JSON 텍스트:', jsonText);
        const parsedResult = JSON.parse(jsonText);
        
        // 필수 필드 확인
        if (!parsedResult.kpis || !parsedResult.cards) {
          throw new Error('분석 결과 형식이 올바르지 않습니다');
        }
        
        return parsedResult;
      } catch (parseError) {
        console.error('JSON 파싱 실패:', parseError);
        console.error('원본 텍스트:', text.substring(0, 500) + '...');
        throw new Error('분석 결과 처리 중 오류가 발생했습니다. 다시 시도해주세요.');
      }
    } catch (error) {
      console.error('Gemini API 분석 실패:', error);
      throw new Error(`AI 분석 실패: ${error}`);
    }
  };

  const handleFileAnalysis = async () => {
    if (!selectedFile) {
      setError('파일을 선택해주세요.');
      return;
    }

    setLoading(true);
    setError(null);
    setUploadProgress('');

    try {
      // 썸네일 생성
      const thumbnail = await generateThumbnail(selectedFile);
      
      // Gemini로 직접 파일 업로드
      setUploadProgress('파일 업로드 중...');
      console.log('파일 업로드 시작:', selectedFile.name, selectedFile.type, selectedFile.size);
      
      const uploadResult = await genAI.files.upload({
        file: selectedFile,
        config: { 
          mimeType: selectedFile.type,
          displayName: selectedFile.name
        }
      });

      console.log('업로드 완료:', uploadResult);
      
      // 파일 처리 완료 대기
      if (uploadResult.name) {
        await waitForFileProcessing(uploadResult.name);
      }

      // Gemini로 동영상 분석
      const analysisResult = await analyzeVideoWithGemini(uploadResult);

      // 썸네일을 메타데이터에 추가
      const metaWithThumbnail = {
        title: selectedFile.name,
        thumbnail: thumbnail || ''
      };

      onAnalysisComplete(analysisResult, metaWithThumbnail);
      setOpen(false);
      setSelectedFile(null);
    } catch (error: any) {
      console.error('분석 실패:', error);
      setError(error.message || '분석 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
      setUploadProgress('');
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // 파일 크기 디버깅
      console.log('선택된 파일:', file.name);
      console.log('파일 크기:', file.size, 'bytes');
      console.log('파일 크기 (MB):', (file.size / (1024 * 1024)).toFixed(2), 'MB');
      
      // 지원되는 동영상 형식 확인
      const supportedTypes = ['video/mp4', 'video/mpeg', 'video/mov', 'video/avi', 'video/x-flv', 'video/mpg', 'video/webm', 'video/wmv', 'video/3gpp'];
      
      if (!supportedTypes.includes(file.type)) {
        setError('지원되지 않는 동영상 형식입니다. MP4, MOV, AVI 등의 형식을 사용해주세요.');
        return;
      }

      // Gemini 파일 크기 제한 (300MB)
      if (file.size > 300 * 1024 * 1024) {
        setError(`파일이 너무 큽니다. 300MB 이하로 압축해주세요.\n(현재: ${(file.size / (1024 * 1024)).toFixed(1)}MB)`);
        return;
      }

      setSelectedFile(file);
      setError(null);
    }
  };

  const resetForm = () => {
    setSelectedFile(null);
    setError(null);
    setUploadProgress('');
  };

  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      setOpen(newOpen);
      if (!newOpen) {
        resetForm();
      }
    }}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-w-[95vw] max-h-[90vh] overflow-y-auto" aria-describedby="video-upload-description">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl">동영상 업로드 & 분석</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4" id="video-upload-description">
          <div className="space-y-2">
            <label className="text-sm font-medium">동영상 파일</label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 sm:p-6 text-center">
              <input
                type="file"
                accept="video/*"
                onChange={handleFileChange}
                className="hidden"
                id="video-upload"
                disabled={loading}
              />
              <label htmlFor="video-upload" className="cursor-pointer">
                <Upload className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-gray-400 mb-3 sm:mb-4" />
                <div className="space-y-2">
                  <p className="text-sm text-gray-600 px-2">
                    {selectedFile ? (
                      <span className="block max-w-full break-all line-clamp-2 overflow-hidden" title={selectedFile.name}>
                        📹 {selectedFile.name}
                      </span>
                    ) : (
                      "클릭하여 동영상 파일을 선택하세요"
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground px-2">
                    MP4, MOV, AVI 등 (최대 300MB)
                  </p>
                </div>
              </label>
            </div>
          </div>
          
          {uploadProgress && (
            <div className="text-blue-600 text-sm p-3 bg-blue-50 rounded-md">
              <div className="break-words leading-relaxed">
                {uploadProgress}
              </div>
            </div>
          )}
          
          <Button 
            onClick={handleFileAnalysis} 
            disabled={!selectedFile || loading}
            className="w-full h-12 text-base font-medium"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                <span className="truncate">{uploadProgress || '업로드 & 분석 중...'}</span>
              </>
            ) : (
              "업로드 & 분석"
            )}
          </Button>
        </div>
        
        {error && (
          <div className="text-red-500 text-sm mt-4 p-3 bg-red-50 rounded-md border border-red-200">
            <div className="break-words leading-relaxed whitespace-pre-line">
              {error}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
} 