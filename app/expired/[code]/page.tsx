"use client";

import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, Home } from 'lucide-react';
import Link from 'next/link';

export default function ExpiredPage() {
  const params = useParams();
  const code = params.code as string;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-6 w-6" />
            만료된 링크
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            <code className="bg-muted px-2 py-1 rounded text-sm">{code}</code> 링크는 만료되어 더 이상 사용할 수 없습니다.
          </p>
          <p className="text-sm text-muted-foreground">
            링크 생성자에게 새로운 링크를 요청하거나, 홈페이지로 돌아가세요.
          </p>
          <Link href="/">
            <Button className="w-full">
              <Home className="h-4 w-4 mr-2" />
              홈으로 돌아가기
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}

