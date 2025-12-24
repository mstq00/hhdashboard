"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Upload, X, Image, FileText, Music, Video } from "lucide-react";
import { cn } from "@/lib/utils";

interface FileUploadProps {
  onFileAnalyzed: (file: File, fileType: string) => void;
  onFileSelected?: (file: File, fileType: string) => void;
  isAnalyzing?: boolean;
}

export function FileUpload({ onFileAnalyzed, onFileSelected, isAnalyzing = false }: FileUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileType, setFileType] = useState<string>("");

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, []);

  const handleFileSelect = (file: File) => {
    const detectedType = detectFileType(file);
    if (detectedType) {
      setSelectedFile(file);
      setFileType(detectedType);
      // 파일 선택 콜백 호출
      if (onFileSelected) {
        onFileSelected(file, detectedType);
      }
    } else {
      alert("지원하지 않는 파일 형식입니다. 이미지(.jpg, .png, .gif), 오디오(.mp3, .wav, .flac) 또는 텍스트(.txt, .md, .pdf) 파일을 사용해주세요.");
    }
  };

  const detectFileType = (file: File): string | null => {
    const imageTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    const textTypes = ["text/plain", "text/markdown", "application/pdf"];
    const audioTypes = ["audio/mpeg", "audio/mp3", "audio/wav", "audio/flac", "audio/m4a", "audio/aac"];
    
    if (imageTypes.includes(file.type)) {
      return "image";
    } else if (textTypes.includes(file.type)) {
      return "text";
    } else if (audioTypes.includes(file.type)) {
      return "audio";
    } else if (file.type.startsWith("video/")) {
      return "video";
    }
    
    return null;
  };

  const handleAnalyze = () => {
    if (selectedFile && fileType) {
      onFileAnalyzed(selectedFile, fileType);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setFileType("");
  };

  const getFileIcon = (type: string) => {
    switch (type) {
      case "image":
        return <Image className="h-8 w-8 text-blue-500" />;
      case "text":
        return <FileText className="h-8 w-8 text-green-500" />;
      case "audio":
        return <Music className="h-8 w-8 text-purple-500" />;
      case "video":
        return <Video className="h-8 w-8 text-red-500" />;
      default:
        return <FileText className="h-8 w-8 text-gray-500" />;
    }
  };

  const getFileTypeLabel = (type: string) => {
    switch (type) {
      case "image":
        return "이미지 파일";
      case "text":
        return "텍스트 파일";
      case "audio":
        return "오디오 파일";
      case "video":
        return "비디오 파일";
      default:
        return "알 수 없는 파일";
    }
  };

  return (
    <div className="space-y-4">
      {/* 드래그 앤 드롭 영역 */}
      <div
        className={cn(
          "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
          isDragOver
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-muted-foreground/50"
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <p className="text-lg font-medium mb-2">
          파일을 여기에 드래그하거나 클릭하여 선택하세요
        </p>
        <p className="text-sm text-muted-foreground mb-4">
          지원 형식: 이미지 (JPG, PNG, GIF), 오디오 (MP3, WAV, FLAC), 텍스트 (TXT, MD, PDF)
        </p>
        <Button
          variant="outline"
          onClick={() => document.getElementById("fileInput")?.click()}
        >
          파일 선택
        </Button>
        <input
          id="fileInput"
          type="file"
          className="hidden"
          accept="image/*,audio/*,.txt,.md,.pdf"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFileSelect(file);
          }}
        />
      </div>

      {/* 선택된 파일 정보 */}
      {selectedFile && (
        <div className="border rounded-lg p-4 bg-muted/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {getFileIcon(fileType)}
              <div>
                <p className="font-medium">{selectedFile.name}</p>
                <p className="text-sm text-muted-foreground">
                  {getFileTypeLabel(fileType)} • {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleAnalyze}
                disabled={isAnalyzing}
              >
                {isAnalyzing ? "분석 중..." : "분석하기"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRemoveFile}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
