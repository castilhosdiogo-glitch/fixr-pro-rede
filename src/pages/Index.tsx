import { Link, useNavigate } from "react-router-dom";
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
          </div>
        </nav>
      </header>

      <main>
        <HeroSection />
        <CategoriesSection />
        <TrustSection />
        <HowItWorksSection />
        <ProfessionalsSection />
        <SocialProofSection />
        <PricingSection />
        <FinalCTASection />
      </main>

      <BottomNav />
    </div>
  );
};

export default Index;
