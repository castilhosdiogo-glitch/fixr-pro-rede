import { useState, useMemo } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { ArrowLeft, Search, MapPin } from "lucide-react";
import { professionals, categories, AVAILABLE_CITIES } from "@/data/mock";
import ProfessionalCard from "@/components/ProfessionalCard";
import BottomNav from "@/components/BottomNav";

const SearchPage = () => {
  const [searchParams] = useSearchParams();
  const categoryFilter = searchParams.get("categoria");
  const cityParam = searchParams.get("cidade");
  const [query, setQuery] = useState("");
  const [cityFilter, setCityFilter] = useState(cityParam || "");

  const filtered = useMemo(() => {
    return professionals
      .filter((p) => {
        const matchesCategory = categoryFilter ? p.categoryId === categoryFilter : true;
        const matchesCity = cityFilter ? p.city === cityFilter : true;
        const matchesQuery = query
          ? p.name.toLowerCase().includes(query.toLowerCase()) ||
            p.category.toLowerCase().includes(query.toLowerCase()) ||
            p.city.toLowerCase().includes(query.toLowerCase())
          : true;
        return matchesCategory && matchesQuery && matchesCity;
      })
      .sort((a, b) => {
        const scoreA = a.rating * 10 + a.reviewCount * 0.1 + (a.premium ? 5 : 0);
        const scoreB = b.rating * 10 + b.reviewCount * 0.1 + (b.premium ? 5 : 0);
        return scoreB - scoreA;
      });
  }, [categoryFilter, query, cityFilter]);

  const categoryName = categoryFilter
    ? categories.find((c) => c.id === categoryFilter)?.name
    : null;

  const pageTitle = categoryName && cityFilter
    ? `${categoryName} em ${cityFilter}`
    : categoryName || "Buscar Profissionais";

  return (
    <div className="min-h-screen pb-20 bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card/95 backdrop-blur-xl border-b border-border/50 px-4 py-3">
        <div className="flex items-center gap-3 max-w-lg mx-auto">
          <Link to="/" className="text-foreground hover:text-primary transition-colors">
            <ArrowLeft size={22} />
          </Link>
          <h1 className="font-display text-base tracking-tight text-foreground truncate">
            {pageTitle}
          </h1>
        </div>
      </header>

      {/* Search bar */}
      <div className="px-4 py-3 max-w-lg mx-auto space-y-2">
        <div className="flex items-center gap-2 bg-card rounded-2xl shadow-card px-4 py-3">
          <Search size={16} className="text-muted-foreground flex-shrink-0" />
          <input
            type="text"
            placeholder="Nome, serviço ou cidade..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
          />
          <div className="flex items-center gap-1.5 border-l border-border pl-3">
            <MapPin size={14} className="text-muted-foreground flex-shrink-0" />
            <select
              value={cityFilter}
              onChange={(e) => setCityFilter(e.target.value)}
              className="bg-transparent text-xs text-foreground outline-none appearance-none cursor-pointer max-w-[110px]"
            >
              <option value="">Todas</option>
              {AVAILABLE_CITIES.map((city) => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="px-4 max-w-lg mx-auto">
        <p className="text-xs text-muted-foreground mb-3">
          {filtered.length} resultado{filtered.length !== 1 ? "s" : ""} · ordenados por relevância
        </p>
        <div className="flex flex-col gap-2">
          {filtered.map((prof, i) => (
            <ProfessionalCard key={prof.id} professional={prof} index={i} />
          ))}
          {filtered.length === 0 && (
            <div className="text-center py-16">
              <p className="text-muted-foreground text-sm">
                Nenhum profissional encontrado.
              </p>
              <Link to="/buscar" className="text-primary text-sm font-medium mt-2 inline-block">
                Limpar filtros
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
