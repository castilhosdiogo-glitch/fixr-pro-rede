import { Home, Search, MessageSquare, User, LayoutDashboard, ClipboardList } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

const BottomNav = () => {
  const location = useLocation();
  const { user, profile } = useAuth();

  const isProfessional = profile?.user_type === "professional";
  const dashboardPath = isProfessional ? "/dashboard" : "/meu-painel";

  const navItems = [
    { path: "/", icon: Home, label: "Início" },
    // Professionals see "Demandas" (their requests), Clients see "Buscar"
    isProfessional
      ? { path: "/dashboard", icon: ClipboardList, label: "Demandas" }
      : { path: "/buscar", icon: Search, label: "Buscar" },
    { path: "/mensagens", icon: MessageSquare, label: "Mensagens" },
    { path: user ? "/perfil" : "/auth", icon: User, label: user ? "Perfil" : "Entrar" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur-md pb-safe">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center justify-center gap-1 px-3 py-2 transition-all active:scale-90 ${
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <div className={`p-1.5 rounded-2xl transition-colors ${isActive ? "bg-primary/10" : ""}`}>
                <Icon size={20} fill={isActive ? "currentColor" : "none"} strokeWidth={isActive ? 2 : 1.5} />
              </div>
              <span className="text-[10px] font-bold tracking-wide leading-none">
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
