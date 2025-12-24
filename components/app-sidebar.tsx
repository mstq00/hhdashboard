"use client"

import * as React from "react"
import { useRouter, usePathname } from "next/navigation"
import {
  LayoutDashboard, 
  DollarSign, 
  Package, 
  Target,
  Video,
  BarChart3,
  PenTool,
  FileText,
  Mic,
  Search,
  ShoppingBag,
  ChevronRight,
  Upload,
  Music,
} from "lucide-react"

import { NavUser } from "@/components/nav-user"
import { TeamSwitcher } from "@/components/team-switcher"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarRail,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
} from "@/components/ui/sidebar"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const router = useRouter()
  const pathname = usePathname()
  
  // 페이지 이동 함수
  const navigateTo = (path: string) => {
    router.push(path)
  }
  
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher />
      </SidebarHeader>
      <SidebarContent>
        {/* 운영 유틸리티 */}
        <SidebarGroup>
          <SidebarGroupLabel>운영 유틸리티</SidebarGroupLabel>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton 
                isActive={pathname === "/analytics"} 
                onClick={() => navigateTo("/analytics")}
              >
                <LayoutDashboard className="size-4" />
                <span>스토어 매출 분석</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton 
                isActive={pathname === "/sales"} 
                onClick={() => navigateTo("/sales")}
              >
                <DollarSign className="size-4" />
                <span>통합 매출</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton 
                isActive={pathname === "/products"} 
                onClick={() => navigateTo("/products")}
              >
                <Package className="size-4" />
                <span>상품 매핑 관리</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton 
                isActive={pathname === "/upload"} 
                onClick={() => navigateTo("/upload")}
              >
                <Upload className="size-4" />
                <span>데이터 업로드</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            {/* 목표 관리 */}
            <SidebarMenuItem>
              <SidebarMenuButton 
                isActive={pathname === "/goals"} 
                onClick={() => navigateTo("/goals")}
              >
                <Target className="size-4" />
                <span>목표 관리</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>

        {/* 콘텐츠 유틸리티 */}
        <SidebarGroup>
          <SidebarGroupLabel>콘텐츠 유틸리티</SidebarGroupLabel>
          <SidebarMenu>
            {/* 숏폼 분석 */}
            <SidebarMenuItem>
              <SidebarMenuButton>
                <Video className="size-4" />
                <span>숏폼 분석</span>
              </SidebarMenuButton>
              <SidebarMenuSub>
                <SidebarMenuSubItem>
                  <SidebarMenuSubButton 
                    isActive={pathname === "/shortform/analyze"} 
                    onClick={() => navigateTo("/shortform/analyze")}
                  >
                    <BarChart3 className="size-4" />
                    <span>분석하기</span>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
                <SidebarMenuSubItem>
                  <SidebarMenuSubButton 
                    isActive={pathname === "/shortform/results"} 
                    onClick={() => navigateTo("/shortform/results")}
                  >
                    <FileText className="size-4" />
                    <span>분석결과</span>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              </SidebarMenuSub>
            </SidebarMenuItem>

            {/* 숏폼 기획 */}
            <SidebarMenuItem>
              <SidebarMenuButton>
                <PenTool className="size-4" />
                <span>숏폼 기획</span>
              </SidebarMenuButton>
              <SidebarMenuSub>
                <SidebarMenuSubItem>
                  <SidebarMenuSubButton 
                    isActive={false}
                    className="cursor-not-allowed opacity-50"
                  >
                    <PenTool className="size-4" />
                    <span>기획하기</span>
                    <span className="ml-auto text-xs text-muted-foreground">(준비중)</span>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
                <SidebarMenuSubItem>
                  <SidebarMenuSubButton 
                    isActive={false}
                    className="cursor-not-allowed opacity-50"
                  >
                    <FileText className="size-4" />
                    <span>기획결과</span>
                    <span className="ml-auto text-xs text-muted-foreground">(준비중)</span>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              </SidebarMenuSub>
            </SidebarMenuItem>

            {/* TTS STUDIO */}
            <SidebarMenuItem>
              <SidebarMenuButton 
                isActive={pathname === "/tts"} 
                onClick={() => navigateTo("/tts")}
              >
                <Mic className="size-4" />
                <span>TTS STUDIO</span>
              </SidebarMenuButton>
            </SidebarMenuItem>

            {/* BGM STUDIO - 임시 비활성화 */}
            <SidebarMenuItem>
              <SidebarMenuButton 
                isActive={false}
                className="cursor-not-allowed opacity-50"
              >
                <Music className="size-4" />
                <span>BGM STUDIO</span>
                <span className="ml-auto text-xs text-muted-foreground">(비활성화)</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>

        {/* 상품 유틸리티 */}
        <SidebarGroup>
          <SidebarGroupLabel>상품 유틸리티</SidebarGroupLabel>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton 
                isActive={pathname === "/dashboard/product/detail-planning"}
                className="cursor-not-allowed opacity-50"
              >
                <FileText className="size-4" />
                <span>상세페이지 기획</span>
                <span className="ml-auto text-xs text-muted-foreground">(준비중)</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton 
                isActive={pathname === "/dashboard/product/search"}
                className="cursor-not-allowed opacity-50"
              >
                <Search className="size-4" />
                <span>상품 서칭</span>
                <span className="ml-auto text-xs text-muted-foreground">(준비중)</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
