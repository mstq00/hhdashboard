"use client";

import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect, useRef } from "react";
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
    const [isOpen, setIsOpen] = useState(true);
    const pathname = usePathname();

    // Use a ref to track the path associated with the current content.
    // This avoids race conditions where the 'clear' effect runs after the new page's 'set' effect
    // but sees the old state value.
    const contentPathRef = useRef<string | null>(null);

    const setContent = useCallback((newContent: ReactNode | null) => {
        setContentState(newContent);
        // Synchronously update the ref so effects/logic can see the new "claimed" path immediately
        if (newContent) {
            contentPathRef.current = pathname;
        } else {
            contentPathRef.current = null;
        }
    }, [pathname]);

    const open = useCallback(() => setIsOpen(true), []);
    const close = useCallback(() => setIsOpen(false), []);
    const toggle = useCallback(() => setIsOpen((prev) => !prev), []);

    // Handle path changes
    useEffect(() => {
        // If the current path doesn't match the path that 'owns' the content,
        // it means we navigated to a new page that didn't set any content (yet or at all).
        // However, if the new page DID set content, setContent would have updated contentPathRef to match pathname.
        if (contentPathRef.current && contentPathRef.current !== pathname) {
            setContentState(null);
            contentPathRef.current = null;
        }
    }, [pathname]);

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
