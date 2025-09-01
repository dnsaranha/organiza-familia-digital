import React from 'react';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useIsMobile } from '@/hooks/use-mobile';

const AppHeader = () => {
    const isMobile = useIsMobile();

    if (isMobile) {
        return null;
    }

    return (
        <header className="flex h-14 items-center gap-4 border-b bg-muted/40 px-6">
            <SidebarTrigger />
            <h1 className="text-lg font-semibold">Dashboard</h1>
        </header>
    );
};

export default AppHeader;
