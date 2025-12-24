"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Edit3, Save, RotateCcw } from "lucide-react";

interface PromptEditorProps {
  prompt: string;
  onPromptChange: (prompt: string) => void;
  onSave: () => void;
}

export function PromptEditor({ prompt, onPromptChange, onSave }: PromptEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedPrompt, setEditedPrompt] = useState(prompt);
  const [originalPrompt, setOriginalPrompt] = useState(prompt);

  useEffect(() => {
    setEditedPrompt(prompt);
    setOriginalPrompt(prompt);
  }, [prompt]);

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleSave = () => {
    onPromptChange(editedPrompt);
    setIsEditing(false);
    onSave();
  };

  const handleCancel = () => {
    setEditedPrompt(originalPrompt);
    setIsEditing(false);
  };

  const handleReset = () => {
    setEditedPrompt(originalPrompt);
  };

  if (!prompt) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Edit3 className="h-5 w-5" />
          프롬프트 편집
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isEditing ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="editedPrompt">프롬프트 수정</Label>
              <Textarea
                id="editedPrompt"
                value={editedPrompt}
                onChange={(e) => setEditedPrompt(e.target.value)}
                rows={6}
                className="resize-none"
                placeholder="프롬프트를 수정하세요..."
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSave} className="flex-1">
                <Save className="h-4 w-4 mr-2" />
                저장
              </Button>
              <Button variant="outline" onClick={handleCancel}>
                취소
              </Button>
              <Button variant="outline" onClick={handleReset}>
                <RotateCcw className="h-4 w-4 mr-2" />
                원본 복원
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>현재 프롬프트</Label>
              <div className="p-3 bg-muted rounded-md">
                <p className="text-sm whitespace-pre-wrap">{prompt}</p>
              </div>
            </div>
            <Button onClick={handleEdit} className="w-full">
              <Edit3 className="h-4 w-4 mr-2" />
              프롬프트 수정
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}



