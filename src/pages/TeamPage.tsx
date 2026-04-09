import { useState } from "react";
import { ArrowLeft, Plus, Users, X, Trash2, Phone, Mail } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePlanGate } from "@/hooks/usePlanGate";
import BottomNav from "@/components/BottomNav";
import { SEO } from "@/components/SEO";
import { toast } from "sonner";

interface TeamMember {
  id: string;
  name: string;
  role: string | null;
  phone: string | null;
  email: string | null;
  active: boolean;
}

const TeamPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const planGate = usePlanGate();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  const { data: profile } = useQuery({
    queryKey: ["myProfile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("professional_profiles")
        .select("id")
        .eq("user_id", user!.id)
        .single();
      return data;
    },
  });

  const { data: members = [], isLoading } = useQuery({
    queryKey: ["teamMembers", profile?.id],
    enabled: !!profile?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("team_members")
        .select("*")
        .eq("professional_id", profile!.id)
        .eq("active", true)
        .order("name");
      return (data || []) as TeamMember[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!profile?.id) throw new Error("Perfil não encontrado");
      const { error } = await supabase.from("team_members").insert({
        professional_id: profile.id,
        name,
        role: role || null,
        phone: phone || null,
        email: email || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teamMembers"] });
      setShowForm(false);
      setName("");
      setRole("");
      setPhone("");
      setEmail("");
      toast.success("Membro adicionado!");
    },
    onError: () => toast.error("Erro ao adicionar membro"),
  });

  const removeMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("team_members")
        .update({ active: false })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teamMembers"] });
      toast.success("Membro removido!");
    },
  });

  if (!planGate.isElite) {
    return (
      <div className="min-h-screen pb-20 bg-background flex items-center justify-center p-6">
        <SEO title="Equipe | Fixr" />
        <div className="text-center space-y-4">
          <Users size={48} className="mx-auto text-muted-foreground" />
          <h2 className="font-display font-black text-sm uppercase tracking-[0.2em]">GESTÃO DE EQUIPE</h2>
          <p className="text-xs text-muted-foreground max-w-xs mx-auto">
            Gerencie sua equipe de trabalho. Exclusivo do plano Elite.
          </p>
          <button
            onClick={() => navigate("/planos")}
            className="px-6 py-3 rounded-2xl bg-primary text-primary-foreground font-black text-xs uppercase tracking-widest"
          >
            UPGRADE PARA ELITE
          </button>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20 bg-background">
      <SEO title="Equipe | Fixr" />

      <header className="sticky top-0 z-50 bg-background border-b border-border px-4 py-4">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center rounded-2xl bg-primary text-primary-foreground">
              <ArrowLeft size={20} />
            </button>
            <h1 className="font-display font-black text-xs uppercase tracking-[0.2em]">EQUIPE</h1>
          </div>
          <button onClick={() => setShowForm(true)} className="w-10 h-10 flex items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <Plus size={20} />
          </button>
        </div>
      </header>

      <div className="max-w-lg mx-auto p-4 space-y-3">
        {isLoading && (
          <p className="text-center text-[10px] font-black uppercase tracking-widest text-muted-foreground animate-pulse py-10">
            CARREGANDO...
          </p>
        )}

        {!isLoading && members.length === 0 && (
          <div className="text-center py-10 space-y-2">
            <Users size={32} className="mx-auto text-muted-foreground" />
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              NENHUM MEMBRO
            </p>
          </div>
        )}

        {members.map((m) => (
          <div key={m.id} className="p-4 rounded-2xl border-2 border-border bg-background">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-black text-sm text-foreground">{m.name}</h3>
                {m.role && (
                  <p className="text-[10px] font-black uppercase tracking-widest text-primary mt-1">
                    {m.role}
                  </p>
                )}
              </div>
              <button
                onClick={() => removeMutation.mutate(m.id)}
                className="text-destructive hover:bg-destructive/10 w-8 h-8 rounded-full flex items-center justify-center"
              >
                <Trash2 size={14} />
              </button>
            </div>
            <div className="flex gap-4 mt-2">
              {m.phone && (
                <a href={`tel:${m.phone}`} className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-primary">
                  <Phone size={10} /> {m.phone}
                </a>
              )}
              {m.email && (
                <a href={`mailto:${m.email}`} className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-primary">
                  <Mail size={10} /> {m.email}
                </a>
              )}
            </div>
          </div>
        ))}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-[100] bg-black/80 flex items-end justify-center p-4">
          <div className="bg-background w-full max-w-lg rounded-t-3xl border-2 border-border p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-black text-xs uppercase tracking-[0.2em]">NOVO MEMBRO</h2>
              <button onClick={() => setShowForm(false)}>
                <X size={20} className="text-muted-foreground" />
              </button>
            </div>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nome"
              className="w-full bg-secondary/10 border-2 border-border rounded-2xl px-4 py-3 text-sm"
            />
            <input
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="Função (ex: Ajudante, Eletricista)"
              className="w-full bg-secondary/10 border-2 border-border rounded-2xl px-4 py-3 text-sm"
            />
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Telefone (opcional)"
              className="w-full bg-secondary/10 border-2 border-border rounded-2xl px-4 py-3 text-sm"
            />
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="E-mail (opcional)"
              className="w-full bg-secondary/10 border-2 border-border rounded-2xl px-4 py-3 text-sm"
            />
            <button
              onClick={() => createMutation.mutate()}
              disabled={!name || createMutation.isPending}
              className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-black text-xs uppercase tracking-widest disabled:opacity-30"
            >
              {createMutation.isPending ? "SALVANDO..." : "ADICIONAR MEMBRO"}
            </button>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
};

export default TeamPage;
