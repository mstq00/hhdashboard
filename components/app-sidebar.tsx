"use client"

import * as React from "react"
import { useRouter, usePathname } from "next/navigation"
import {
  LayoutDashboard, 
  DollarSign, 
  FileText, 
  Package, 
  ShoppingCart,
  Settings,
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
} from "@/components/ui/sidebar"

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const router = useRouter()
  const pathname = usePathname()
  
  // 인증 건너뛰기 파라미터 추가 함수
  const navigateTo = (path: string) => {
    router.push(`${path}?skip_auth=true`)
  }
  
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher />
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton 
              isActive={pathname === "/dashboard"} 
              onClick={() => navigateTo("/dashboard")}
            >
              <LayoutDashboard className="size-4" />
              <span>스토어 분석</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton 
              isActive={pathname === "/dashboard/total-sales"} 
              onClick={() => navigateTo("/dashboard/total-sales")}
            >
              <DollarSign className="size-4" />
              <span>통합 매출</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton 
              isActive={pathname === "/dashboard/detail-data"} 
              onClick={() => navigateTo("/dashboard/detail-data")}
            >
              <FileText className="size-4" />
              <span>상세 데이터</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton 
              isActive={pathname === "/dashboard/products"} 
              onClick={() => navigateTo("/dashboard/products")}
            >
              <Package className="size-4" />
              <span>상품관리</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton 
              isActive={pathname === "/dashboard/orders"} 
              onClick={() => navigateTo("/dashboard/orders")}
            >
              <ShoppingCart className="size-4" />
              <span>발주 현황</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
