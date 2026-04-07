<<<<<<< HEAD
﻿import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
=======
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
>>>>>>> f38df2aedbfdd1c2343837c06db5bb59b8dcdb8a
import { LogOut, LayoutDashboard, ChevronRight, Settings, User } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import BottomNav from "@/components/BottomNav";
<<<<<<< HEAD
import { SEO } from "@/components/SEO";
=======
>>>>>>> f38df2aedbfdd1c2343837c06db5bb59b8dcdb8a
import { motion } from "framer-motion";

const ProfilePage = () => {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
<<<<<<< HEAD
  const { data, isLoading } = useQuery({
    queryKey: ["userProfile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, full_name, user_type, phone, city, state, avatar_url")
        .eq("user_id", user!.id)
        .single();
        
      let professionalProfile = null;
      if (profile?.user_type === "professional") {
        const { data: pp } = await supabase
          .from("professional_profiles")
          .select("id, category_name, description, experience, verified")
          .eq("user_id", user!.id)
          .single();
        professionalProfile = pp;
      }
      
      return { profile, professionalProfile };
    },
  });

  const profile = data?.profile;
  const professionalProfile = data?.professionalProfile;
=======
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
>>>>>>> f38df2aedbfdd1c2343837c06db5bb59b8dcdb8a

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

<<<<<<< HEAD
  if (loading || (isLoading && user)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary animate-pulse">
          CARREGANDO PERFIL...
        </p>
=======
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Carregando...</p>
>>>>>>> f38df2aedbfdd1c2343837c06db5bb59b8dcdb8a
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen pb-20 bg-background">
<<<<<<< HEAD
        <SEO title="Perfil | Fixr" />
      <header className="sticky top-0 z-50 bg-background border-b border-border px-4 py-4">
        <div className="max-w-lg mx-auto">
          <h1 className="font-display font-black text-xs uppercase tracking-[0.2em] text-foreground">PERFIL DO OPERADOR</h1>
        </div>
      </header>
        <div className="flex flex-col items-center justify-center py-20 px-4 text-center max-w-lg mx-auto">
          <div className="w-24 h-24 rounded-2xl bg-secondary/20 border border-border flex items-center justify-center mb-8">
            <User size={40} className="text-primary" />
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-10">
            ACESSO RESTRITO. REQUER AUTENTICAÇÃO.
          </p>
          <div className="flex flex-col gap-4 w-full">
            <Link
              to="/auth"
              className="w-full py-6 bg-primary text-primary-foreground font-display font-black text-xs uppercase tracking-[0.3em] rounded-2xl text-center hover:bg-primary/90 transition-all"
            >
              ENTRAR NO SISTEMA
            </Link>
            <Link
              to="/auth"
              state={{ mode: "register-client" }}
              className="w-full py-6 border-2 border-white text-foreground font-display font-black text-xs uppercase tracking-[0.3em] rounded-2xl text-center hover:bg-white hover:text-background transition-all"
            >
              CRIAR CREDENCIAIS
=======
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
>>>>>>> f38df2aedbfdd1c2343837c06db5bb59b8dcdb8a
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
<<<<<<< HEAD
      <SEO title="Meu Perfil | Fixr" />
      <header className="sticky top-0 z-50 bg-background border-b border-border px-4 py-4">
        <div className="max-w-lg mx-auto">
          <h1 className="font-display font-black text-xs uppercase tracking-[0.2em] text-foreground">PERFIL DO OPERADOR</h1>
=======
      <header className="sticky top-0 z-50 bg-card/95 backdrop-blur-xl border-b border-border/50 px-4 py-3">
        <div className="max-w-lg mx-auto">
          <h1 className="font-display text-base tracking-tight text-foreground">Meu Perfil</h1>
>>>>>>> f38df2aedbfdd1c2343837c06db5bb59b8dcdb8a
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-5 space-y-4">
        {/* Profile card */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
<<<<<<< HEAD
          className="rounded-2xl bg-card border border-border p-6 flex items-center gap-5"
        >
          <div className="w-20 h-20 rounded-2xl bg-primary flex items-center justify-center text-primary-foreground font-display font-black text-3xl">
            {initials}
          </div>
          <div className="flex-1">
            <h2 className="font-display font-black text-xl text-foreground uppercase tracking-tight">
              {profile?.full_name || "OPERADOR"}
            </h2>
            <p className="text-[10px] font-black uppercase tracking-widest text-primary mt-1">{user.email}</p>
            <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mt-2">
              {profile?.city && `${profile.city.toUpperCase()}, ${profile.state} · `}
              {isProfessional ? "PROFISSIONAL" : "CLIENTE"}
=======
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
>>>>>>> f38df2aedbfdd1c2343837c06db5bb59b8dcdb8a
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
<<<<<<< HEAD
              className="flex items-center gap-5 rounded-2xl bg-card border border-border p-5 hover:bg-secondary/10 transition-colors group"
            >
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20">
                <item.icon size={20} className="text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-black uppercase tracking-[.15em] text-foreground">{item.label}</p>
                <p className="text-[9px] font-medium text-muted-foreground uppercase opacity-70 mt-1">{item.desc}</p>
              </div>
              <ChevronRight size={20} className="text-muted-foreground group-hover:translate-x-1 transition-transform" />
=======
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
>>>>>>> f38df2aedbfdd1c2343837c06db5bb59b8dcdb8a
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
<<<<<<< HEAD
            className="w-full flex items-center gap-5 rounded-2xl bg-card border border-border p-5 hover:bg-destructive/5 transition-colors group"
          >
            <div className="w-12 h-12 rounded-2xl bg-destructive/10 flex items-center justify-center border border-destructive/20 opacity-80">
              <LogOut size={20} className="text-destructive" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-xs font-black uppercase tracking-[.15em] text-foreground">FINALIZAR OPERAÇÃO</p>
              <p className="text-[9px] font-medium text-muted-foreground uppercase opacity-70 mt-1">ENCERRAR SESSÃO NO TERMINAL</p>
=======
            className="w-full flex items-center gap-3 rounded-2xl bg-card shadow-card p-4 hover:shadow-card-hover transition-shadow"
          >
            <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
              <LogOut size={18} className="text-destructive" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-medium text-foreground">Sair da Conta</p>
              <p className="text-[11px] text-muted-foreground">Encerrar sessão</p>
>>>>>>> f38df2aedbfdd1c2343837c06db5bb59b8dcdb8a
            </div>
          </button>
        </motion.div>
      </div>

      <BottomNav />
    </div>
  );
};

export default ProfilePage;
<<<<<<< HEAD

=======
>>>>>>> f38df2aedbfdd1c2343837c06db5bb59b8dcdb8a
