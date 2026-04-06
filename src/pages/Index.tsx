<<<<<<< HEAD
import { Link } from "react-router-dom";
=======
import { Link, useNavigate } from "react-router-dom";
>>>>>>> f38df2aedbfdd1c2343837c06db5bb59b8dcdb8a
import { useAuth } from "@/hooks/useAuth";
import BottomNav from "@/components/BottomNav";
import HeroSection from "@/components/landing/HeroSection";
import CategoriesSection from "@/components/landing/CategoriesSection";
import TrustSection from "@/components/landing/TrustSection";
import ProfessionalsSection from "@/components/landing/ProfessionalsSection";
import SocialProofSection from "@/components/landing/SocialProofSection";
import HowItWorksSection from "@/components/landing/HowItWorksSection";
import PricingSection from "@/components/landing/PricingSection";
import FinalCTASection from "@/components/landing/FinalCTASection";
<<<<<<< HEAD
import { SEO } from "@/components/SEO";
import { Logo } from "@/components/Logo";

const Index = () => {
  const { user, profile } = useAuth();

  return (
    <div className="min-h-screen pb-20 bg-background selection:bg-primary/20 selection:text-foreground">
      <SEO title="Fixr — Conectando Você aos Melhores Profissionais" />

      {/* Industrial Header */}
      <header className="sticky top-0 z-50 bg-background/95 border-b border-border">
        <nav className="px-4 py-4 max-w-7xl mx-auto flex items-center justify-between" aria-label="Navegação principal">

          <Link to="/" className="flex items-center gap-3 group" aria-label="Fixr">
            <Logo className="w-10 h-10 group-hover:scale-95 transition-transform" />
            <div className="flex flex-col">
              <h1 className="font-display font-extrabold text-2xl tracking-tight text-foreground">
                Fixr
              </h1>
            </div>
          </Link>

          {/* Technical Desktop Nav */}
          <div className="hidden md:flex items-center gap-8 font-display font-semibold text-sm text-foreground/80">
            <a href="#profissionais" className="hover:text-primary transition-colors">Para Profissionais</a>
            <a href="#como-funciona" className="hover:text-primary transition-colors">Como Funciona</a>
            <a href="#planos" className="hover:text-primary transition-colors">Planos</a>
          </div>

          <div className="flex items-center gap-4">
            {user ? (
              <Link
                to={profile?.user_type === "professional" ? "/dashboard" : "/meu-painel"}
                className="hidden sm:inline-flex px-6 py-2.5 bg-secondary text-foreground font-bold text-xs uppercase tracking-widest rounded-2xl hover:bg-secondary/80 transition-all border border-border"
              >
                Meu Painel
              </Link>
            ) : (
              <>
                <Link
                  to="/auth"
                  className="hidden sm:inline-flex px-4 py-2.5 text-foreground font-semibold text-sm hover:text-primary transition-all rounded-2xl"
                >
                  Entrar
                </Link>
                <Link
                  to="/auth?tab=register"
                  className="hidden sm:inline-flex px-8 py-3 bg-primary text-primary-foreground font-bold text-sm rounded-2xl shadow-sm hover:bg-primary/90 transition-all active:scale-95"
                >
                  Cadastre-se
                </Link>
              </>
            )}
=======

const Index = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen pb-20">
      {/* SEO-optimized Header / Navbar */}
      <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-xl border-b border-border/50">
        <nav className="px-4 py-3 max-w-5xl mx-auto" aria-label="Navegação principal">
          <div className="flex items-center justify-between">
            {/* Brand */}
            <Link to="/" className="flex items-center gap-2.5" aria-label="PROFIX - Página inicial">
              <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center shadow-sm">
                <span className="text-primary-foreground font-display text-base font-bold">P</span>
              </div>
              <div className="flex flex-col">
                <h1 className="font-display text-xl text-foreground tracking-tight leading-none">
                  PROFIX
                </h1>
                <span className="text-[9px] text-muted-foreground tracking-widest uppercase leading-none mt-0.5">
                  Rede Profissional
                </span>
              </div>
            </Link>

            {/* Desktop Nav Links */}
            <div className="hidden md:flex items-center gap-6">
              <a href="#como-funciona" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Como Funciona
              </a>
              <a href="#planos" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Planos
              </a>
              <a href="#profissionais" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Profissionais
              </a>
            </div>

            {/* CTA */}
            <div className="flex items-center gap-2">
              {user ? (
                <Link
                  to="/perfil"
                  className="px-5 py-2.5 rounded-xl gradient-primary text-primary-foreground font-medium text-sm shadow-sm hover:shadow-elevated transition-all duration-300"
                >
                  Meu Painel
                </Link>
              ) : (
                <>
                  <Link
                    to="/auth"
                    className="hidden sm:inline-flex px-4 py-2.5 rounded-xl text-sm font-medium text-foreground hover:text-primary transition-colors"
                  >
                    Entrar
                  </Link>
                  <Link
                    to="/auth"
                    className="px-5 py-2.5 rounded-xl gradient-primary text-primary-foreground font-medium text-sm shadow-sm hover:shadow-elevated transition-all duration-300"
                  >
                    Cadastre-se
                  </Link>
                </>
              )}
            </div>
>>>>>>> f38df2aedbfdd1c2343837c06db5bb59b8dcdb8a
          </div>
        </nav>
      </header>

      <main>
        <HeroSection />
<<<<<<< HEAD
        {/* We keep the rest of the sections but their default UI will inherit our global styling. We reshuffle slightly for priority. */}
        <div id="profissionais"><ProfessionalsSection /></div>
        <CategoriesSection />
        <div id="como-funciona"><HowItWorksSection /></div>
        <TrustSection />
        <SocialProofSection />
        <div id="planos"><PricingSection /></div>
        <FinalCTASection />
      </main>
=======
        <CategoriesSection />
        <TrustSection />
        <HowItWorksSection />
        <ProfessionalsSection />
        <SocialProofSection />
        <PricingSection />
        <FinalCTASection />
      </main>

      <BottomNav />
>>>>>>> f38df2aedbfdd1c2343837c06db5bb59b8dcdb8a
    </div>
  );
};

export default Index;
