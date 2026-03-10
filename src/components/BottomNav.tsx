import { Home, Search, MessageSquare, User } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

const navItems = [
  { path: "/", icon: Home, label: "Início" },
  { path: "/buscar", icon: Search, label: "Buscar" },
  { path: "/mensagens", icon: MessageSquare, label: "Mensagens" },
  { path: "/perfil", icon: User, label: "Perfil" },
];

const BottomNav = () => {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t-2 border-border bg-card">
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center justify-center gap-0.5 px-3 py-2 ${
                isActive ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <Icon size={22} fill={isActive ? "currentColor" : "none"} strokeWidth={isActive ? 0 : 2} />
              <span className="text-[10px] font-medium uppercase tracking-wider font-display">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
