import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Save } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useCategories } from "@/hooks/useCategories";
import { supabase } from "@/integrations/supabase/client";
import BottomNav from "@/components/BottomNav";
import { SEO } from "@/components/SEO";

const EditProfilePage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: categories = [] } = useCategories();

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [userType, setUserType] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState("");
  const [description, setDescription] = useState("");
  const [experience, setExperience] = useState("");
  const [saving, setSaving] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["editProfile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, phone, city, state, user_type")
        .eq("user_id", user!.id)
        .single();

      let pro = null;
      if (profile?.user_type === "professional") {
        const { data: pp } = await supabase
          .from("professional_profiles")
          .select("category_id, description, experience")
          .eq("user_id", user!.id)
          .single();
        pro = pp;
      }

      return { profile, pro };
    },
  });

  useEffect(() => {
    if (!data?.profile) return;
    setFullName(data.profile.full_name || "");
    setPhone(data.profile.phone || "");
    setCity(data.profile.city || "");
    setState(data.profile.state || "");
    setUserType(data.profile.user_type || null);
    if (data.pro) {
      setCategoryId(data.pro.category_id || "");
      setDescription(data.pro.description || "");
      setExperience(data.pro.experience || "");
    }
  }, [data]);

  const isProfessional = userType === "professional";

  const save = async () => {
    if (!user) return;
    if (fullName.trim().length < 2) {
      toast.error("Nome muito curto.");
      return;
    }
    if (isProfessional && !categoryId) {
      toast.error("Selecione sua categoria.");
      return;
    }

    setSaving(true);
    try {
      const { error: pErr } = await supabase
        .from("profiles")
        .update({
          full_name: fullName.trim(),
          phone: phone.trim() || null,
          city: city.trim() || null,
          state: state.trim().toUpperCase().slice(0, 2) || null,
        })
        .eq("user_id", user.id);
      if (pErr) throw pErr;

      if (isProfessional) {
        const primaryCat = categories.find((c) => c.id === categoryId);
        const { error: ppErr } = await supabase
          .from("professional_profiles")
          .update({
            category_id: categoryId,
            category_name: primaryCat?.name ?? categoryId,
            description: description.trim() || null,
            experience: experience.trim() || null,
          })
          .eq("user_id", user.id);
        if (ppErr) throw ppErr;
      }

      await queryClient.invalidateQueries({ queryKey: ["userProfile"] });
      await queryClient.invalidateQueries({ queryKey: ["editProfile"] });
      toast.success("Perfil atualizado.");
      navigate("/perfil");
    } catch (e) {
      console.error(e);
      toast.error("Falha ao salvar.");
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary animate-pulse">
          CARREGANDO...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24 bg-background">
      <SEO title="Editar Perfil | Fixr" />

      <header className="sticky top-0 z-50 bg-background border-b border-border px-4 py-4">
        <div className="flex items-center gap-4 max-w-lg mx-auto">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 flex items-center justify-center rounded-2xl bg-primary text-primary-foreground"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="font-display font-black text-xs uppercase tracking-[0.2em]">
            EDITAR PERFIL
          </h1>
        </div>
      </header>

      <div className="max-w-lg mx-auto p-4 space-y-4">
        <Section title="DADOS PESSOAIS">
          <Field label="Nome completo">
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className={inputCls}
              placeholder="Seu nome"
            />
          </Field>
          <Field label="Telefone">
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className={inputCls}
              placeholder="(11) 99999-9999"
              inputMode="tel"
            />
          </Field>
          <div className="grid grid-cols-[1fr_80px] gap-3">
            <Field label="Cidade">
              <input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className={inputCls}
                placeholder="São Paulo"
              />
            </Field>
            <Field label="UF">
              <input
                value={state}
                onChange={(e) =>
                  setState(e.target.value.toUpperCase().slice(0, 2))
                }
                className={inputCls}
                placeholder="SP"
                maxLength={2}
              />
            </Field>
          </div>
        </Section>

        {isProfessional && (
          <Section title="DADOS PROFISSIONAIS">
            <Field label="Categoria principal">
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className={inputCls}
              >
                <option value="">Selecione...</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Descrição / bio">
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className={inputCls}
                placeholder="Conte sua experiência e especialidade."
              />
            </Field>
            <Field label="Experiência">
              <input
                value={experience}
                onChange={(e) => setExperience(e.target.value)}
                className={inputCls}
                placeholder="Ex: 8 anos"
              />
            </Field>
          </Section>
        )}

        <button
          onClick={save}
          disabled={saving}
          className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-display font-black text-xs uppercase tracking-[0.3em] hover:bg-primary/90 active:scale-[0.98] transition flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <Save size={16} /> {saving ? "SALVANDO..." : "SALVAR ALTERAÇÕES"}
        </button>
      </div>

      <BottomNav />
    </div>
  );
};

const inputCls =
  "w-full bg-background border border-border rounded-xl px-4 py-3 text-sm";

const Section = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <div className="p-5 rounded-2xl border-2 border-border bg-background space-y-3">
    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
      {title}
    </p>
    {children}
  </div>
);

const Field = ({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) => (
  <div>
    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block mb-1.5">
      {label}
    </label>
    {children}
  </div>
);

export default EditProfilePage;
