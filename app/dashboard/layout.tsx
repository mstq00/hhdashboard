"use client";

import { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { AppSidebar } from "@/components/app-sidebar";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname();
  
  // 현재 페이지 이름 가져오기
  const getPageTitle = () => {
    switch (pathname) {
      case "/dashboard":
        return "스토어 분석";
      case "/dashboard/total-sales":
        return "통합 매출";
      case "/dashboard/detail-data":
        return "상세 데이터";
      case "/dashboard/products":
        return "상품관리";
      case "/dashboard/order":
        return "발주 현황";
      case "/dashboard/settings":
        return "설정";
      default:
        return "헤이두 홈 대시보드";
    }
  };

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
              <h1 className="font-semibold">{getPageTitle()}</h1>
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