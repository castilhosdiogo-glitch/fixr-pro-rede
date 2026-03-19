import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, ArrowRight, MapPin, Shield, Users, Star } from "lucide-react";
import { motion } from "framer-motion";
import { categories, AVAILABLE_CITIES } from "@/data/mock";
import { useAuth } from "@/hooks/useAuth";

const STATS = [
  { value: "500+", label: "Profissionais", icon: Users },
  { value: "4.8★", label: "Nota média", icon: Star },
  { value: "100%", label: "Verificados", icon: Shield },
];

const HeroSection = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [service, setService] = useState("");
  const [city, setCity] = useState("");

  const handleSearch = () => {
    if (!user) {
      navigate("/auth");
      return;
    }
    const params = new URLSearchParams();
    if (service) params.set("categoria", service);
    if (city) params.set("cidade", city);
    navigate(`/buscar?${params.toString()}`);
  };

  const handleFindProfessional = () => {
    if (!user) {
      navigate("/auth");
      return;
    }
    navigate("/buscar");
  };

  return (
    <section className="gradient-hero px-4 pt-16 pb-20 md:pt-24 md:pb-28 relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-primary/5 blur-[120px]" />
      <div className="absolute bottom-0 left-0 w-72 h-72 rounded-full bg-accent/5 blur-[100px]" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary/3 blur-[150px]" />

      <div className="max-w-lg mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="text-center"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/12 border border-primary/15 text-primary-foreground/80 text-xs font-medium mb-8">
            <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
            <MapPin size={12} />
            Porto Alegre e região metropolitana
          </div>

          <h2 className="font-display text-4xl md:text-5xl text-primary-foreground leading-[1.08] text-balance">
            PROFIX —{" "}
            <span className="text-gradient">A Rede dos Profixssionais</span>
          </h2>

          <p className="text-primary-foreground/55 text-base md:text-lg mt-5 max-w-sm mx-auto leading-relaxed">
            Encontre profissionais de confiança para sua casa em minutos.
          </p>
        </motion.div>

        {/* Search bar */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-10"
        >
          <div className="bg-card/95 backdrop-blur-xl rounded-2xl shadow-elevated p-2 max-w-md mx-auto">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 flex-1 bg-background rounded-xl px-3 py-3">
                  <Search size={16} className="text-muted-foreground flex-shrink-0" />
                  <select
                    value={service}
                    onChange={(e) => setService(e.target.value)}
                    className="w-full bg-transparent text-sm text-foreground outline-none appearance-none cursor-pointer"
                  >
                    <option value="">Tipo de serviço</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 flex-1 bg-background rounded-xl px-3 py-3">
                  <MapPin size={16} className="text-muted-foreground flex-shrink-0" />
                  <select
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full bg-transparent text-sm text-foreground outline-none appearance-none cursor-pointer"
                  >
                    <option value="">Cidade ou região</option>
                    {AVAILABLE_CITIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={handleSearch}
                  className="flex-shrink-0 w-12 h-12 rounded-xl gradient-primary flex items-center justify-center shadow-elevated hover:scale-105 transition-transform"
                  aria-label="Buscar profissionais"
                >
                  <ArrowRight size={18} className="text-primary-foreground" />
                </button>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Dual CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.35 }}
          className="flex gap-3 mt-8 max-w-md mx-auto"
        >
          <button
            onClick={handleFindProfessional}
            className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl gradient-cta text-primary-foreground font-display text-sm tracking-wide hover:scale-[1.02] transition-transform"
          >
            Encontrar Profissional
          </button>
          <button
            onClick={() => navigate("/auth")}
            className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl border border-primary-foreground/20 text-primary-foreground font-display text-sm tracking-wide hover:bg-primary-foreground/5 transition-colors"
          >
            Ser um Profixssional
          </button>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="flex justify-center gap-10 mt-12"
        >
          {STATS.map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="font-display text-2xl md:text-3xl text-primary-foreground">{stat.value}</p>
              <p className="text-[11px] text-primary-foreground/45 mt-1 uppercase tracking-wider">{stat.label}</p>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;
