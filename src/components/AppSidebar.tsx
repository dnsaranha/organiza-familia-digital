import { NavLink } from 'react-router-dom';
import { Home, BarChart, Users, Settings as SettingsIcon } from 'lucide-react';
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
} from '@/components/ui/sidebar';

const AppSidebar = () => {
  const menuItems = [
    { to: '/', label: 'Home', icon: Home },
    { to: '/reports', label: 'Relatórios', icon: BarChart },
    { to: '/groups', label: 'Grupos', icon: Users },
    { to: '/settings', label: 'Configurações', icon: SettingsIcon },
  ];

  return (
    <Sidebar>
      <SidebarHeader>
        {/* You can add a logo or header content here */}
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {menuItems.map((item) => (
            <SidebarMenuItem key={item.to}>
              <NavLink to={item.to} end className="w-full">
                {({ isActive }) => (
                  <SidebarMenuButton
                    isActive={isActive}
                    tooltip={{ children: item.label }}
                    className="w-full"
                  >
                    <item.icon className="h-5 w-5" />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                )}
              </NavLink>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter>
        {/* Footer content, e.g., user profile, logout */}
      </SidebarFooter>
    </Sidebar>
  );
};

export default AppSidebar;
