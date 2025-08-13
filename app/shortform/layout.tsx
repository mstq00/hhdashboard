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

interface ShortformLayoutProps {
  children: ReactNode;
}

export default function ShortformLayout({ children }: ShortformLayoutProps) {
  const router = useRouter();
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
              <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
              <h1 className="font-semibold">숏폼 분석</h1>
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