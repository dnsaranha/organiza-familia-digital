import React from 'react';
import { Outlet } from 'react-router-dom';
import { SidebarProvider } from '@/components/ui/sidebar';
import AppSidebar from '@/components/AppSidebar';
import { useIsMobile } from '@/hooks/use-mobile';
import BottomNavBar from '@/components/BottomNavBar';
import AppHeader from '@/components/AppHeader';

const MainLayout = () => {
  const isMobile = useIsMobile();

  return (
    <SidebarProvider>
      <div className="flex min-h-screen bg-muted/40">
        {!isMobile && <AppSidebar />}
        <div className="flex flex-col flex-1">
          <AppHeader />
          <main className="flex-1 p-4 md:p-8 overflow-auto pb-20 md:pb-8">
            <Outlet />
          </main>
        </div>
        {isMobile && <BottomNavBar />}
      </div>
    </SidebarProvider>
  );
};

export default MainLayout;
