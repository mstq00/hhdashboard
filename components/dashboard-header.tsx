"use client";

import { usePathname, useRouter } from "next/navigation";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import Image from "next/image";
import * as React from "react";
import { LogOut, User, Bell } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

const PAGE_NAMES: Record<string, string> = {
    "/analytics": "스토어 매출 분석",
    "/sales": "통합 매출",
    "/products": "상품 매핑 관리",
    "/upload": "데이터 업로드",
    "/goals": "목표 관리",
    "/shortform": "숏폼 분석",
    "/tts": "TTS STUDIO",
    "/suno": "SUNO 프롬프트",
    "/thumbnail": "썸네일 생성기",
    "/lineart": "라인아트 스튜디오",
    "/url-shortener": "URL 단축기",
    "/pdf-to-jpg": "PDF to JPG",
    "/bgm": "배경음악 생성",
};

export function DashboardHeader() {
    const pathname = usePathname();
    const router = useRouter();
    const pageTitle = PAGE_NAMES[pathname] || "대시보드";
    const paths = pathname.split("/").filter(Boolean);

    const [isLoading, setIsLoading] = React.useState(false);
    const [userEmail, setUserEmail] = React.useState<string | null>(null);

    React.useEffect(() => {
        const getUserEmail = async () => {
            const { data } = await supabase.auth.getSession();
            const email = data.session?.user?.email || null;
            setUserEmail(email);
        };
        getUserEmail();
    }, []);

    const emailName = userEmail ? userEmail.split('@')[0] : 'user';
    const emailDomain = userEmail ? `@${userEmail.split('@')[1]}` : '';

    const getInitials = (name: string) => {
        if (!name) return 'U';
        return name.substring(0, 2).toUpperCase();
    };

    const handleLogout = async () => {
        try {
            setIsLoading(true);
            const { error } = await supabase.auth.signOut();
            if (error) {
                toast.error("로그아웃 중 오류가 발생했습니다", { description: error.message });
                return;
            }
            toast.success("로그아웃 되었습니다");
            window.location.href = "/";
        } catch (error) {
            console.error("로그아웃 오류:", error);
            toast.error("로그아웃 중 오류가 발생했습니다");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <header className="sticky top-0 z-10 flex h-20 shrink-0 items-center gap-4 px-4 md:px-8 transition-all duration-300 bg-transparent">
            <SidebarTrigger className="-ml-1 size-10 rounded-2xl md:hidden hover:bg-white shadow-sm border border-transparent hover:border-black/5" />
            <div className="flex items-center gap-4 w-full">
                <div className="flex flex-col">
                    <h1 className="text-sm md:text-base font-bold tracking-tight text-foreground/90">
                        {pageTitle}
                    </h1>
                </div>

                <div className="ml-auto flex items-center gap-4">
                    {/* 알림 */}
                    <Button variant="ghost" size="icon" className="size-10 rounded-2xl hover:bg-white shadow-sm transition-all border border-transparent hover:border-black/5" suppressHydrationWarning>
                        <Bell className="size-5 text-muted-foreground" />
                    </Button>

                    {/* 사용자 드롭다운 */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-12 gap-3 px-3 hover:bg-white rounded-2xl transition-all border border-transparent hover:border-black/5 shadow-sm" suppressHydrationWarning>
                                <Avatar className="h-7 w-7 rounded-lg border border-white/20">
                                    <AvatarFallback className="rounded-lg bg-primary/10 text-primary text-[10px] font-bold" suppressHydrationWarning>
                                        {getInitials(emailName)}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="hidden lg:flex flex-col items-start gap-0.5 text-left">
                                    <span className="text-xs font-bold text-foreground/80 leading-none">{emailName}</span>
                                    <span className="text-[10px] text-muted-foreground/60 leading-none">{emailDomain}</span>
                                </div>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56 rounded-2xl p-2 bg-white/90 backdrop-blur-xl border-white/20 shadow-2xl">
                            <DropdownMenuLabel className="px-2 py-1.5">
                                <div className="flex flex-col gap-0.5">
                                    <span className="text-xs font-bold">내 계정</span>
                                    <span className="text-[10px] text-muted-foreground font-medium">{userEmail}</span>
                                </div>
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator className="my-1 bg-black/5" />
                            <DropdownMenuItem className="rounded-xl focus:bg-primary/10 focus:text-primary cursor-pointer transition-colors">
                                <User className="mr-2 size-4" />
                                <span className="text-xs font-semibold">프로필 설정</span>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="my-1 bg-black/5" />
                            <DropdownMenuItem
                                onClick={handleLogout}
                                disabled={isLoading}
                                className="rounded-xl focus:bg-destructive/10 focus:text-destructive cursor-pointer transition-colors text-destructive"
                            >
                                {isLoading ? (
                                    <div className="mr-2 size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                ) : (
                                    <LogOut className="mr-2 size-4" />
                                )}
                                <span className="text-xs font-semibold">로그아웃</span>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="my-1 bg-black/5" />
                            <div className="px-2 py-1 text-center">
                                <span className="text-[9px] font-bold text-muted-foreground/40 uppercase tracking-widest">Version 4.0.2</span>
                            </div>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
        </header>
    );
}
