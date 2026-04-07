import { Link } from "react-router-dom";
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
          </div>
        </nav>
      </header>

      <main>
        <HeroSection />
        {/* We keep the rest of the sections but their default UI will inherit our global styling. We reshuffle slightly for priority. */}
        <div id="profissionais"><ProfessionalsSection /></div>
        <CategoriesSection />
        <div id="como-funciona"><HowItWorksSection /></div>
        <TrustSection />
        <SocialProofSection />
        <div id="planos"><PricingSection /></div>
        <FinalCTASection />
      </main>
    </div>
  );
};

export default Index;
