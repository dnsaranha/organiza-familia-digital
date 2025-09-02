import { NavLink } from "react-router-dom";
import { Home, Users, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

export const BottomNavBar = () => {
  return (
    <div className="fixed bottom-0 left-0 z-50 w-full h-16 bg-background border-t border-border">
      <div className="grid h-full max-w-lg grid-cols-3 mx-auto font-medium">
        <NavLink
          to="/"
          className={({ isActive }) =>
            cn(
              "inline-flex flex-col items-center justify-center px-5 hover:bg-muted",
              isActive ? "text-primary" : "text-muted-foreground"
            )
          }
        >
          <Home className="w-5 h-5 mb-1" />
          <span className="text-sm">Home</span>
        </NavLink>
        <NavLink
          to="/groups"
          className={({ isActive }) =>
            cn(
              "inline-flex flex-col items-center justify-center px-5 hover:bg-muted",
              isActive ? "text-primary" : "text-muted-foreground"
            )
          }
        >
          <Users className="w-5 h-5 mb-1" />
          <span className="text-sm">Grupos</span>
        </NavLink>
        <NavLink
          to="/profile"
          className={({ isActive }) =>
            cn(
              "inline-flex flex-col items-center justify-center px-5 hover:bg-muted",
              isActive ? "text-primary" : "text-muted-foreground"
            )
          }
        >
          <Settings className="w-5 h-5 mb-1" />
          <span className="text-sm">Configurações</span>
        </NavLink>
      </div>
    </div>
  );
};
