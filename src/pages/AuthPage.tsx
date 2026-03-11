import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Mail, Lock, User, Phone, Briefcase } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type AuthMode = "login" | "register-client" | "register-professional";

const CITIES = [
  "Porto Alegre",
  "Gravataí",
  "Canoas",
  "Cachoeirinha",
  "Viamão",
  "Alvorada",
];

const CATEGORIES = [
  { id: "montador", name: "Montador de Móveis" },
  { id: "eletricista", name: "Eletricista" },
  { id: "encanador", name: "Encanador" },
  { id: "diarista", name: "Diarista" },
  { id: "chaveiro", name: "Chaveiro" },
  { id: "ar-condicionado", name: "Técnico de Ar Condicionado" },
];

const AuthPage = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<AuthMode>("login");
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    email: "",
    password: "",
    fullName: "",
    phone: "",
    city: CITIES[0],
    categoryId: CATEGORIES[0].id,
    description: "",
    experience: "",
  });

  const update = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleLogin = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: form.email,
      password: form.password,
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Login realizado!");
      navigate("/");
    }
  };

  const handleRegister = async () => {
    if (!form.fullName.trim()) {
      toast.error("Informe seu nome completo.");
      return;
    }
    setLoading(true);
    const isProfessional = mode === "register-professional";

    const { data, error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        emailRedirectTo: window.location.origin,
        data: {
          full_name: form.fullName,
        },
      },
    });

    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    const userId = data.user?.id;
    if (userId) {
      // Update profile with city and type
      await supabase
        .from("profiles")
        .update({
          user_type: isProfessional ? "professional" : "client",
          phone: form.phone,
          city: form.city,
          state: "RS",
          full_name: form.fullName,
        })
        .eq("user_id", userId);

      if (isProfessional) {
        const cat = CATEGORIES.find((c) => c.id === form.categoryId);
        await supabase.from("professional_profiles").insert({
          user_id: userId,
          category_id: form.categoryId,
          category_name: cat?.name || "",
          description: form.description,
          experience: form.experience,
        });
      }
    }

    setLoading(false);
    toast.success("Conta criada! Verifique seu email para confirmar.");
    navigate("/");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "login") handleLogin();
    else handleRegister();
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b-2 border-border p-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-foreground">
            <ArrowLeft size={24} />
          </button>
          <h1 className="font-display text-lg uppercase tracking-tight text-foreground">
            {mode === "login"
              ? "Entrar"
              : mode === "register-client"
              ? "Cadastro Cliente"
              : "Cadastro Profixssional"}
          </h1>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="p-4 space-y-4 max-w-md mx-auto">
        {/* Mode selector */}
        {mode === "login" && (
          <div className="text-center space-y-2 py-4">
            <h2 className="font-display text-2xl text-primary">PROFIX</h2>
            <p className="text-sm text-muted-foreground">A rede dos Profixssionais</p>
          </div>
        )}

        {/* Email */}
        <div className="space-y-1">
          <label className="text-xs font-display uppercase text-muted-foreground">Email</label>
          <div className="flex items-center gap-3 bg-card border-2 border-border px-4 py-3">
            <Mail size={16} className="text-muted-foreground" />
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
              placeholder="seu@email.com"
              className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
            />
          </div>
        </div>

        {/* Password */}
        <div className="space-y-1">
          <label className="text-xs font-display uppercase text-muted-foreground">Senha</label>
          <div className="flex items-center gap-3 bg-card border-2 border-border px-4 py-3">
            <Lock size={16} className="text-muted-foreground" />
            <input
              type="password"
              required
              minLength={6}
              value={form.password}
              onChange={(e) => update("password", e.target.value)}
              placeholder="Mínimo 6 caracteres"
              className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
            />
          </div>
        </div>

        {/* Registration fields */}
        {mode !== "login" && (
          <>
            <div className="space-y-1">
              <label className="text-xs font-display uppercase text-muted-foreground">Nome completo</label>
              <div className="flex items-center gap-3 bg-card border-2 border-border px-4 py-3">
                <User size={16} className="text-muted-foreground" />
                <input
                  type="text"
                  required
                  value={form.fullName}
                  onChange={(e) => update("fullName", e.target.value)}
                  placeholder="Seu nome"
                  className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-display uppercase text-muted-foreground">Telefone</label>
              <div className="flex items-center gap-3 bg-card border-2 border-border px-4 py-3">
                <Phone size={16} className="text-muted-foreground" />
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => update("phone", e.target.value)}
                  placeholder="(51) 99999-0000"
                  className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-display uppercase text-muted-foreground">Cidade</label>
              <select
                value={form.city}
                onChange={(e) => update("city", e.target.value)}
                className="w-full bg-card border-2 border-border px-4 py-3 text-sm text-foreground outline-none"
              >
                {CITIES.map((city) => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>
            </div>
          </>
        )}

        {/* Professional-only fields */}
        {mode === "register-professional" && (
          <>
            <div className="space-y-1">
              <label className="text-xs font-display uppercase text-muted-foreground">Categoria do serviço</label>
              <select
                value={form.categoryId}
                onChange={(e) => update("categoryId", e.target.value)}
                className="w-full bg-card border-2 border-border px-4 py-3 text-sm text-foreground outline-none"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-display uppercase text-muted-foreground">Descrição do serviço</label>
              <textarea
                value={form.description}
                onChange={(e) => update("description", e.target.value)}
                placeholder="Descreva seus serviços..."
                rows={3}
                className="w-full bg-card border-2 border-border px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none resize-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-display uppercase text-muted-foreground">Experiência</label>
              <div className="flex items-center gap-3 bg-card border-2 border-border px-4 py-3">
                <Briefcase size={16} className="text-muted-foreground" />
                <input
                  type="text"
                  value={form.experience}
                  onChange={(e) => update("experience", e.target.value)}
                  placeholder="Ex: 5 anos"
                  className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
                />
              </div>
            </div>
          </>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-4 bg-primary text-primary-foreground font-display uppercase tracking-wider text-base disabled:opacity-50"
        >
          {loading ? "Aguarde..." : mode === "login" ? "Entrar" : "Criar Conta"}
        </button>

        {/* Mode switching */}
        {mode === "login" ? (
          <div className="space-y-2 text-center">
            <p className="text-sm text-muted-foreground">Não tem conta?</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setMode("register-client")}
                className="flex-1 py-3 border-2 border-border text-foreground font-display uppercase text-xs tracking-wider hover:border-primary transition-colors"
              >
                Sou Cliente
              </button>
              <button
                type="button"
                onClick={() => setMode("register-professional")}
                className="flex-1 py-3 border-2 border-primary bg-primary/10 text-primary font-display uppercase text-xs tracking-wider"
              >
                Sou Profixssional
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setMode("login")}
            className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Já tem conta? <span className="text-primary font-medium">Entrar</span>
          </button>
        )}
      </form>
    </div>
  );
};

export default AuthPage;
