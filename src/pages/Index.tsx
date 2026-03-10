import { Link } from "react-router-dom";
import { Search } from "lucide-react";
import { categories } from "@/data/mock";
import CategoryButton from "@/components/CategoryButton";
import BottomNav from "@/components/BottomNav";

const Index = () => {
  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <header className="bg-card border-b-2 border-border p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl text-primary tracking-tight">
              PROFIX
            </h1>
            <p className="text-xs text-muted-foreground uppercase font-display tracking-wider">
              A rede dos Profixssionais
            </p>
          </div>
        </div>
      </header>

      {/* Search bar */}
      <div className="p-4">
        <Link
          to="/buscar"
          className="flex items-center gap-3 w-full p-4 bg-card border-2 border-border hover:border-primary transition-colors"
        >
          <Search size={20} className="text-muted-foreground" />
          <span className="text-muted-foreground text-sm">
            Que serviço você precisa?
          </span>
        </Link>
      </div>

      {/* Categories */}
      <div className="px-4">
        <h2 className="font-display text-lg uppercase tracking-tight text-foreground mb-3">
          Categorias
        </h2>
        <div className="flex flex-col gap-2">
          {categories.map((category) => (
            <CategoryButton key={category.id} category={category} />
          ))}
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default Index;
