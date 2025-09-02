import * as React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { Home, Users, PanelLeft, Menu, PiggyBank, Settings, LogOut } from "lucide-react";

import {
  Sidebar,
  SidebarProvider,
  SidebarTrigger,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarInset,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { BottomNavBar } from "@/components/BottomNavBar";
import { BudgetScopeSwitcher } from "@/components/BudgetScopeSwitcher";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

const AppShell = ({ children }: { children: React.ReactNode }) => {
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  if (isMobile) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-40 w-full border-b bg-background">
          <div className="container flex h-16 items-center justify-between">
            <NavLink to="/" className="flex items-center gap-3">
              <div className="rounded-full p-2 bg-gradient-primary shadow-glow">
                <PiggyBank className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <div className="font-bold text-primary">Organiza</div>
                <p className="text-xs text-muted-foreground">
                  Gestão Financeira Familiar
                </p>
              </div>
            </NavLink>
            <div className="flex items-center gap-2">
              <BudgetScopeSwitcher />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <Menu className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                {user ? (
                  <>
                    <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <NavLink to="/pricing">Planos</NavLink>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <NavLink to="/profile">Perfil</NavLink>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleLogout}>Sair</DropdownMenuItem>
                  </>
                ) : (
                  <DropdownMenuItem asChild>
                    <NavLink to="/auth">Login</NavLink>
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>
        <main className="pb-20">{children}</main>
        <BottomNavBar />
      </div>
    );
  }

  return (
    <SidebarProvider defaultOpen>
      <Sidebar>
        <div className="flex h-full flex-col">
          <SidebarHeader className="flex items-center justify-between p-4">
            <NavLink to="/" className="flex items-center gap-2">
              <div className="rounded-full p-2 bg-gradient-primary shadow-glow">
                <PiggyBank className="h-6 w-6 text-primary-foreground" />
              </div>
              <span className="font-bold text-lg text-primary">Organiza</span>
            </NavLink>
            <SidebarTrigger>
              <PanelLeft className="size-5" />
            </SidebarTrigger>
          </SidebarHeader>
          <SidebarContent className="flex-1">
            <SidebarMenu>
              <SidebarMenuItem>
                <NavLink to="/" className="w-full">
                  {({ isActive }) => (
                    <SidebarMenuButton isActive={isActive}>
                      <Home className="size-4" />
                      <span>Home</span>
                    </SidebarMenuButton>
                  )}
                </NavLink>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <NavLink to="/groups" className="w-full">
                  {({ isActive }) => (
                    <SidebarMenuButton isActive={isActive}>
                      <Users className="size-4" />
                      <span>Grupos</span>
                    </SidebarMenuButton>
                  )}
                </NavLink>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarContent>
          <SidebarFooter>
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="w-full justify-start gap-2">
                    <div className="flex size-8 items-center justify-center rounded-full bg-muted">
                      <span>{user.email?.[0].toUpperCase()}</span>
                    </div>
                    <span className="truncate">{user.email}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">
                        Minha Conta
                      </p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {user.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <NavLink to="/profile">Perfil</NavLink>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleLogout}>Sair</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button asChild className="w-full">
                <NavLink to="/auth">Login</NavLink>
              </Button>
            )}
          </SidebarFooter>
        </div>
      </Sidebar>
      <SidebarInset>
        <header className="border-b p-4">
          <div className="flex items-center justify-end gap-4">
            <BudgetScopeSwitcher />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/pricing")}
              className="text-muted-foreground hover:text-primary"
            >
              Planos
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/profile")}
              className="text-muted-foreground hover:text-primary"
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </header>
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
};

export default AppShell;
