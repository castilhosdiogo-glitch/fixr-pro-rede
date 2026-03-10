import { useState, useMemo } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { ArrowLeft, Search } from "lucide-react";
import { professionals, categories } from "@/data/mock";
import ProfessionalCard from "@/components/ProfessionalCard";
import BottomNav from "@/components/BottomNav";

const SearchPage = () => {
  const [searchParams] = useSearchParams();
  const categoryFilter = searchParams.get("categoria");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    return professionals.filter((p) => {
      const matchesCategory = categoryFilter ? p.categoryId === categoryFilter : true;
      const matchesQuery = query
        ? p.name.toLowerCase().includes(query.toLowerCase()) ||
          p.category.toLowerCase().includes(query.toLowerCase()) ||
          p.city.toLowerCase().includes(query.toLowerCase())
        : true;
      return matchesCategory && matchesQuery;
    });
  }, [categoryFilter, query]);

  const categoryName = categoryFilter
    ? categories.find((c) => c.id === categoryFilter)?.name
    : null;

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <header className="bg-card border-b-2 border-border p-4">
        <div className="flex items-center gap-3">
          <Link to="/" className="text-foreground">
            <ArrowLeft size={24} />
          </Link>
          <h1 className="font-display text-lg uppercase tracking-tight text-foreground">
            {categoryName || "Buscar Profissionais"}
          </h1>
        </div>
      </header>

      {/* Search input */}
      <div className="p-4">
        <div className="flex items-center gap-3 bg-card border-2 border-border px-4 py-3">
          <Search size={18} className="text-muted-foreground flex-shrink-0" />
          <input
            type="text"
            placeholder="Nome, serviço ou cidade..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
          />
        </div>
      </div>

      {/* Category filter chips */}
      {!categoryFilter && (
        <div className="px-4 pb-3 flex flex-wrap gap-2">
          {categories.map((cat) => (
            <Link
              key={cat.id}
              to={`/buscar?categoria=${cat.id}`}
              className="px-3 py-1.5 border-2 border-border bg-card text-xs font-display uppercase tracking-wider text-foreground hover:border-primary transition-colors"
            >
              {cat.name}
            </Link>
          ))}
        </div>
      )}

      {/* Results */}
      <div className="px-4">
        <p className="text-xs text-muted-foreground uppercase font-display mb-3">
          {filtered.length} resultado{filtered.length !== 1 ? "s" : ""}
        </p>
        <div className="flex flex-col gap-2">
          {filtered.map((prof) => (
            <ProfessionalCard key={prof.id} professional={prof} />
          ))}
          {filtered.length === 0 && (
            <p className="text-center text-muted-foreground py-12 text-sm">
              Nenhum profissional encontrado.
            </p>
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default SearchPage;
