"use client";

import { LoginForm } from "@/components/login-form"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Image from "next/image"
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function Home() {
  const router = useRouter()
  const [isChecking, setIsChecking] = useState(true)
  
  useEffect(() => {
    // 이미 로그인되어 있는지 확인
    const checkAuth = async () => {
      try {
        console.log('홈페이지: 인증 확인 시작');
        
        // 먼저 기존 세션 확인
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('홈페이지: 세션 확인 오류:', sessionError);
        }
        
        // 세션이 있고 유효한 경우에만 새로고침 시도
        if (session && session.expires_at && session.expires_at * 1000 > Date.now()) {
          console.log('홈페이지: 유효한 세션 존재, 대시보드로 이동');
          console.log('홈페이지: 사용자 ID:', session.user?.id);
          window.location.href = '/analytics';
          return;
        }
        
        // 세션이 있지만 만료된 경우 새로고침 시도
        if (session) {
          try {
            const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
            
            if (refreshError) {
              console.error('홈페이지: 세션 새로고침 오류:', refreshError);
            } else if (refreshData.session) {
              console.log('홈페이지: 세션 새로고침 성공, 유효한 세션 존재');
              console.log('홈페이지: 사용자 ID:', refreshData.session.user?.id);
              window.location.href = '/analytics';
              return;
            }
          } catch (refreshError) {
            console.error('홈페이지: 세션 새로고침 중 오류:', refreshError);
          }
        }
        
        console.log('홈페이지: 세션 없음 또는 만료됨, 로그인 폼 표시');
        setIsChecking(false);
      } catch (error) {
        console.error('홈페이지: 세션 확인 오류:', error);
        setIsChecking(false);
      }
    }
    
    // URL에서 auth_redirect 파라미터 제거 (깔끔한 URL 유지)
    const url = new URL(window.location.href)
    if (url.searchParams.has('auth_redirect')) {
      url.searchParams.delete('auth_redirect')
      window.history.replaceState({}, '', url.toString())
    }
    
    checkAuth()
  }, [])
  
  // 로딩 표시
  if (isChecking) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center p-4 md:p-8">
        <div className="w-full max-w-md animate-pulse space-y-8 rounded-lg border border-border/40 bg-card p-6 shadow-sm">
          <div className="flex justify-center">
            <div className="h-12 w-32 rounded bg-muted"></div>
          </div>
          <div className="space-y-4">
            <div className="h-4 w-full rounded bg-muted"></div>
            <div className="h-10 w-full rounded bg-muted"></div>
            <div className="h-4 w-full rounded bg-muted"></div>
            <div className="h-10 w-full rounded bg-muted"></div>
            <div className="h-10 w-full rounded bg-muted"></div>
          </div>
        </div>
      </div>
    )
  }

  // 현재 날짜 표시
  const today = new Date()
  const formattedDate = today.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  })

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="text-xl font-medium text-gray-600 mb-2">{formattedDate}</div>
        </div>

        <Card className="w-full shadow-lg">
          <CardHeader className="space-y-1 items-center text-center">
            <Image
              src="/hejdoohomelogo.png"
              alt="헤이두 홈 로고"
              width={150}
              height={50}
              className="h-12 w-auto mb-4"
              priority
            />
            <CardTitle className="text-2xl font-semibold tracking-tight">
              로그인
            </CardTitle>
            <CardDescription>
              헤이두 홈 대시보드에 로그인하세요
            </CardDescription>
          </CardHeader>
          <CardContent>
            <LoginForm />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
