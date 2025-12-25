"use client";

import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from "react";
import { usePathname } from "next/navigation";

interface RightPanelContextType {
    content: ReactNode | null;
    isOpen: boolean;
    setContent: (content: ReactNode | null) => void;
    open: () => void;
    close: () => void;
    toggle: () => void;
}

const RightPanelContext = createContext<RightPanelContextType | undefined>(undefined);

export function RightPanelProvider({ children }: { children: ReactNode }) {
    const [content, setContentState] = useState<ReactNode | null>(null);
    const [contentPath, setContentPath] = useState<string | null>(null); // 컨텐츠가 설정된 당시의 경로
    const [isOpen, setIsOpen] = useState(true);
    const pathname = usePathname();

    // 경로가 변경되었을 때, 이전에 다른 경로에서 설정된 컨텐츠라면 초기화
    useEffect(() => {
        if (contentPath && contentPath !== pathname) {
            setContentState(null);
            setContentPath(null);
        }
    }, [pathname, contentPath]);

    const setContent = useCallback((newContent: ReactNode | null) => {
        setContentState(newContent);
        if (newContent) {
            setContentPath(pathname);
        } else {
            setContentPath(null);
        }
    }, [pathname]);

    const open = useCallback(() => setIsOpen(true), []);
    const close = useCallback(() => setIsOpen(false), []);
    const toggle = useCallback(() => setIsOpen((prev) => !prev), []);

    const value = React.useMemo(() => ({
        content,
        isOpen,
        setContent,
        open,
        close,
        toggle,
    }), [content, isOpen, setContent, open, close, toggle]);

    return (
        <RightPanelContext.Provider value={value}>
            {children}
        </RightPanelContext.Provider>
    );
}

export function useRightPanel() {
    const context = useContext(RightPanelContext);
    if (context === undefined) {
        throw new Error("useRightPanel must be used within a RightPanelProvider");
    }
    return context;
}
