"use client";

import { ReactNode, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppSidebar } from "@/components/app-sidebar";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/lib/supabase";

interface AnalyticsLayoutProps {
  children: ReactNode;
}

export default function AnalyticsLayout({ children }: AnalyticsLayoutProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  
  // 인증 확인
  useEffect(() => {
    const checkAuth = async () => {
      try {
        console.log('analytics layout: 인증 확인 시작');
        
        // 먼저 기존 세션 확인
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('analytics layout: 세션 확인 오류:', sessionError);
        }
        
        // 세션이 있고 유효한 경우
        if (session && session.expires_at && session.expires_at * 1000 > Date.now()) {
          console.log('analytics layout: 유효한 세션 존재', session.user?.id);
          setIsLoading(false);
          return;
        }
        
        // 세션이 있지만 만료된 경우 새로고침 시도
        if (session) {
          try {
            const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
            
            if (refreshError) {
              console.error('analytics layout: 세션 새로고침 오류:', refreshError);
            } else if (refreshData.session) {
              console.log('analytics layout: 세션 새로고침 성공', refreshData.session.user?.id);
              setIsLoading(false);
              return;
            }
          } catch (refreshError) {
            console.error('analytics layout: 세션 새로고침 중 오류:', refreshError);
          }
        }
        
        // 세션이 없거나 새로고침 실패
        console.log('analytics layout: 인증되지 않은 사용자, 홈으로 리다이렉트');
        router.push('/');
      } catch (error) {
        console.error('analytics layout: 인증 확인 중 오류:', error);
        router.push('/');
      }
    };
    
    checkAuth();
  }, [router]);
  
  // 로딩 중 표시
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600">인증 확인 중...</p>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen">
        <AppSidebar />
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center border-b">
            <div className="flex items-center gap-2 px-4 w-full">
              <SidebarTrigger className="-ml-1" />
              <Separator
                orientation="vertical"
                className="mr-2 data-[orientation=vertical]:h-4"
              />
              <h1 className="font-semibold">스토어 분석</h1>
            </div>
          </header>
          <div className="flex-1 p-6 bg-background/95">
            {children}
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
} 