import { Link } from "react-router-dom";
import {
  Search,
  Crown,
  ShieldCheck,
  Zap,
  Star,
  Users,
  MapPin,
  ArrowRight,
  CheckCircle,
  TrendingUp,
} from "lucide-react";
import { categories, professionals } from "@/data/mock";
import CategoryButton from "@/components/CategoryButton";
import ProfessionalCard from "@/components/ProfessionalCard";
import BottomNav from "@/components/BottomNav";

const STATS = [
  { value: "500+", label: "Profissionais", icon: Users },
  { value: "6", label: "Categorias", icon: Zap },
  { value: "4.8", label: "Avaliação média", icon: Star },
];

const Index = () => {
  const topProfessionals = professionals
    .filter((p) => p.premium || p.rating >= 4.8)
    .slice(0, 3);

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card/95 backdrop-blur-md border-b border-border px-4 py-3">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
              <span className="text-primary-foreground font-display text-sm font-bold">P</span>
            </div>
            <div>
              <h1 className="font-display text-lg text-foreground tracking-tight leading-none">
                PROFIX
              </h1>
            </div>
          </div>
          <Link
            to="/auth"
            className="px-4 py-2 rounded-lg gradient-primary text-primary-foreground font-medium text-sm shadow-elevated hover:opacity-90 transition-opacity"
          >
            Entrar
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="gradient-hero px-4 py-10 text-center">
        <div className="max-w-lg mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/20 text-primary-foreground/90 text-xs font-medium mb-4">
            <MapPin size={12} />
            Porto Alegre e região metropolitana
          </div>
          <h2 className="font-display text-3xl md:text-4xl text-primary-foreground leading-tight text-balance">
            Encontre o profissional certo para o seu serviço
          </h2>
          <p className="text-primary-foreground/70 text-sm mt-3 max-w-sm mx-auto">
            Conectamos você a profissionais verificados e avaliados na sua região
          </p>

          {/* Search CTA */}
          <Link
            to="/buscar"
            className="flex items-center gap-3 w-full max-w-md mx-auto mt-6 px-5 py-4 rounded-xl bg-card text-foreground shadow-elevated hover:shadow-card-hover transition-all"
          >
            <Search size={20} className="text-primary flex-shrink-0" />
            <span className="text-muted-foreground text-sm flex-1 text-left">
              Que serviço você precisa?
            </span>
            <ArrowRight size={18} className="text-primary" />
          </Link>

          {/* Stats */}
          <div className="flex justify-center gap-6 mt-8">
            {STATS.map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="font-display text-2xl text-primary-foreground">{stat.value}</p>
                <p className="text-xs text-primary-foreground/60 mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories Grid */}
      <section className="px-4 py-6 max-w-lg mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-base uppercase tracking-tight text-foreground">
            Categorias
          </h2>
          <Link to="/buscar" className="text-xs text-primary font-medium flex items-center gap-1">
            Ver todos <ArrowRight size={12} />
          </Link>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {categories.map((category) => (
            <CategoryButton key={category.id} category={category} compact />
          ))}
        </div>
      </section>

      {/* Top Professionals */}
      <section className="px-4 py-2 max-w-lg mx-auto">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-display text-base uppercase tracking-tight text-foreground">
              Profissionais em Destaque
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">Avaliados e verificados</p>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          {topProfessionals.map((prof) => (
            <ProfessionalCard key={prof.id} professional={prof} />
          ))}
        </div>
        <Link
          to="/buscar"
          className="flex items-center justify-center gap-2 w-full mt-3 py-3 rounded-lg border border-border text-sm font-medium text-muted-foreground hover:text-primary hover:border-primary transition-colors"
        >
          Ver todos os profissionais <ArrowRight size={14} />
        </Link>
      </section>

      {/* Social Proof */}
      <section className="px-4 py-8 max-w-lg mx-auto">
        <div className="rounded-xl bg-card shadow-card p-5 text-center">
          <div className="flex justify-center gap-0.5 mb-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <Star key={i} size={18} className="text-primary" fill="currentColor" />
            ))}
          </div>
          <p className="text-sm text-foreground font-medium italic">
            "Encontrei um eletricista excelente em 5 minutos. Recomendo muito!"
          </p>
          <p className="text-xs text-muted-foreground mt-2">— Maria S., Porto Alegre</p>
        </div>
      </section>

      {/* How it works */}
      <section className="px-4 py-6 max-w-lg mx-auto">
        <h2 className="font-display text-base uppercase tracking-tight text-foreground text-center mb-6">
          Como funciona
        </h2>
        <div className="space-y-4">
          {[
            { step: "1", title: "Busque", desc: "Encontre profissionais por categoria ou serviço" },
            { step: "2", title: "Compare", desc: "Veja avaliações, fotos e perfis verificados" },
            { step: "3", title: "Contrate", desc: "Solicite orçamento direto pelo app" },
          ].map((item) => (
            <div key={item.step} className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-display text-sm">
                {item.step}
              </div>
              <div>
                <h3 className="font-display text-sm uppercase text-foreground">{item.title}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className="px-4 py-8 max-w-lg mx-auto">
        <div className="text-center mb-6">
          <h2 className="font-display text-xl uppercase tracking-tight text-foreground">
            Planos para Profixssionais
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Comece grátis, cresça quando quiser
          </p>
        </div>

        <div className="flex flex-col gap-3">
          {/* Free / Fundador */}
          <div className="rounded-xl bg-card shadow-card p-5 border-2 border-primary relative overflow-hidden">
            <div className="absolute top-0 right-0 gradient-primary text-primary-foreground px-4 py-1 text-xs font-display uppercase rounded-bl-xl">
              500 vagas
            </div>
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp size={18} className="text-primary" />
              <h3 className="font-display text-lg uppercase text-foreground">Fundador</h3>
            </div>
            <p className="font-display text-3xl text-primary">
              Grátis
            </p>
            <p className="text-xs text-muted-foreground mb-4">
              3 meses grátis para os 500 primeiros
            </p>
            <ul className="space-y-2.5 text-sm text-foreground">
              <li className="flex items-center gap-2.5">
                <CheckCircle size={16} className="text-success flex-shrink-0" /> Criar perfil profissional
              </li>
              <li className="flex items-center gap-2.5">
                <CheckCircle size={16} className="text-success flex-shrink-0" /> Aparecer nas buscas
              </li>
              <li className="flex items-center gap-2.5">
                <CheckCircle size={16} className="text-success flex-shrink-0" /> Receber solicitações
              </li>
            </ul>
            <Link
              to="/auth"
              className="block mt-5 w-full py-3.5 rounded-lg gradient-primary text-primary-foreground font-display uppercase text-sm tracking-wider text-center shadow-elevated hover:opacity-90 transition-opacity"
            >
              Garantir Vaga Grátis
            </Link>
          </div>

          {/* Pro */}
          <div className="rounded-xl bg-card shadow-card p-5">
            <div className="flex items-center gap-2 mb-1">
              <Zap size={18} className="text-primary" />
              <h3 className="font-display text-lg uppercase text-foreground">Profix Pro</h3>
            </div>
            <div className="flex items-baseline gap-1">
              <p className="font-display text-3xl text-primary">R$29</p>
              <span className="text-sm text-muted-foreground">/mês</span>
            </div>
            <ul className="space-y-2.5 text-sm text-foreground mt-4">
              <li className="flex items-center gap-2.5">
                <CheckCircle size={16} className="text-success flex-shrink-0" /> Destaque nas buscas
              </li>
              <li className="flex items-center gap-2.5">
                <CheckCircle size={16} className="text-success flex-shrink-0" /> Mais solicitações
              </li>
              <li className="flex items-center gap-2.5">
                <CheckCircle size={16} className="text-success flex-shrink-0" /> Selo Profixssional
              </li>
              <li className="flex items-center gap-2.5">
                <CheckCircle size={16} className="text-success flex-shrink-0" /> Estatísticas
              </li>
            </ul>
            <Link
              to="/auth"
              className="block mt-5 w-full py-3.5 rounded-lg border-2 border-primary text-primary font-display uppercase text-sm tracking-wider text-center hover:bg-primary hover:text-primary-foreground transition-colors"
            >
              Assinar Pro
            </Link>
          </div>

          {/* Destaque */}
          <div className="rounded-xl bg-card shadow-card p-5">
            <div className="flex items-center gap-2 mb-1">
              <Crown size={18} className="text-primary" fill="currentColor" />
              <h3 className="font-display text-lg uppercase text-foreground">Destaque</h3>
            </div>
            <div className="flex items-baseline gap-1">
              <p className="font-display text-3xl text-primary">R$59</p>
              <span className="text-sm text-muted-foreground">/mês</span>
            </div>
            <ul className="space-y-2.5 text-sm text-foreground mt-4">
              <li className="flex items-center gap-2.5">
                <CheckCircle size={16} className="text-success flex-shrink-0" /> Tudo do Pro
              </li>
              <li className="flex items-center gap-2.5">
                <CheckCircle size={16} className="text-success flex-shrink-0" /> Prioridade na busca
              </li>
              <li className="flex items-center gap-2.5">
                <CheckCircle size={16} className="text-success flex-shrink-0" /> Destaque no perfil
              </li>
              <li className="flex items-center gap-2.5">
                <CheckCircle size={16} className="text-success flex-shrink-0" /> Máxima visibilidade
              </li>
            </ul>
            <Link
              to="/auth"
              className="block mt-5 w-full py-3.5 rounded-lg border-2 border-primary text-primary font-display uppercase text-sm tracking-wider text-center hover:bg-primary hover:text-primary-foreground transition-colors"
            >
              Assinar Destaque
            </Link>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-4 py-8 max-w-lg mx-auto">
        <div className="rounded-xl gradient-hero p-6 text-center">
          <h2 className="font-display text-xl text-primary-foreground mb-2">
            É Profissional?
          </h2>
          <p className="text-sm text-primary-foreground/70 mb-5">
            Cadastre-se agora e comece a receber clientes na sua região
          </p>
          <Link
            to="/auth"
            className="inline-block px-8 py-3.5 rounded-lg gradient-primary text-primary-foreground font-display uppercase text-sm tracking-wider shadow-elevated hover:opacity-90 transition-opacity"
          >
            Criar Conta Grátis
          </Link>
        </div>
      </section>

      {/* Footer info */}
      <section className="px-4 pb-8 max-w-lg mx-auto text-center">
        <p className="text-xs text-muted-foreground">
          Disponível em Porto Alegre · Gravataí · Canoas · Cachoeirinha · Viamão · Alvorada
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          © 2026 PROFIX — A rede dos Profixssionais
        </p>
      </section>

      <BottomNav />
    </div>
  );
};

export default Index;
