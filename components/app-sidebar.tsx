"use client"

import * as React from "react"
import { useRouter, usePathname } from "next/navigation"
import Image from "next/image"
import {
  Home,
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
  Image as ImageIcon,
  Link2,
  Settings,
  Sparkles,
  History,
} from "lucide-react"

import { NavUser } from "@/components/nav-user"

import {
  Sidebar,
  SidebarContent,
  SidebarRail,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarHeader,
  SidebarFooter,
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
    <Sidebar collapsible="icon" className="border-r border-black/5 bg-sidebar" {...props}>
      {/* 로고 헤더 */}
      <SidebarHeader className="px-4 py-6">
        <div className="flex items-center justify-center group-data-[collapsible=icon]:justify-center">
          <Image
            src="/hejdoo-logo-new.png"
            alt="Hejdoo Home"
            width={120}
            height={40}
            className="h-8 w-auto object-contain group-data-[collapsible=icon]:h-6 brightness-0 invert opacity-90"
          />
        </div>
      </SidebarHeader>

      <SidebarContent className="px-3 py-2 overflow-y-auto custom-scrollbar">
        {/* 운영 유틸리티 */}
        <SidebarGroup>
          <SidebarGroupLabel className="px-2 text-[10px] font-bold text-muted-foreground/30 uppercase tracking-[0.2em]">운영 유틸리티</SidebarGroupLabel>
          <SidebarMenu className="gap-0.5 mt-2">
            {[
              { path: "/home", name: "홈", icon: Home },
              { path: "/analytics", name: "스토어 매출 분석", icon: LayoutDashboard },
              { path: "/sales", name: "통합 매출", icon: DollarSign },
              { path: "/products", name: "상품 매핑 관리", icon: Package },
              { path: "/upload", name: "데이터 업로드", icon: Upload },
              { path: "/goals", name: "목표 관리", icon: Target },
            ].map((item) => (
              <SidebarMenuItem key={item.path}>
                <SidebarMenuButton
                  isActive={pathname === item.path}
                  onClick={() => navigateTo(item.path)}
                  tooltip={item.name}
                  className={`smooth-transition rounded-xl h-10 px-4 ${pathname === item.path
                    ? "bg-white/10 text-white font-bold backdrop-blur-md"
                    : "hover:bg-white/5 text-sidebar-foreground hover:text-white font-medium"
                    }`}
                >
                  <item.icon className={`size-4.5 transition-transform duration-300 ${pathname === item.path ? 'scale-110 opacity-100' : 'opacity-50'}`} />
                  <span className="ml-2 text-sm">{item.name}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>

        {/* 콘텐츠 유틸리티 */}
        <SidebarGroup className="mt-4">
          <SidebarGroupLabel className="px-2 text-[10px] font-bold text-muted-foreground/30 uppercase tracking-[0.2em]">콘텐츠 유틸리티</SidebarGroupLabel>
          <SidebarMenu className="gap-0.5 mt-2">
            <SidebarMenuItem>
              <SidebarMenuButton
                isActive={pathname.startsWith("/shortform") && !pathname.includes("/osmu")}
                onClick={() => navigateTo("/shortform")}
                tooltip="숏폼 분석"
                className={`smooth-transition rounded-xl h-10 px-4 ${pathname.startsWith("/shortform") && !pathname.includes("/osmu")
                  ? "bg-white/10 text-white font-bold backdrop-blur-md"
                  : "hover:bg-white/5 text-sidebar-foreground hover:text-white font-medium"
                  }`}
              >
                <Video className={`size-4.5 transition-transform duration-300 ${pathname.startsWith("/shortform") && !pathname.includes("/osmu") ? 'scale-110 opacity-100' : 'opacity-50'}`} />
                <span className="ml-2 text-sm">숏폼 분석</span>
              </SidebarMenuButton>
            </SidebarMenuItem>

            <SidebarMenuItem>
              <SidebarMenuButton
                isActive={pathname === "/osmu"}
                onClick={() => navigateTo("/osmu")}
                tooltip="OSMU 스튜디오"
                className={`smooth-transition rounded-xl h-10 px-4 ${pathname === "/osmu"
                  ? "bg-white/10 text-white font-bold backdrop-blur-md"
                  : "hover:bg-white/5 text-sidebar-foreground hover:text-white font-medium"
                  }`}
              >
                <Sparkles className={`size-4.5 transition-transform duration-300 ${pathname === "/osmu" ? 'scale-110 opacity-100' : 'opacity-50'}`} />
                <span className="ml-2 text-sm font-medium">OSMU 스튜디오</span>
              </SidebarMenuButton>
            </SidebarMenuItem>

            {[
              { path: "/tts", name: "TTS STUDIO", icon: Mic },
              { path: "/suno", name: "SUNO 프롬프트", icon: Music },
              { path: "/thumbnail", name: "썸네일 생성기", icon: ImageIcon },
            ].map((item) => (
              <SidebarMenuItem key={item.path}>
                <SidebarMenuButton
                  isActive={pathname === item.path}
                  onClick={() => navigateTo(item.path)}
                  tooltip={item.name}
                  className={`smooth-transition rounded-xl h-10 px-4 ${pathname === item.path
                    ? "bg-white/10 text-white font-bold backdrop-blur-md"
                    : "hover:bg-white/5 text-sidebar-foreground hover:text-white font-medium"
                    }`}
                >
                  <item.icon className={`size-4.5 transition-transform duration-300 ${pathname === item.path ? 'scale-110 opacity-100' : 'opacity-50'}`} />
                  <span className="ml-2 text-sm font-medium">{item.name}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>

        {/* 상품 유틸리티 */}
        <SidebarGroup className="mt-4">
          <SidebarGroupLabel className="px-2 text-[10px] font-bold text-muted-foreground/30 uppercase tracking-[0.2em]">상품 유틸리티</SidebarGroupLabel>
          <SidebarMenu className="gap-0.5 mt-2">
            <SidebarMenuItem>
              <SidebarMenuButton
                isActive={pathname === "/lineart"}
                onClick={() => navigateTo("/lineart")}
                tooltip="라인아트 스튜디오"
                className={`smooth-transition rounded-xl h-10 px-4 ${pathname === "/lineart"
                  ? "bg-white/10 text-white font-bold backdrop-blur-md"
                  : "hover:bg-white/5 text-sidebar-foreground hover:text-white font-medium"
                  }`}
              >
                <PenTool className={`size-4.5 transition-transform duration-300 ${pathname === "/lineart" ? 'scale-110 opacity-100' : 'opacity-50'}`} />
                <span className="ml-2 text-sm font-medium">라인아트 스튜디오</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>

        {/* 기타 유틸리티 */}
        <SidebarGroup className="mt-4 mb-8">
          <SidebarGroupLabel className="px-2 text-[10px] font-bold text-muted-foreground/30 uppercase tracking-[0.2em]">기타 유틸리티</SidebarGroupLabel>
          <SidebarMenu className="gap-0.5 mt-2">
            {[
              { path: "/url-shortener", name: "URL 단축기", icon: Link2 },
              { path: "/pdf-to-jpg", name: "PDF to JPG", icon: FileText },
            ].map((item) => (
              <SidebarMenuItem key={item.path}>
                <SidebarMenuButton
                  isActive={pathname === item.path}
                  onClick={() => navigateTo(item.path)}
                  tooltip={item.name}
                  className={`smooth-transition rounded-xl h-10 px-4 ${pathname === item.path
                    ? "bg-white/10 text-white font-bold backdrop-blur-md"
                    : "hover:bg-white/5 text-sidebar-foreground hover:text-white font-medium"
                    }`}
                >
                  <item.icon className={`size-4.5 transition-transform duration-300 ${pathname === item.path ? 'scale-110 opacity-100' : 'opacity-50'}`} />
                  <span className="ml-2 text-sm font-medium">{item.name}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 bg-black/20 backdrop-blur-md border-t border-white/5 mt-auto flex justify-center items-center">
        <span className="text-[10px] font-black text-white/30 tracking-[0.4em] uppercase">V 4.1.1</span>
      </SidebarFooter>
    </Sidebar>
  )
}
