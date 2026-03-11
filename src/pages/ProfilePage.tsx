import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LogOut, LayoutDashboard } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import BottomNav from "@/components/BottomNav";

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
      <div className="min-h-screen pb-20">
        <header className="bg-card border-b-2 border-border p-4">
          <h1 className="font-display text-lg uppercase tracking-tight text-foreground">
            Meu Perfil
          </h1>
        </header>
        <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
          <div className="flex items-center justify-center w-20 h-20 bg-secondary text-foreground font-display text-2xl uppercase mb-4">
            ?
          </div>
          <p className="text-muted-foreground text-sm mb-4">
            Faça login para acessar seu perfil.
          </p>
          <Link
            to="/auth"
            className="px-6 py-3 bg-primary text-primary-foreground font-display uppercase text-sm tracking-wider"
          >
            Entrar
          </Link>
          <Link
            to="/auth"
            className="mt-2 px-6 py-3 border-2 border-border text-foreground font-display uppercase text-sm tracking-wider hover:border-primary transition-colors"
          >
            Criar Conta
          </Link>
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

  return (
    <div className="min-h-screen pb-20">
      <header className="bg-card border-b-2 border-border p-4">
        <h1 className="font-display text-lg uppercase tracking-tight text-foreground">
          Meu Perfil
        </h1>
      </header>

      <div className="p-4">
        <div className="bg-card border-2 border-border p-4 flex gap-4 items-center">
          <div className="flex items-center justify-center w-16 h-16 bg-secondary text-foreground font-display text-xl uppercase">
            {initials}
          </div>
          <div className="flex-1">
            <h2 className="font-display text-base uppercase text-foreground">
              {profile?.full_name || "Usuário"}
            </h2>
            <p className="text-xs text-muted-foreground">{user.email}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {profile?.city}, {profile?.state} · {isProfessional ? "Profixssional" : "Cliente"}
            </p>
          </div>
        </div>

        {isProfessional && (
          <Link
            to="/dashboard"
            className="mt-3 flex items-center gap-3 bg-card border-2 border-border p-4 hover:border-primary transition-colors"
          >
            <LayoutDashboard size={20} className="text-primary" />
            <span className="font-display text-sm uppercase text-foreground">
              Painel do Profixssional
            </span>
          </Link>
        )}

        <button
          onClick={handleSignOut}
          className="mt-3 flex items-center gap-3 w-full bg-card border-2 border-border p-4 hover:border-destructive transition-colors"
        >
          <LogOut size={20} className="text-destructive" />
          <span className="font-display text-sm uppercase text-foreground">Sair da Conta</span>
        </button>
      </div>

      <BottomNav />
    </div>
  );
};

export default ProfilePage;
