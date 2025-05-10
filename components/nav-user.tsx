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
  const [userEmail, setUserEmail] = React.useState<string | null>(null)
  
  // 사용자 이메일 정보 가져오기
  React.useEffect(() => {
    const getUserEmail = async () => {
      const { data } = await supabase.auth.getSession();
      const email = data.session?.user?.email || null;
      setUserEmail(email);
    };
    
    getUserEmail();
  }, []);
  
  // 이메일을 @ 기준으로 분리
  const emailName = userEmail ? userEmail.split('@')[0] : 'user';
  const emailDomain = userEmail ? `@${userEmail.split('@')[1]}` : '';
  
  // 이메일 앞부분의 첫 글자들을 아바타에 표시
  const getInitials = (name: string) => {
    if (!name) return 'U';
    
    if (name.length <= 2) return name.toUpperCase();
    
    return name.substring(0, 2).toUpperCase();
  };
  
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
      <SidebarMenuItem className="group-data-[state=collapsed]/sidebar:hidden">
        <SidebarMenuButton
          className="group flex size-full flex-1 items-center gap-2"
        >
          <Avatar className="size-8 border">
            <AvatarFallback className="text-xs">{getInitials(emailName)}</AvatarFallback>
          </Avatar>
          <div className="grid flex-1 text-left text-sm leading-tight">
            <span className="text-sidebar-foreground/90 truncate font-medium">
              {emailName}
            </span>
            <span className="text-sidebar-foreground/60 truncate text-xs">
              {emailDomain}
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
          <span className="group-data-[state=collapsed]/sidebar:hidden">로그아웃</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
