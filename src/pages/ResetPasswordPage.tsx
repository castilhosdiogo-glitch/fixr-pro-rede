import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Lock, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SEO } from "@/components/SEO";
import { Logo } from "@/components/Logo";
import { toast } from "sonner";

// Destino do link de recuperação enviado por resetPasswordForEmail.
// O supabase-js processa o token do hash da URL automaticamente
// (detectSessionInUrl) e cria uma sessão de recovery — daí o updateUser.
const ResetPasswordPage = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [sessionState, setSessionState] = useState<"checking" | "ready" | "missing">("checking");

  useEffect(() => {
    // Token do hash pode levar um instante pra virar sessão — escuta o evento
    // e também checa direto (caso já tenha processado antes do mount).
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
        setSessionState("ready");
      }
    });

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setSessionState("ready");
      } else {
        // Dá 3s pro detectSessionInUrl terminar antes de declarar link inválido
        setTimeout(() => {
          setSessionState((prev) => (prev === "checking" ? "missing" : prev));
        }, 3000);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast.error("A senha deve ter no mínimo 8 caracteres.");
      return;
    }
    if (password !== confirm) {
      toast.error("As senhas não coincidem.");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        toast.error("Não foi possível redefinir a senha. Solicite um novo link.");
        console.error(error);
        return;
      }
      setDone(true);
      toast.success("Senha redefinida!");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-10">
      <SEO title="Redefinir Senha | Fixr" />
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-3">
          <Logo className="w-16 h-16 mx-auto" />
          <h1 className="font-display font-black text-xl uppercase tracking-[0.15em] text-foreground">
            Redefinir Senha
          </h1>
        </div>

        {sessionState === "checking" && (
          <div className="rounded-2xl border border-border bg-card p-8 flex items-center justify-center gap-3">
            <Loader2 size={16} className="animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Validando link de recuperação...</p>
          </div>
        )}

        {sessionState === "missing" && (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 space-y-4">
            <div className="flex items-start gap-3">
              <AlertTriangle size={18} className="text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-foreground">Link inválido ou expirado</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Solicite um novo e-mail de recuperação na tela de login.
                </p>
              </div>
            </div>
            <button
              onClick={() => navigate("/auth")}
              className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-black text-xs uppercase tracking-widest hover:bg-primary/90 transition"
            >
              Ir para o login
            </button>
          </div>
        )}

        {sessionState === "ready" && !done && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block">
                Nova senha
              </label>
              <div className="flex items-center gap-4 bg-secondary/20 border border-border rounded-2xl px-4 py-4 focus-within:border-primary transition-all">
                <Lock size={18} className="text-primary" />
                <input
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-transparent text-base text-foreground placeholder:text-muted-foreground/30 outline-none"
                />
              </div>
              <p className="text-[10px] text-muted-foreground">Mínimo 8 caracteres.</p>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block">
                Confirmar nova senha
              </label>
              <div className="flex items-center gap-4 bg-secondary/20 border border-border rounded-2xl px-4 py-4 focus-within:border-primary transition-all">
                <Lock size={18} className="text-primary" />
                <input
                  type="password"
                  required
                  minLength={8}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-transparent text-base text-foreground placeholder:text-muted-foreground/30 outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-display font-black text-xs uppercase tracking-[0.3em] hover:bg-primary/90 active:scale-[0.98] transition disabled:opacity-50"
            >
              {saving ? "Salvando..." : "Redefinir senha"}
            </button>
          </form>
        )}

        {done && (
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-6 space-y-4 text-center">
            <CheckCircle2 size={32} className="text-emerald-500 mx-auto" />
            <p className="text-sm font-bold text-foreground">Senha redefinida com sucesso!</p>
            <button
              onClick={() => navigate("/perfil")}
              className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-black text-xs uppercase tracking-widest hover:bg-primary/90 transition"
            >
              Continuar
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResetPasswordPage;
