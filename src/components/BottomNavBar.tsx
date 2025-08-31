import { NavLink } from 'react-router-dom';
import { Home, BarChart, Users, Settings as SettingsIcon } from 'lucide-react';

const menuItems = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/reports', label: 'Relatórios', icon: BarChart },
  { to: '/groups', label: 'Grupos', icon: Users },
  { to: '/settings', label: 'Configurações', icon: SettingsIcon },
];

const BottomNavBar = () => {
  return (
    <div className="fixed bottom-0 left-0 right-0 h-16 bg-background border-t shadow-lg md:hidden z-50">
      <nav className="flex justify-around items-center h-full">
        {menuItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end
            className={({ isActive }) =>
              `flex flex-col items-center justify-center w-full h-full text-sm font-medium transition-colors ${
                isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              }`
            }
          >
            <item.icon className="h-6 w-6 mb-1" />
            <span className="text-xs">{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
};

export default BottomNavBar;
