"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function AuthErrorPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [reason, setReason] = useState<string>("");
  
  useEffect(() => {
    const reasonParam = searchParams.get("reason");
    setReason(reasonParam || "unknown_error");
    
    // 오류 발생 시 콘솔에 로깅
    console.log("인증 오류 페이지 렌더링:", reasonParam);
  }, [searchParams]);
  
  const getErrorMessage = (errorCode: string): string => {
    const errorMessages: Record<string, string> = {
      "missing_code": "인증 코드가 없습니다. 구글 로그인 과정이 비정상적으로 중단되었습니다.",
      "invalid_grant": "인증 정보가 유효하지 않습니다. 다시 로그인해주세요.",
      "internal_error": "내부 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
      "invalid request: both auth code and code verifier should be non-empty": "인증 과정에서 오류가 발생했습니다. 브라우저 캐시를 지우고 다시 시도해주세요."
    };
    
    return errorMessages[errorCode] || `알 수 없는 오류가 발생했습니다 (${errorCode}). 브라우저 캐시를 지우고 다시 시도해주세요.`;
  };
  
  const handleRetry = () => {
    // 브라우저 캐시 정리 안내
    window.alert(
      "브라우저 캐시 문제 해결을 위해 다음 단계를 진행해주세요:\n\n" +
      "1. 브라우저 개발자 도구(F12)를 엽니다.\n" +
      "2. Application 탭으로 이동합니다.\n" +
      "3. Storage 섹션에서 'Clear site data'를 클릭합니다.\n" +
      "4. 새 창에서 로그인을 다시 시도합니다.\n\n" +
      "이제 홈페이지로 이동합니다."
    );
    
    // 홈페이지로 리다이렉트
    router.push("/");
  };
  
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <Card className="w-[90%] max-w-md shadow-lg">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-4 text-red-500">
            <AlertCircle size={48} />
          </div>
          <CardTitle className="text-2xl font-bold text-center">인증 오류</CardTitle>
          <CardDescription className="text-center">
            로그인 과정에서 오류가 발생했습니다
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 text-sm bg-red-50 text-red-800 rounded-md border border-red-200">
            {getErrorMessage(reason)}
          </div>
          
          <div className="flex flex-col space-y-3">
            <Button onClick={handleRetry} size="lg">
              다시 시도하기
            </Button>
            <Button 
              variant="outline" 
              onClick={() => router.push("/")} 
              size="lg"
            >
              홈으로 돌아가기
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 