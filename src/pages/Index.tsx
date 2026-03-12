import { Link } from "react-router-dom";
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
  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-xl border-b border-border/50 px-4 py-3">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center shadow-sm">
              <span className="text-primary-foreground font-display text-base font-bold">P</span>
            </div>
            <h1 className="font-display text-xl text-foreground tracking-tight leading-none">
              PROFIX
            </h1>
          </div>
          <Link
            to="/auth"
            className="px-5 py-2.5 rounded-xl gradient-primary text-primary-foreground font-medium text-sm shadow-sm hover:shadow-elevated transition-all duration-300"
          >
            Entrar
          </Link>
        </div>
      </header>

      <HeroSection />
      <CategoriesSection />
      <TrustSection />
      <HowItWorksSection />
      <ProfessionalsSection />
      <SocialProofSection />
      <PricingSection />
      <FinalCTASection />

      <BottomNav />
    </div>
  );
};

export default Index;
