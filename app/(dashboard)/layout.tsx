"use client";

import { ReactNode, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppSidebar } from "@/components/app-sidebar";
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar";
import { supabase } from "@/lib/supabase";
import { DashboardHeader } from "@/components/dashboard-header";
import { RightPanelProvider, useRightPanel } from "@/lib/context/right-panel-context";

interface DashboardLayoutProps {
  children: ReactNode;
}

function DashboardLayoutContent({ children }: DashboardLayoutProps) {
  const router = useRouter();
  const { content, isOpen } = useRightPanel();
  const [isLoading, setIsLoading] = useState(true);

  // 인증 확인
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          console.error('인증 확인 오류:', error);
        }

        if (!session) {
          console.log('인증되지 않은 사용자, 홈으로 리다이렉트');
          // 개발 모드나 특정 상황에서는 건너뛰고 싶을 수 있으므로 체크
          // 하지만 기본적으로는 리다이렉트
          router.push('/');
          return;
        }

        setIsLoading(false);
      } catch (error) {
        console.error('인증 확인 중 오류:', error);
        router.push('/');
      }
    };

    checkAuth();
  }, [router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--background)]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--pastel-blue-fg)] mx-auto"></div>
          <p className="mt-2 text-sm text-slate-500">로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen w-full bg-[var(--background)] text-foreground">
        <AppSidebar />
        <SidebarInset className="flex flex-col overflow-hidden bg-transparent">
          <DashboardHeader />
          <div className="flex flex-1 overflow-hidden">
            <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
              <div className="mx-auto max-w-full xl:max-w-6xl space-y-6">
                {children}
              </div>

              {/* 모바일/태블릿 대응: 우측 패널 콘텐츠를 메인 하단에 표시 (LG 미만) */}
              {content && isOpen && (
                <div className="lg:hidden mt-8 pt-8 pb-12 border-t border-black/5 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="bg-white/40 backdrop-blur-sm rounded-[2rem] p-4 border-none shadow-sm shadow-black/5">
                    {content}
                  </div>
                </div>
              )}
            </main>

            {/* Right Panel - Hidden on small screens, dynamic content on LG+ */}
            {content && isOpen && (
              <aside className="hidden lg:flex w-[350px] shrink-0 border-l border-white/20 bg-white/40 backdrop-blur-xl p-6 overflow-y-auto">
                <div className="w-full space-y-6">
                  {content}
                </div>
              </aside>
            )}
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <RightPanelProvider>
      <DashboardLayoutContent>{children}</DashboardLayoutContent>
    </RightPanelProvider>
  );
}
