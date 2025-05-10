"use client"

import * as React from "react"
import { LogOut, User } from "lucide-react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

export function NavUser() {
  const router = useRouter()
  const [isLoading, setIsLoading] = React.useState(false)
  
  const handleLogout = async () => {
    try {
      setIsLoading(true)
      const { error } = await supabase.auth.signOut()
      
      if (error) {
        toast.error("로그아웃 중 오류가 발생했습니다", {
          description: error.message
        })
        return
      }
      
      toast.success("로그아웃 되었습니다")
      window.location.href = "/"
    } catch (error) {
      console.error("로그아웃 오류:", error)
      toast.error("로그아웃 중 오류가 발생했습니다")
    } finally {
      setIsLoading(false)
    }
  }
  
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton
          className="group flex size-full flex-1 items-center gap-2"
        >
          <Avatar className="size-8 border">
            <AvatarFallback className="text-xs">AT</AvatarFallback>
          </Avatar>
          <div className="grid flex-1 text-left text-sm leading-tight">
            <span className="text-sidebar-foreground/90 truncate font-medium">
              admin test
            </span>
            <span className="text-sidebar-foreground/60 truncate text-xs">
              test@test.com
            </span>
          </div>
        </SidebarMenuButton>
      </SidebarMenuItem>
      <SidebarMenuItem>
        <SidebarMenuButton
          onClick={handleLogout}
          disabled={isLoading}
        >
          {isLoading ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          ) : (
            <LogOut className="size-4" />
          )}
          <span>로그아웃</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
