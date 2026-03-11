import { Link } from "react-router-dom";
import { Search, Crown, ShieldCheck, Zap } from "lucide-react";
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
          <Link
            to="/auth"
            className="px-4 py-2 bg-primary text-primary-foreground font-display uppercase text-xs tracking-wider"
          >
            Entrar
          </Link>
        </div>
      </header>

      {/* Hero */}
      <div className="p-4 bg-card border-b-2 border-border">
        <p className="text-sm text-muted-foreground mb-1">
          Disponível em Porto Alegre e região metropolitana
        </p>
        <p className="text-xs text-muted-foreground">
          Porto Alegre · Gravataí · Canoas · Cachoeirinha · Viamão · Alvorada
        </p>
      </div>

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

      {/* Pricing */}
      <div className="px-4 mt-8">
        <h2 className="font-display text-lg uppercase tracking-tight text-foreground mb-1">
          Planos para Profixssionais
        </h2>
        <p className="text-xs text-muted-foreground mb-4">
          Escolha o plano ideal para o seu negócio
        </p>

        <div className="flex flex-col gap-3">
          {/* Free / Fundador */}
          <div className="bg-card border-2 border-primary p-4 relative">
            <div className="absolute -top-3 left-4 bg-primary text-primary-foreground px-3 py-0.5 font-display text-xs uppercase">
              Fundador — 500 vagas
            </div>
            <h3 className="font-display text-xl uppercase text-foreground mt-2">Grátis</h3>
            <p className="text-xs text-muted-foreground mb-3">3 primeiros meses para os 500 primeiros cadastros</p>
            <ul className="space-y-2 text-sm text-foreground">
              <li className="flex items-center gap-2">
                <ShieldCheck size={14} className="text-accent" /> Criar perfil profissional
              </li>
              <li className="flex items-center gap-2">
                <Search size={14} className="text-accent" /> Aparecer nas buscas
              </li>
            </ul>
            <Link
              to="/auth"
              className="block mt-4 w-full py-3 bg-primary text-primary-foreground font-display uppercase text-sm tracking-wider text-center"
            >
              Começar Grátis
            </Link>
          </div>

          {/* Pro */}
          <div className="bg-card border-2 border-border p-4">
            <div className="flex items-center gap-2">
              <Zap size={18} className="text-primary" />
              <h3 className="font-display text-xl uppercase text-foreground">Profix Pro</h3>
            </div>
            <p className="text-2xl font-display text-primary mt-1">
              R$29<span className="text-sm text-muted-foreground">/mês</span>
            </p>
            <ul className="space-y-2 text-sm text-foreground mt-3">
              <li className="flex items-center gap-2">
                <Search size={14} className="text-accent" /> Destaque nas buscas
              </li>
              <li className="flex items-center gap-2">
                <Zap size={14} className="text-accent" /> Mais solicitações
              </li>
              <li className="flex items-center gap-2">
                <ShieldCheck size={14} className="text-accent" /> Selo Profixssional
              </li>
            </ul>
            <Link
              to="/auth"
              className="block mt-4 w-full py-3 border-2 border-primary text-primary font-display uppercase text-sm tracking-wider text-center hover:bg-primary hover:text-primary-foreground transition-colors"
            >
              Assinar Pro
            </Link>
          </div>

          {/* Destaque */}
          <div className="bg-card border-2 border-border p-4">
            <div className="flex items-center gap-2">
              <Crown size={18} className="text-primary" fill="currentColor" />
              <h3 className="font-display text-xl uppercase text-foreground">Destaque</h3>
            </div>
            <p className="text-2xl font-display text-primary mt-1">
              R$59<span className="text-sm text-muted-foreground">/mês</span>
            </p>
            <ul className="space-y-2 text-sm text-foreground mt-3">
              <li className="flex items-center gap-2">
                <Crown size={14} className="text-primary" fill="currentColor" /> Prioridade na busca
              </li>
              <li className="flex items-center gap-2">
                <Zap size={14} className="text-accent" /> Destaque no perfil
              </li>
              <li className="flex items-center gap-2">
                <Search size={14} className="text-accent" /> Mais visibilidade
              </li>
            </ul>
            <Link
              to="/auth"
              className="block mt-4 w-full py-3 border-2 border-primary text-primary font-display uppercase text-sm tracking-wider text-center hover:bg-primary hover:text-primary-foreground transition-colors"
            >
              Assinar Destaque
            </Link>
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default Index;
