"use client";

import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Upload, Download, RefreshCcw, ImageIcon, Loader2, CheckCircle2, X, Eye } from 'lucide-react';
import { toast } from 'sonner';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

type ConversionMode = 'pages' | 'images';
type ImageQuality = 'normal' | 'high';

interface ConvertedImage {
  dataUrl: string;
  fileName: string;
  pageNumber?: number;
}

import { useRightPanel } from '@/lib/context/right-panel-context';
import { useEffect } from 'react';

export default function PdfToJpgPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [conversionMode, setConversionMode] = useState<ConversionMode>('pages');
  const [imageQuality, setImageQuality] = useState<ImageQuality>('normal');
  const [isConverting, setIsConverting] = useState(false);
  const [convertedImages, setConvertedImages] = useState<ConvertedImage[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [pdfPreview, setPdfPreview] = useState<string[]>([]);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [totalPages, setTotalPages] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const { setContent } = useRightPanel();

  // PDF.js 동적 로드 (CDN 사용 - 가장 안정적인 방법)
  const loadPdfJs = async (): Promise<any> => {
    if (typeof window === 'undefined') return null;

    // 이미 로드되어 있는지 확인
    if ((window as any).pdfjsLib) {
      return (window as any).pdfjsLib;
    }

    return new Promise((resolve, reject) => {
      // CDN에서 UMD 버전으로 로드 (가장 호환성이 좋음)
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
      script.async = true;

      script.onload = () => {
        const pdfjsLib = (window as any).pdfjsLib;
        if (pdfjsLib) {
          // Worker 설정
          pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
          resolve(pdfjsLib);
        } else {
          reject(new Error('PDF.js가 로드되지 않았습니다.'));
        }
      };

      script.onerror = () => {
        toast.error('PDF 처리 라이브러리를 불러올 수 없습니다. 인터넷 연결을 확인해주세요.');
        reject(new Error('PDF.js 스크립트 로드 실패'));
      };

      document.head.appendChild(script);
    });
  };

  // 파일 드래그 앤 드롭 처리
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0 && files[0].type === 'application/pdf') {
      setSelectedFile(files[0]);
      setConvertedImages([]);
      setPdfPreview([]);
      loadPdfPreview(files[0]);
    } else {
      toast.error('PDF 파일만 업로드할 수 있습니다.');
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      if (files[0].type === 'application/pdf') {
        setSelectedFile(files[0]);
        setConvertedImages([]);
        setPdfPreview([]);
        loadPdfPreview(files[0]);
      } else {
        toast.error('PDF 파일만 업로드할 수 있습니다.');
      }
    }
  };

  // 파일 선택 트리거 (박스 클릭용)
  const triggerFileSelect = () => {
    const input = document.getElementById('pdf-upload') as HTMLInputElement;
    if (input) {
      input.click();
    }
  };

  // PDF 미리보기 로드
  const loadPdfPreview = async (file: File) => {
    setIsLoadingPreview(true);
    setPdfPreview([]);

    try {
      const pdfjsLib = await loadPdfJs();
      if (!pdfjsLib) {
        setIsLoadingPreview(false);
        return;
      }

      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      setTotalPages(pdf.numPages);

      // 첫 3페이지만 미리보기로 로드 (성능 고려)
      const previewPages = Math.min(3, pdf.numPages);
      const previews: string[] = [];

      for (let pageNum = 1; pageNum <= previewPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale: 1.0 });

        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (!context) continue;

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        await page.render({
          canvasContext: context,
          viewport: viewport
        }).promise;

        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        previews.push(dataUrl);
      }

      setPdfPreview(previews);
    } catch (error) {
      console.error('PDF 미리보기 로드 오류:', error);
      toast.error('PDF 미리보기를 불러올 수 없습니다.');
    } finally {
      setIsLoadingPreview(false);
    }
  };

  // PDF를 이미지로 변환
  const convertPdfToImages = useCallback(async () => {
    if (!selectedFile) {
      toast.error('PDF 파일을 선택해주세요.');
      return;
    }

    setIsConverting(true);
    setConvertedImages([]);

    try {
      const pdfjsLib = await loadPdfJs();
      if (!pdfjsLib) {
        setIsConverting(false);
        return;
      }

      // PDF 파일을 ArrayBuffer로 읽기
      const arrayBuffer = await selectedFile.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const images: ConvertedImage[] = [];

      if (conversionMode === 'pages') {
        // 각 페이지를 이미지로 변환
        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
          const page = await pdf.getPage(pageNum);
          const viewport = page.getViewport({ scale: imageQuality === 'high' ? 2.0 : 1.5 });

          // Canvas 생성
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          if (!context) {
            throw new Error('Canvas context를 가져올 수 없습니다.');
          }

          canvas.height = viewport.height;
          canvas.width = viewport.width;

          // PDF 페이지를 Canvas에 렌더링
          await page.render({
            canvasContext: context,
            viewport: viewport
          }).promise;

          // Canvas를 이미지로 변환
          const dataUrl = canvas.toDataURL('image/jpeg', imageQuality === 'high' ? 0.95 : 0.85);
          images.push({
            dataUrl,
            fileName: `${selectedFile.name.replace('.pdf', '')}_page_${pageNum}.jpg`,
            pageNumber: pageNum
          });
        }
      } else {
        // PDF 내 이미지 추출 (간단한 구현 - 모든 페이지를 렌더링하고 이미지 추출)
        toast.info('이미지 추출 기능은 준비 중입니다. 현재는 페이지 변환을 사용해주세요.');
        setIsConverting(false);
        return;
      }

      setConvertedImages(images);
      toast.success(`${images.length}개의 이미지가 생성되었습니다.`);
    } catch (error) {
      console.error('변환 오류:', error);
      toast.error('PDF 변환 중 오류가 발생했습니다.');
    } finally {
      setIsConverting(false);
    }
  }, [selectedFile, conversionMode, imageQuality]);

  // 개별 이미지 다운로드
  const downloadImage = useCallback((image: ConvertedImage) => {
    const link = document.createElement('a');
    link.href = image.dataUrl;
    link.download = image.fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, []);

  // 모든 상태 초기화
  const resetAll = useCallback(() => {
    setSelectedFile(null);
    setConvertedImages([]);
    setPdfPreview([]);
    setTotalPages(0);
    setError(null);
  }, []);

  // 모든 이미지를 ZIP으로 다운로드
  const downloadAll = useCallback(async () => {
    if (convertedImages.length === 0) {
      toast.error('다운로드할 이미지가 없습니다.');
      return;
    }

    try {
      const zip = new JSZip();

      for (const image of convertedImages) {
        // Data URL을 Blob으로 변환
        const response = await fetch(image.dataUrl);
        const blob = await response.blob();
        zip.file(image.fileName, blob);
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const zipFileName = `${selectedFile?.name.replace('.pdf', '') || 'converted'}_images.zip`;
      saveAs(zipBlob, zipFileName);
      toast.success('모든 이미지가 ZIP 파일로 다운로드되었습니다.');
    } catch (error) {
      console.error('ZIP 생성 오류:', error);
      toast.error('ZIP 파일 생성 중 오류가 발생했습니다.');
    }
  }, [convertedImages, selectedFile]);

  // 우측 패널 기본 가이드 콘텐츠
  const guideContent = React.useMemo(() => (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-1.5 h-5 bg-primary rounded-full"></div>
        <h3 className="text-lg font-bold text-slate-800">PDF to JPG 변환기</h3>
      </div>
      <div className="p-5 bg-blue-50/50 rounded-2xl border border-blue-100/50 flex gap-4">
        <div className="w-10 h-10 bg-blue-100/50 rounded-xl flex items-center justify-center shrink-0">
          <FileText className="w-5 h-5 text-blue-600" />
        </div>
        <div className="space-y-1">
          <h5 className="text-[10px] font-bold text-blue-700 uppercase tracking-wider mb-1">Information</h5>
          <p className="text-[11px] text-blue-600/80 leading-relaxed font-medium">
            PDF 파일을 업로드하여 고화질 JPG 이미지로 빠르게 변환해보세요. 각 페이지는 개별 이미지로 변환됩니다.
          </p>
        </div>
      </div>
    </div>
  ), []);

  // 우측 패널 콘텐츠 메모이제이션
  const rightPanelContent = React.useMemo(() => {
    if (!selectedFile) return guideContent;

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-1.5 h-5 bg-primary rounded-full"></div>
          <h3 className="text-lg font-bold text-slate-800">변환 설정</h3>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm font-bold text-slate-700 ml-1">변환 옵션</Label>
            <Select value={conversionMode} onValueChange={(value) => setConversionMode(value as ConversionMode)}>
              <SelectTrigger className="h-12 bg-slate-50/50 border-slate-200 rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="pages" className="rounded-lg">
                  <div className="py-1">
                    <div className="font-bold text-sm">페이지를 JPG로 변환</div>
                    <div className="text-[10px] text-slate-400 font-medium">각 페이지가 개별 이미지로 변환</div>
                  </div>
                </SelectItem>
                <SelectItem value="images" disabled className="rounded-lg">
                  <div className="py-1">
                    <div className="font-bold text-sm">이미지 추출 (준비 중)</div>
                    <div className="text-[10px] text-slate-400 font-medium">PDF 내 원본 이미지 추출</div>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-bold text-slate-700 ml-1">이미지 품질</Label>
            <Select value={imageQuality} onValueChange={(value) => setImageQuality(value as ImageQuality)}>
              <SelectTrigger className="h-12 bg-slate-50/50 border-slate-200 rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="normal" className="rounded-lg font-medium">일반 화질 (권장)</SelectItem>
                <SelectItem value="high" className="rounded-lg font-bold">고화질 원본급</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={convertPdfToImages}
            disabled={isConverting || isLoadingPreview}
            className="w-full h-14 text-lg font-bold shadow-lg shadow-primary/20 rounded-2xl"
          >
            {isConverting ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                변환 중... ({convertedImages.length}/{totalPages})
              </>
            ) : (
              <>
                <ImageIcon className="mr-2 h-5 w-5" />
                변환 시작하기
              </>
            )}
          </Button>
        </div>

        <div className="p-5 bg-blue-50/50 rounded-2xl border border-blue-100/50">
          <h4 className="text-[10px] font-bold text-blue-700 mb-1.5 uppercase tracking-wider">Information</h4>
          <p className="text-[11px] text-blue-600/80 leading-relaxed font-medium">
            여러 페이지의 PDF인 경우 변환 완료 후 모든 이미지를 한 번에 ZIP 파일로 다운로드할 수 있습니다.
          </p>
        </div>
      </div>
    );
  }, [selectedFile, guideContent, conversionMode, imageQuality, isConverting, isLoadingPreview, convertedImages.length, totalPages, convertPdfToImages]);

  // 우측 패널 설정
  useEffect(() => {
    setContent(rightPanelContent);
  }, [setContent, rightPanelContent]);

  // 언마운트 시에만 콘텐츠 초기화
  useEffect(() => {
    return () => setContent(null);
  }, [setContent]);

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="bg-white rounded-[2.5rem] p-10 shadow-sm border border-slate-200/60 space-y-8">
        {/* Upload & Preview Section */}
        <div className="space-y-8">
          <div
            className={`relative border-2 border-dashed rounded-3xl p-16 text-center transition-all cursor-pointer ${isDragging
              ? 'border-primary bg-primary/5 ring-4 ring-primary/5 shadow-inner'
              : selectedFile
                ? 'border-slate-200 bg-slate-50/30'
                : 'border-slate-200 hover:border-primary/50 hover:bg-slate-50'
              }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={!selectedFile ? triggerFileSelect : undefined}
          >
            <input
              id="pdf-upload"
              type="file"
              accept=".pdf,application/pdf"
              onChange={handleFileSelect}
              className="hidden"
            />

            {selectedFile ? (
              <div className="space-y-8">
                <div className="flex items-center justify-center gap-6 p-6 bg-white rounded-2xl border border-slate-100 shadow-sm max-w-xl mx-auto ring-1 ring-slate-200/50">
                  <div className="p-4 bg-primary/10 rounded-2xl text-primary">
                    <FileText className="h-10 w-10" />
                  </div>
                  <div className="text-left flex-1 min-w-0">
                    <p className="font-bold text-lg text-slate-800 truncate">{selectedFile.name}</p>
                    <p className="text-sm text-slate-400 font-bold mt-1">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                      {totalPages > 0 && <span className="mx-2 opacity-30">•</span>}
                      {totalPages > 0 && `${totalPages}페이지`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setSelectedFile(null); }} className="text-slate-400 hover:text-red-500 rounded-xl">
                      <X className="w-4 h-4 mr-1.5" /> 삭제
                    </Button>
                    <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); triggerFileSelect(); }} className="rounded-xl border-slate-200">
                      파일 교체
                    </Button>
                  </div>
                </div>

                {/* PDF 미리보기 */}
                {isLoadingPreview ? (
                  <div className="flex flex-col items-center justify-center py-12 bg-white/50 rounded-2xl">
                    <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
                    <p className="text-sm font-bold text-slate-400">PDF 데이터를 읽어오는 중입니다...</p>
                  </div>
                ) : pdfPreview.length > 0 && (
                  <div className="animate-in fade-in duration-500">
                    <div className="flex items-center gap-2 mb-4 ml-1">
                      <Eye className="h-4 w-4 text-slate-400" />
                      <span className="text-sm font-bold text-slate-500">PDF 미리보기</span>
                      {totalPages > 3 && (
                        <span className="text-xs text-slate-400 font-medium">(처음 3페이지만 표시됩니다)</span>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {pdfPreview.map((preview, index) => (
                        <div key={index} className="group relative border border-slate-100 rounded-2xl overflow-hidden bg-slate-100 shadow-sm hover:shadow-md transition-all">
                          <img
                            src={preview}
                            alt={`페이지 ${index + 1}`}
                            className="w-full aspect-[3/4] object-contain bg-white"
                          />
                          <div className="absolute top-3 left-3 px-2 py-1 bg-black/60 backdrop-blur-md rounded-lg text-[10px] font-bold text-white shadow-lg">
                            PAGE {index + 1}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4">
                <div className={`p-5 rounded-2xl transition-all duration-300 ${selectedFile ? 'bg-primary text-white scale-110 shadow-lg shadow-primary/30' : 'bg-slate-100 text-slate-400 group-hover:bg-primary/10 group-hover:text-primary'}`}>
                  <Upload size={32} strokeWidth={1.5} />
                </div>
                <div className="text-center">
                  <p className="text-xl font-bold text-slate-700">
                    PDF 파일을 업로드하세요
                  </p>
                  <p className="text-sm text-slate-400 mt-1 font-medium italic">PDF (최대 50MB)</p>
                </div>
              </div>
            )}
          </div>

          {/* 변환 결과 */}
          {convertedImages.length > 0 && (
            <div className="animate-in fade-in slide-in-from-bottom-6 duration-700 pt-8 border-t border-slate-100">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-xl font-bold text-slate-800">변환 결과</h3>
                  <p className="text-sm text-slate-400 font-medium mt-0.5">
                    총 {convertedImages.length}개의 고화질 이미지가 생성되었습니다.
                  </p>
                </div>
                <div className="flex gap-3">
                  <Button onClick={resetAll} variant="outline" className="rounded-xl border-slate-200 font-bold">
                    <RefreshCcw className="mr-2 h-4 w-4" /> 다시 하기
                  </Button>
                  <Button onClick={downloadAll} variant="default" className="rounded-xl shadow-lg shadow-primary/20">
                    <Download className="mr-2 h-4 w-4" /> ZIP으로 모두 다운로드
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {convertedImages.map((image, index) => (
                  <div key={index} className="group space-y-3">
                    <div className="relative aspect-[3/4] bg-slate-100 rounded-2xl overflow-hidden ring-1 ring-slate-200/50 shadow-sm transition-all hover:shadow-xl hover:ring-primary/30">
                      <img
                        src={image.dataUrl}
                        alt={image.fileName}
                        className="w-full h-full object-contain bg-white"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100 backdrop-blur-[2px]">
                        <Button
                          size="icon"
                          variant="secondary"
                          className="rounded-xl shadow-lg"
                          onClick={() => downloadImage(image)}
                        >
                          <Download className="h-5 w-5" />
                        </Button>
                      </div>
                      {image.pageNumber && (
                        <div className="absolute bottom-3 right-3 px-2 py-0.5 bg-primary/90 text-white rounded-lg text-[10px] font-bold shadow-lg">
                          P.{image.pageNumber}
                        </div>
                      )}
                    </div>
                    <p className="text-[10px] font-bold text-slate-400 truncate px-1" title={image.fileName}>
                      {image.fileName}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

