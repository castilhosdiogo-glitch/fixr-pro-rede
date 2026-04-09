import { useState, useMemo } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { ArrowLeft, Search, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useCategories } from "@/hooks/useCategories";
import { AVAILABLE_CITIES } from "@/data/mock";
import ProfessionalCard from "@/components/ProfessionalCard";
import BottomNav from "@/components/BottomNav";
import { useAuth } from "@/hooks/useAuth";
import { SEO } from "@/components/SEO";
import { useSlotOccupancy } from "@/hooks/useSupplyControl";
import { SlotIndicator } from "@/components/supply/SlotIndicator";

const SearchPage = () => {
  const { loading } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const categoryFilter = searchParams.get("categoria") || "";
  const cityParam = searchParams.get("cidade") || "";
  const [query, setQuery] = useState("");
  const [cityFilter, setCityFilter] = useState(cityParam);

  const handleCategoryChange = (val: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (val) newParams.set("categoria", val);
    else newParams.delete("categoria");
    setSearchParams(newParams);
  };

  const handleCityChange = (val: string) => {
    setCityFilter(val);
    const newParams = new URLSearchParams(searchParams);
    if (val) newParams.set("cidade", val);
    else newParams.delete("cidade");
    setSearchParams(newParams);
  };

  const { data: categories = [] } = useCategories();

  // Fetch Professionals from Supabase
  const { data: professionals = [], isLoading: isProsLoading } = useQuery({
    queryKey: ["professionals", categoryFilter],
    queryFn: async () => {
      let query = supabase
        .from("professional_profiles")
        .select(`
          *,
          profiles:user_id (
            full_name,
            avatar_url,
            city,
            state,
            phone
          )
        `);

      if (categoryFilter) {
        query = query.eq("category_id", categoryFilter);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Map Supabase data to the interface expected by ProfessionalCard
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (data || []).map((pro: Record<string, any>) => ({
        id: pro.id,
        name: pro.profiles?.full_name || "Profissional",
        photo: pro.profiles?.avatar_url || "",
        categoryId: pro.category_id,
        category: pro.category_name,
        city: pro.profiles?.city || "Local não definido",
        state: pro.profiles?.state || "RS",
        rating: pro.rating || 0,
        reviewCount: pro.review_count || 0,
        verified: pro.verified || false,
        premium: pro.premium || false,
        description: pro.description || "",
        experience: pro.experience || "N/A",
        phone: pro.profiles?.phone || "",
        reviews: [], // Placeholder for now
        plan_name: pro.plan_name || "explorador"
      }));
    },
  });

  // Permite acesso público à busca
  /* useEffect(() => {
    if (!loading && !user) navigate("/auth");
  }, [user, loading, navigate]); */

  const filtered = useMemo(() => {
    return professionals
      .filter((p) => {
        const matchesCity = cityFilter ? p.city.toLowerCase() === cityFilter.toLowerCase() : true;
        const matchesQuery = query
          ? p.name.toLowerCase().includes(query.toLowerCase()) ||
            p.category.toLowerCase().includes(query.toLowerCase()) ||
            p.city.toLowerCase().includes(query.toLowerCase())
          : true;
        return matchesQuery && matchesCity;
      })
      .sort((a, b) => {
        const scoreA = a.rating * 10 + a.reviewCount * 0.1 + (a.premium ? 5 : 0);
        const scoreB = b.rating * 10 + b.reviewCount * 0.1 + (b.premium ? 5 : 0);
        return scoreB - scoreA;
      });
  }, [professionals, query, cityFilter]);

  // Slot occupancy for the active category+city filter combination
  const { data: slotData = [] } = useSlotOccupancy(
    categoryFilter || undefined,
    cityFilter || undefined
  );
  // Aggregate when multiple slots match (e.g. only city filtered → multiple categories)
  const singleSlot = categoryFilter && cityFilter ? slotData[0] : null;

  const categoryName = categoryFilter
    ? categories.find((c: { id: string; name: string }) => c.id === categoryFilter)?.name
    : null;

  const pageTitle = categoryName && cityFilter
    ? `${categoryName} em ${cityFilter}`
    : categoryName || "Buscar Profissionais";

  if (loading || isProsLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary animate-pulse">Sincronizando Dados...</p>
    </div>
  );

  return (
    <div className="min-h-screen pb-20 bg-background">
      <SEO title={`${pageTitle} | Fixr`} description={`Busque profissionais qualificados no Fixr. ${filtered.length} resultados encontrados.`} />
      <header className="sticky top-0 z-50 bg-background border-b border-border px-4 py-4">
        <div className="flex items-center gap-6 max-w-lg mx-auto">
          <Link to="/" className="w-10 h-10 flex items-center justify-center rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all active:scale-95">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="font-display font-black text-xs uppercase tracking-[0.2em] text-foreground truncate">
            {pageTitle?.toUpperCase() || "BUSCAR PROFISSIONAIS"}
          </h1>
        </div>
      </header>

      <div className="px-4 py-4 max-w-lg mx-auto flex flex-col gap-3">
        {/* Busca por Texto */}
        <div className="flex items-center gap-4 bg-secondary/10 border border-border rounded-2xl px-5 py-3 focus-within:border-primary transition-all">
          <Search size={18} className="text-primary flex-shrink-0" />
          <input
            type="text"
            placeholder="NOME, SERVIÇO OU DESCRIÇÃO..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-transparent text-sm font-black uppercase tracking-widest text-foreground placeholder:text-muted-foreground/40 outline-none"
          />
        </div>

        {/* Seletores Combinados */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2 bg-secondary/10 border border-border rounded-2xl px-4 py-3 focus-within:border-primary transition-all">
            <span className="text-primary text-[10px] font-black uppercase tracking-widest flex-shrink-0 border-r border-border pr-2 mr-1">CAT</span>
            <select
              value={categoryFilter}
              onChange={(e) => handleCategoryChange(e.target.value)}
              className="w-full bg-transparent text-[10px] font-black uppercase tracking-widest text-foreground outline-none appearance-none cursor-pointer"
            >
              <option value="" className="bg-background">TODAS</option>
              {categories.map((cat: { id: string; name: string }) => (
                <option key={cat.id} value={cat.id} className="bg-background">
                  {cat.name.toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 bg-secondary/10 border border-border rounded-2xl px-4 py-3 focus-within:border-primary transition-all">
            <MapPin size={16} className="text-primary flex-shrink-0" />
            <select
              value={cityFilter}
              onChange={(e) => handleCityChange(e.target.value)}
              className="w-full bg-transparent text-[10px] font-black uppercase tracking-widest text-foreground outline-none appearance-none cursor-pointer"
            >
              <option value="" className="bg-background">TODAS</option>
              {AVAILABLE_CITIES.map((city) => (
                <option key={city} value={city} className="bg-background">{city.toUpperCase()}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="px-4 max-w-lg mx-auto pb-10">
        {/* Scarcity indicator — only when both category and city are filtered */}
        {singleSlot && (
          <div className="mb-4 rounded-2xl border border-border bg-card p-4">
            <p className="text-[8px] font-black uppercase tracking-widest text-muted-foreground mb-2">
              Disponibilidade de vagas · {singleSlot.category_name} em {singleSlot.city}
            </p>
            <SlotIndicator slot={singleSlot} showDetails />
          </div>
        )}

        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-6 pl-1">
          {filtered.length} PROFISSIONAIS ENCONTRADOS · POR MELHOR AVALIAÇÃO
        </p>
        <div className="flex flex-col gap-4">
          {filtered.map((prof, i) => (
            <ProfessionalCard key={prof.id} professional={prof} index={i} />
          ))}
          {filtered.length === 0 && (
            <div className="text-center py-20 border border-dashed border-border rounded-2xl bg-secondary/5">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                NENHUM PROFISSIONAL ENCONTRADO.
              </p>
              <Link to="/buscar" className="text-primary text-[10px] font-black uppercase tracking-widest mt-6 inline-block hover:underline">
                REINICIAR FILTROS
              </Link>
            </div>
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default SearchPage;

