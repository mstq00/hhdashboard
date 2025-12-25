"use client";

import React, { useCallback, useState } from 'react';
import { Upload } from 'lucide-react';
import { fileToBase64 } from '@/lib/lineart';

interface FileUploadProps {
  onImageSelected: (base64: string) => void;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onImageSelected }) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  }, []);

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  const processFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('이미지 파일을 업로드해주세요');
      return;
    }
    try {
      const base64 = await fileToBase64(file);
      onImageSelected(base64);
    } catch (error) {
      console.error("Error reading file", error);
    }
  };

  return (
    <div
      className={`relative border-2 border-dashed rounded-3xl p-16 text-center transition-all duration-300 cursor-pointer group
        ${isDragging
          ? 'border-primary bg-primary/5 shadow-inner'
          : 'border-slate-200 hover:border-primary/50 hover:bg-slate-50'
        }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => document.getElementById('fileInput')?.click()}
    >
      <input
        type="file"
        id="fileInput"
        className="hidden"
        accept="image/*"
        onChange={handleFileInput}
      />

      <div className="flex flex-col items-center gap-4">
        <div className={`p-5 rounded-2xl transition-all duration-300 ${isDragging ? 'bg-primary text-white scale-110 shadow-lg shadow-primary/30' : 'bg-slate-100 text-slate-400 group-hover:bg-primary/10 group-hover:text-primary'}`}>
          <Upload size={32} strokeWidth={1.5} />
        </div>
        <div className="text-center">
          <p className="text-xl font-bold text-slate-700">참고 이미지를 업로드하세요</p>
          <p className="text-sm text-slate-400 mt-1 font-medium italic">JPG, PNG, WEBP</p>
        </div>
      </div>
    </div>
  );
};

