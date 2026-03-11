import { useState, useMemo } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { ArrowLeft, Search, SlidersHorizontal } from "lucide-react";
import { professionals, categories, AVAILABLE_CITIES } from "@/data/mock";
import ProfessionalCard from "@/components/ProfessionalCard";
import BottomNav from "@/components/BottomNav";

const SearchPage = () => {
  const [searchParams] = useSearchParams();
  const categoryFilter = searchParams.get("categoria");
  const [query, setQuery] = useState("");
  const [cityFilter, setCityFilter] = useState("");

  const filtered = useMemo(() => {
    return professionals.filter((p) => {
      const matchesCategory = categoryFilter ? p.categoryId === categoryFilter : true;
      const matchesCity = cityFilter ? p.city === cityFilter : true;
      const matchesQuery = query
        ? p.name.toLowerCase().includes(query.toLowerCase()) ||
          p.category.toLowerCase().includes(query.toLowerCase()) ||
          p.city.toLowerCase().includes(query.toLowerCase())
        : true;
      return matchesCategory && matchesQuery && matchesCity;
    });
  }, [categoryFilter, query, cityFilter]);

  const categoryName = categoryFilter
    ? categories.find((c) => c.id === categoryFilter)?.name
    : null;

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card/95 backdrop-blur-md border-b border-border px-4 py-3">
        <div className="flex items-center gap-3 max-w-lg mx-auto">
          <Link to="/" className="text-foreground hover:text-primary transition-colors">
            <ArrowLeft size={22} />
          </Link>
          <h1 className="font-display text-base uppercase tracking-tight text-foreground">
            {categoryName || "Buscar Profissionais"}
          </h1>
        </div>
      </header>

      {/* Search + filters */}
      <div className="px-4 py-3 max-w-lg mx-auto space-y-2">
        <div className="flex items-center gap-3 bg-card rounded-lg shadow-card px-4 py-3">
          <Search size={18} className="text-muted-foreground flex-shrink-0" />
          <input
            type="text"
            placeholder="Nome, serviço ou cidade..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
          />
        </div>

        <div className="flex gap-2">
          <select
            value={cityFilter}
            onChange={(e) => setCityFilter(e.target.value)}
            className="flex-1 bg-card rounded-lg shadow-card px-3 py-2 text-xs text-foreground outline-none border-none"
          >
            <option value="">Todas as cidades</option>
            {AVAILABLE_CITIES.map((city) => (
              <option key={city} value={city}>{city}</option>
            ))}
          </select>

          {!categoryFilter && (
            <div className="flex gap-1.5 overflow-x-auto flex-1">
              {categories.slice(0, 3).map((cat) => (
                <Link
                  key={cat.id}
                  to={`/buscar?categoria=${cat.id}`}
                  className="px-3 py-2 rounded-lg bg-card shadow-card text-xs font-medium text-foreground whitespace-nowrap hover:text-primary transition-colors"
                >
                  {cat.name}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Results */}
      <div className="px-4 max-w-lg mx-auto">
        <p className="text-xs text-muted-foreground mb-3">
          {filtered.length} resultado{filtered.length !== 1 ? "s" : ""}
        </p>
        <div className="flex flex-col gap-2">
          {filtered.map((prof) => (
            <ProfessionalCard key={prof.id} professional={prof} />
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
