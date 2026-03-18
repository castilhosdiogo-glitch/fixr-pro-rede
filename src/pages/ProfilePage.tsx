import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LogOut, LayoutDashboard, ChevronRight, Settings, User } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import BottomNav from "@/components/BottomNav";
import { motion } from "framer-motion";

const ProfilePage = () => {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [professionalProfile, setProfessionalProfile] = useState<any>(null);

  useEffect(() => {
    if (!user) return;
    const fetchProfile = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();
      setProfile(data);

      if (data?.user_type === "professional") {
        const { data: pp } = await supabase
          .from("professional_profiles")
          .select("*")
          .eq("user_id", user.id)
          .single();
        setProfessionalProfile(pp);
      }
    };
    fetchProfile();
  }, [user]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen pb-20 bg-background">
        <header className="sticky top-0 z-50 bg-card/95 backdrop-blur-xl border-b border-border/50 px-4 py-3">
          <div className="max-w-lg mx-auto">
            <h1 className="font-display text-base tracking-tight text-foreground">Meu Perfil</h1>
          </div>
        </header>
        <div className="flex flex-col items-center justify-center py-20 px-4 text-center max-w-lg mx-auto">
          <div className="w-20 h-20 rounded-2xl bg-muted flex items-center justify-center mb-4">
            <User size={32} className="text-muted-foreground" />
          </div>
          <p className="text-muted-foreground text-sm mb-6">
            Faça login para acessar seu perfil.
          </p>
          <div className="flex gap-3 w-full max-w-xs">
            <Link
              to="/auth"
              className="flex-1 py-3 rounded-xl gradient-primary text-primary-foreground font-display text-sm text-center"
            >
              Entrar
            </Link>
            <Link
              to="/auth"
              className="flex-1 py-3 rounded-xl border border-border text-foreground font-display text-sm text-center hover:border-primary transition-colors"
            >
              Criar Conta
            </Link>
          </div>
        </div>
        <BottomNav />
      </div>
    );
  }

  const initials = (profile?.full_name || "U")
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const isProfessional = profile?.user_type === "professional";

  const menuItems = [
    ...(isProfessional
      ? [{ to: "/dashboard", icon: LayoutDashboard, label: "Painel Profissional", desc: "Gerencie seus serviços" }]
      : [{ to: "/meu-painel", icon: LayoutDashboard, label: "Meu Painel", desc: "Suas solicitações" }]),
  ];

  return (
    <div className="min-h-screen pb-20 bg-background">
      <header className="sticky top-0 z-50 bg-card/95 backdrop-blur-xl border-b border-border/50 px-4 py-3">
        <div className="max-w-lg mx-auto">
          <h1 className="font-display text-base tracking-tight text-foreground">Meu Perfil</h1>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-5 space-y-4">
        {/* Profile card */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl bg-card shadow-card p-5 flex items-center gap-4"
        >
          <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center text-primary-foreground font-display text-xl">
            {initials}
          </div>
          <div className="flex-1">
            <h2 className="font-display text-lg text-foreground">
              {profile?.full_name || "Usuário"}
            </h2>
            <p className="text-xs text-muted-foreground">{user.email}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {profile?.city && `${profile.city}, ${profile.state} · `}
              {isProfessional ? "Profissional" : "Cliente"}
            </p>
          </div>
        </motion.div>

        {/* Menu */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-2"
        >
          {menuItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="flex items-center gap-3 rounded-2xl bg-card shadow-card p-4 hover:shadow-card-hover transition-shadow"
            >
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <item.icon size={18} className="text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">{item.label}</p>
                <p className="text-[11px] text-muted-foreground">{item.desc}</p>
              </div>
              <ChevronRight size={16} className="text-muted-foreground" />
            </Link>
          ))}
        </motion.div>

        {/* Sign out */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 rounded-2xl bg-card shadow-card p-4 hover:shadow-card-hover transition-shadow"
          >
            <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
              <LogOut size={18} className="text-destructive" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-medium text-foreground">Sair da Conta</p>
              <p className="text-[11px] text-muted-foreground">Encerrar sessão</p>
            </div>
          </button>
        </motion.div>
      </div>

      <BottomNav />
    </div>
  );
};

export default ProfilePage;
