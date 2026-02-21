'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

interface UIContextType {
    isSidebarCollapsed: boolean;
    toggleSidebar: () => void;
    isMobileMenuOpen: boolean;
    toggleMobileMenu: () => void;
    closeMobileMenu: () => void;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

export function UIProvider({ children }: { children: React.ReactNode }) {
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    // Persist sidebar state in localStorage
    useEffect(() => {
        const savedState = localStorage.getItem('sidebar-collapsed');
        if (savedState !== null) {
            setIsSidebarCollapsed(savedState === 'true');
        }
    }, []);

    const toggleSidebar = () => {
        setIsSidebarCollapsed((prev) => {
            const newState = !prev;
            localStorage.setItem('sidebar-collapsed', String(newState));
            return newState;
        });
    };

    const toggleMobileMenu = () => setIsMobileMenuOpen((prev) => !prev);
    const closeMobileMenu = () => setIsMobileMenuOpen(false);

    return (
        <UIContext.Provider value={{
            isSidebarCollapsed,
            toggleSidebar,
            isMobileMenuOpen,
            toggleMobileMenu,
            closeMobileMenu
        }}>
            {children}
        </UIContext.Provider>
    );
}

export function useUI() {
    const context = useContext(UIContext);
    if (context === undefined) {
        throw new Error('useUI must be used within a UIProvider');
    }
    return context;
}
