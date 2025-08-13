"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

type VideoFormProps = {
  onSave: (data: {
    url: string;
    platform: "youtube" | "instagram";
    title: string;
    thumbnail: string;
  }) => void;
};

export function VideoForm({ onSave }: VideoFormProps) {
  const [url, setUrl] = useState("");
  const [platform, setPlatform] = useState<"youtube" | "instagram" | null>(null);
  const [title, setTitle] = useState("");
  const [thumbnail, setThumbnail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function detectPlatform(url: string) {
    if (/youtu(be\.com|\.be)/.test(url)) return "youtube";
    if (/instagram\.com/.test(url)) return "instagram";
    return null;
  }

  async function fetchMeta(url: string, platform: "youtube" | "instagram") {
    setLoading(true);
    setError(null);
    try {
      if (platform === "youtube") {
        const match = url.match(
          /(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?|shorts)\/|.*[?&]v=)|youtu\.be\/)([\w-]{11})/
        );
        const videoId = match ? match[1] : null;
        if (videoId) {
          setThumbnail(`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`);
          // 제목 자동 추출 시도 (oEmbed)
          try {
            const res = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
            if (res.ok) {
              const data = await res.json();
              setTitle(data.title);
            }
          } catch {}
        }
      } else if (platform === "instagram") {
        // 인스타그램 Open Graph 메타태그 파싱 시도 (실패 가능성 높음)
        try {
          const res = await fetch(`/api/og?url=${encodeURIComponent(url)}`);
          if (res.ok) {
            const data = await res.json();
            if (data.title) setTitle(data.title);
            if (data.image) setThumbnail(data.image);
          }
        } catch {}
      }
    } catch (e: any) {
      setError(e.message);
    }
    setLoading(false);
  }

  async function handleUrlChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    setUrl(value);
    setTitle("");
    setThumbnail("");
    setError(null);
    const detected = detectPlatform(value);
    setPlatform(detected);
    if (detected) {
      await fetchMeta(value, detected);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!url || !platform || !title || !thumbnail) {
      setError("모든 정보를 입력/추출해야 합니다.");
      return;
    }
    onSave({ url, platform, title, thumbnail });
    setUrl("");
    setPlatform(null);
    setTitle("");
    setThumbnail("");
    setError(null);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
      <input
        type="url"
        placeholder="영상 URL (유튜브/인스타그램)"
        value={url}
        onChange={handleUrlChange}
        required
        className="w-full border rounded px-3 py-2"
      />
      {platform && (
        <div className="flex items-center gap-2">
          <span className="text-sm px-2 py-1 rounded bg-muted">{platform === "youtube" ? "YouTube" : "Instagram"}</span>
          {thumbnail && <img src={thumbnail} alt="썸네일" className="w-16 h-10 object-cover rounded" />}
        </div>
      )}
      <div>
        <input
          type="text"
          placeholder="제목 (자동 추출 실패 시 직접 입력)"
          value={title}
          onChange={e => setTitle(e.target.value)}
          required
          className="w-full border rounded px-3 py-2 mt-2"
        />
      </div>
      <div>
        <input
          type="text"
          placeholder="썸네일 URL (자동 추출 실패 시 직접 입력)"
          value={thumbnail}
          onChange={e => setThumbnail(e.target.value)}
          required
          className="w-full border rounded px-3 py-2 mt-2"
        />
      </div>
      {error && <div className="text-red-500 text-sm">{error}</div>}
      <Button type="submit" disabled={loading || !platform || !title || !thumbnail}>
        {loading ? "분석 중..." : "저장"}
      </Button>
    </form>
  );
} 