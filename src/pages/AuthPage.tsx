import { useState, useEffect } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { ArrowLeft, Mail, Lock, User, Phone, Briefcase, AlertTriangle, Gift } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SEO } from "@/components/SEO";
import { Logo } from "@/components/Logo";
import { toast } from "sonner";
import { useCategories } from "@/hooks/useCategories";
import { AVAILABLE_CITIES } from "@/data/mock";
import { useSlotOccupancy, SLOT_STATUS_CONFIG } from "@/hooks/useSupplyControl";
import { WaitingListForm } from "@/components/supply/WaitingListForm";

type AuthMode = "login" | "register-client" | "register-professional";

const AuthPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { data: categories = [] } = useCategories();
  const [mode, setMode] = useState<AuthMode>((location.state as { mode?: AuthMode } | null)?.mode || "login");
  const [waitingListDone, setWaitingListDone] = useState(false);

  // ── Referral code: read from ?ref= URL param + persist to sessionStorage ──
  const refFromUrl = searchParams.get("ref");
  useEffect(() => {
    if (refFromUrl) {
      sessionStorage.setItem("Fixr_ref_code", refFromUrl.toUpperCase());
      // Pre-select professional registration mode when arriving via referral link
      if (mode === "login") setMode("register-professional");
    }
  }, [refFromUrl]);
  const pendingRefCode = sessionStorage.getItem("Fixr_ref_code");
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    email: "",
    password: "",
    fullName: "",
    phone: "",
    city: AVAILABLE_CITIES[0],
    categoryId: "",
    description: "",
    experience: "",
  });
  const [privacyAccepted, setPrivacyAccepted] = useState(false);

  // Preenche categoryId com o primeiro item assim que as categorias carregam
  useEffect(() => {
    if (categories.length > 0 && !form.categoryId) {
      setForm((prev) => ({ ...prev, categoryId: categories[0].id }));
    }
  }, [categories]);

  // Reset waiting list state when city or category changes
  useEffect(() => {
    setWaitingListDone(false);
  }, [form.categoryId, form.city]);

  // Slot occupancy — only active for professional registration
  const isProfMode = mode === "register-professional";
  const { data: slotData = [], isLoading: checkingSlot } = useSlotOccupancy(
    isProfMode && form.categoryId ? form.categoryId : undefined,
    isProfMode && form.city ? form.city : undefined
  );
  const currentSlot = slotData[0];
  // undefined = no limit configured → allow; false = FULL → block
  const slotAvailable = currentSlot ? currentSlot.available_slots > 0 : undefined;
  const slotStatus = currentSlot?.status;

  const currentCategory = categories.find((c) => c.id === form.categoryId);

  const update = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleLogin = async () => {
    if (!form.email.trim()) {
      toast.error("Informe seu e-mail.");
      return;
    }
    if (!form.password.trim()) {
      toast.error("Informe sua senha.");
      return;
    }

    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: form.email,
      password: form.password,
    });
    setLoading(false);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Login realizado!");
      // Use metadata to determine redirection if possible, or fetch from profile
      if (data?.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("user_type")
          .eq("user_id", data.user.id)
          .single();

        const destination = profile?.user_type === "professional" ? "/dashboard" : "/meu-painel";
        navigate(destination);
      } else {
        // Fallback if user data is not immediately available (shouldn't happen with signInWithPassword)
        navigate("/perfil");
      }
    }
  };

  const handleGoogleLogin = async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/`,
      }
    });
    if (error) {
      toast.error(error.message);
    }
  };

  const handleRegister = async () => {
    if (!form.fullName.trim()) {
      toast.error("Informe seu nome completo.");
      return;
    }
    if (!form.email.trim() || !form.password.trim()) {
      toast.error("Preencha e-mail e senha.");
      return;
    }

    if (mode !== "login" && !privacyAccepted) {
      toast.error("Você deve aceitar a Política de Privacidade para continuar.");
      return;
    }

    // Block registration if professional slot is FULL
    if (mode === "register-professional" && slotAvailable === false) {
      toast.error("Vagas esgotadas para esta categoria e cidade. Você pode entrar na fila de espera abaixo.");
      return;
    }

    setLoading(true);
    const isProfessional = mode === "register-professional";
    const cat = isProfessional ? categories.find((c) => c.id === form.categoryId) : null;

    // All data goes via metadata — the DB trigger handles profile creation
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        emailRedirectTo: window.location.origin,
        data: {
          full_name: form.fullName,
          user_type: isProfessional ? "professional" : "client",
          phone: form.phone || null,
          city: form.city,
          state: "RS",
          ...(isProfessional && {
            category_id: form.categoryId,
            category_name: cat?.name || form.categoryId,
            description: form.description || null,
            experience: form.experience || null,
          }),
        },
      },
    });

    if (authError) {
      toast.error(authError.message);
      setLoading(false);
      return;
    }

    // ── Save LGPD consent ──────────────────────────────────────
    if (authData.user?.id) {
      await supabase
        .from("user_consents")
        .upsert({
          user_id: authData.user.id,
          privacy_accepted: privacyAccepted,
        }, { onConflict: "user_id" })
        .catch((err) => console.warn("Could not save consent:", err));
    }

    // ── Apply referral code if one was captured ──────────────
    const refCode = pendingRefCode;
    if (refCode && authData.user) {
      try {
        // Device fingerprint — supplementary signal only (server-side IP is primary)
        const fp = btoa(
          [navigator.userAgent, screen.colorDepth, navigator.hardwareConcurrency, navigator.language]
            .join("|")
        ).slice(0, 64);

        const result = await supabase.rpc("apply_referral_safe", {
          p_referred_id:      authData.user.id,
          p_code:             refCode,
          p_referred_ip_hash: null,  // IP captured server-side via record_user_ip()
          p_fingerprint:      fp,
        });

        sessionStorage.removeItem("Fixr_ref_code");

        if (result.data === "ok") {
          toast.success("Código de indicação aplicado!", { duration: 3000 });
        } else if (result.data === "fraud_detected") {
          // Silent — don't alert potential fraudster
        } else if (result.data === "rate_limited") {
          toast.error("Muitas tentativas. Tente novamente mais tarde.");
        }
      } catch {
        sessionStorage.removeItem("Fixr_ref_code");
      }
    }

    setLoading(false);

    if (!authData.session) {
      toast.success("Cadastro realizado! Verifique seu e-mail para confirmar sua conta.", {
        duration: 10000,
      });
    } else {
      toast.success("Conta criada com sucesso!");
      const destination = isProfessional ? "/dashboard" : "/meu-painel";
      navigate(destination);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "login") handleLogin();
    else handleRegister();
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO title={(mode === "login" ? "Entrar" : "Criar Conta") + " | Fixr"} description="Acesse ou crie sua conta no Fixr para contratar ou oferecer serviços na sua região." />
      <header className="bg-background/80 backdrop-blur-xl border-b border-border/50 p-4 sticky top-0 z-50">
        <div className="flex items-center gap-6 max-w-md mx-auto">
          <button onClick={() => window.history.length > 1 ? navigate(-1) : navigate('/')} className="w-12 h-12 flex items-center justify-center rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all active:scale-95 shadow-none">
            <ArrowLeft size={24} />
          </button>
          <h1 className="font-display font-bold text-sm text-foreground tracking-wide">
            {mode === "login"
              ? "Entrar"
              : mode === "register-client"
              ? "Sou Cliente"
              : "Sou Profissional"}
          </h1>
        </div>
      </header>

      <div className="p-4 space-y-4 max-w-md mx-auto pt-8">
        {/* Referral code banner */}
        {pendingRefCode && mode !== "login" && (
          <div className="flex items-center gap-3 rounded-2xl border border-primary/30 bg-primary/5 px-4 py-3 animate-in fade-in duration-300">
            <Gift size={16} className="text-primary flex-shrink-0" />
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-primary">
                Indicação ativa · código {pendingRefCode}
              </p>
              <p className="text-[8px] font-medium text-muted-foreground mt-0.5">
                Complete o cadastro e ganhe benefícios exclusivos!
              </p>
            </div>
          </div>
        )}

        {/* Mode selector */}
        {mode === "login" && (
          <div className="text-center space-y-4 pb-10">
            <Logo className="w-24 h-24 mx-auto mb-6 text-primary" />
            <h2 className="font-display text-4xl font-extrabold text-foreground tracking-tight">Fixr</h2>
            <p className="text-sm font-semibold text-muted-foreground">Conectando você ao profissional certo</p>
          </div>
        )}

        {/* AUTH FORM */}
        <form onSubmit={handleSubmit} className="space-y-4">
        {/* Email */}
        <div className="space-y-1">
          <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-0 mb-2 block">Seu E-mail</label>
          <div className="flex items-center gap-4 bg-secondary/20 border border-border rounded-2xl px-4 py-4 focus-within:border-primary focus-within:ring-0 transition-all">
            <Mail size={18} className="text-primary" />
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
              placeholder="SEU@EMAIL.COM"
              className="w-full bg-transparent text-base font-medium text-foreground placeholder:text-muted-foreground/30 outline-none uppercase"
            />
          </div>
        </div>

        {/* Password */}
        <div className="space-y-1">
          <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-0 mb-2 block">Senha de Acesso</label>
          <div className="flex items-center gap-4 bg-secondary/20 border border-border rounded-2xl px-4 py-4 focus-within:border-primary focus-within:ring-0 transition-all">
            <Lock size={18} className="text-primary" />
            <input
              type="password"
              required
              minLength={6}
              value={form.password}
              onChange={(e) => update("password", e.target.value)}
              placeholder="••••••••"
              className="w-full bg-transparent text-base text-foreground placeholder:text-muted-foreground/30 outline-none"
            />
          </div>
        </div>

        {/* Registration fields */}
        {mode !== "login" && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-0 mb-2 block">Nome Completo</label>
              <div className="flex items-center gap-4 bg-secondary/20 border border-border rounded-2xl px-4 py-4 focus-within:border-primary focus-within:ring-0 transition-all">
                <User size={18} className="text-primary" />
                <input
                  type="text"
                  required
                  value={form.fullName}
                  onChange={(e) => update("fullName", e.target.value)}
                  placeholder="NOME E SOBRENOME"
                  className="w-full bg-transparent text-base font-medium text-foreground placeholder:text-muted-foreground/30 outline-none uppercase"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-0 mb-2 block">WhatsApp de Contato</label>
              <div className="flex items-center gap-4 bg-secondary/20 border border-border rounded-2xl px-4 py-4 focus-within:border-primary focus-within:ring-0 transition-all">
                <Phone size={18} className="text-primary" />
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => update("phone", e.target.value)}
                  placeholder="(51) 99999-0000"
                  className="w-full bg-transparent text-base font-medium text-foreground placeholder:text-muted-foreground/30 outline-none"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-0 mb-2 block">Sua Região</label>
              <select
                value={form.city}
                onChange={(e) => update("city", e.target.value)}
                className="w-full bg-secondary/20 border border-border rounded-2xl px-4 py-4 text-base font-medium text-foreground focus:border-primary outline-none appearance-none cursor-pointer uppercase tracking-wider"
              >
                {AVAILABLE_CITIES.map((city) => (
                  <option key={city} value={city} className="bg-background">{city.toUpperCase()}</option>
                ))}
              </select>
            </div>
        </div>
        )}

        {/* Professional-only fields */}
        {mode === "register-professional" && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-0 mb-2 block">O que você faz?</label>
              <select
                value={form.categoryId}
                onChange={(e) => update("categoryId", e.target.value)}
                className="w-full bg-secondary/20 border border-border rounded-2xl px-4 py-4 text-base font-medium text-foreground focus:border-primary outline-none appearance-none cursor-pointer uppercase tracking-wider"
              >
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id} className="bg-background">{cat.name}</option>
                ))}
              </select>
            </div>

            {/* Slot status — shown after city + category are selected */}
            {form.categoryId && form.city && !checkingSlot && slotAvailable === false && !waitingListDone && (
              <WaitingListForm
                categoryId={form.categoryId}
                categoryName={currentCategory?.name ?? form.categoryId}
                city={form.city}
                onSuccess={() => setWaitingListDone(true)}
              />
            )}

            {waitingListDone && (
              <p className="text-[10px] font-bold text-green-400 text-center py-2">
                Você foi adicionado à fila. Te avisaremos quando uma vaga abrir!
              </p>
            )}

            {/* ALMOST_FULL warning */}
            {!checkingSlot && slotStatus === "ALMOST_FULL" && (
              <div className="flex items-start gap-3 rounded-2xl border border-yellow-500/30 bg-yellow-500/5 px-4 py-3 animate-in fade-in duration-300">
                <AlertTriangle size={16} className="text-yellow-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-yellow-400">
                    Poucas vagas restantes
                  </p>
                  <p className="text-[9px] font-medium text-muted-foreground mt-0.5">
                    Apenas <span className="text-foreground font-bold">{currentSlot?.available_slots}</span> vaga{currentSlot?.available_slots !== 1 ? "s" : ""} disponível para{" "}
                    <span className="text-foreground font-bold">{currentCategory?.name}</span> em{" "}
                    <span className="text-foreground font-bold">{form.city}</span>. Finalize logo!
                  </p>
                </div>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-0 mb-2 block">Fale sobre seus serviços</label>
              <textarea
                value={form.description}
                onChange={(e) => update("description", e.target.value)}
                placeholder="CONTE O QUE VOCÊ FAZ DE MELHOR..."
                rows={3}
                className="w-full bg-secondary/20 border border-border rounded-2xl px-4 py-4 text-base font-medium text-foreground focus:border-primary placeholder:text-muted-foreground/30 outline-none resize-none uppercase"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-0 mb-2 block">Tempo de experiência</label>
              <div className="flex items-center gap-4 bg-secondary/20 border border-border rounded-2xl px-4 py-4 focus-within:border-primary focus-within:ring-0 transition-all">
                <Briefcase size={18} className="text-primary" />
                <input
                  type="text"
                  value={form.experience}
                  onChange={(e) => update("experience", e.target.value)}
                  placeholder="EX: 5 ANOS"
                  className="w-full bg-transparent text-base font-medium text-foreground placeholder:text-muted-foreground/30 outline-none uppercase"
                />
              </div>
            </div>
          </div>
        )}

        {/* LGPD Consent — only on registration */}
        {mode !== "login" && (
          <div className="flex items-start gap-3 p-3 rounded-xl border border-border/50 bg-secondary/5">
            <input
              type="checkbox"
              id="privacy-consent"
              checked={privacyAccepted}
              onChange={(e) => setPrivacyAccepted(e.target.checked)}
              className="w-5 h-5 rounded border-2 border-border mt-0.5 cursor-pointer"
            />
            <label htmlFor="privacy-consent" className="text-[9px] font-medium text-muted-foreground cursor-pointer flex-1">
              Concordo com a{" "}
              <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-primary font-black hover:underline">
                Política de Privacidade
              </a>
              {" "}e autorizo o processamento de meus dados pessoais conforme descrito (LGPD).
            </label>
          </div>
        )}

        {/* Submit — hidden when slot is FULL for professionals */}
        {!(mode === "register-professional" && slotAvailable === false) && (
          <button
            type="submit"
            disabled={loading || checkingSlot || (mode !== "login" && !privacyAccepted)}
            className="w-full mt-10 py-6 bg-primary text-primary-foreground font-display font-black text-xs uppercase tracking-[0.3em] rounded-2xl hover:bg-primary/90 transition-all active:scale-95 disabled:opacity-50"
          >
            {loading ? "Processando..." : checkingSlot && mode === "register-professional" ? "Verificando vagas..." : mode === "login" ? "Entrar" : "Criar Minha Conta"}
          </button>
        )}
        </form>

        {/* Google OAuth (Only for login technically, or it acts as a dual-purpose on Supabase) */}
        <div className="relative py-6">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border/60"></span>
          </div>
          <div className="relative flex justify-center text-[10px]">
            <span className="bg-background px-4 text-muted-foreground font-black uppercase tracking-[0.2em]">
              Ou através de
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleGoogleLogin}
          className="w-full flex items-center justify-center gap-4 py-6 bg-transparent text-foreground border border-border rounded-2xl font-display font-black text-xs uppercase tracking-widest hover:bg-white hover:text-background transition-all"
        >
          <svg className="w-6 h-6" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="currentColor"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="currentColor" opacity="0.8"/>
          </svg>
          Conta Google
        </button>

        {/* Mode switching */}
        {mode === "login" ? (
          <div className="space-y-3 pt-6 text-center border-t border-border/50">
            <h3 className="font-display font-medium text-foreground">Novo por aqui?</h3>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => setMode("register-client")}
                className="flex-1 py-4 bg-secondary/20 border-2 border-border text-foreground font-display font-black text-xs uppercase tracking-widest rounded-2xl hover:border-primary hover:text-primary active:scale-95 transition-all"
              >
                Sou Cliente
              </button>
              <button
                type="button"
                onClick={() => setMode("register-professional")}
                className="flex-1 py-4 border-2 border-primary bg-primary/10 text-primary font-display font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-primary/20 active:scale-95 transition-all"
              >
                Sou Profissional
              </button>
            </div>
          </div>
        ) : (
          <div className="pt-6 border-t border-border/50">
            <button
              type="button"
              onClick={() => setMode("login")}
              className="w-full py-3 text-center font-display font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Já tem conta? <span className="text-primary font-bold ml-1">Entrar</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuthPage;

