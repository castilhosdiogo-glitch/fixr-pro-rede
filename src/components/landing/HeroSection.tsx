import { Link } from "react-router-dom";
import { Search, ArrowRight, MapPin, Users, Zap, Star } from "lucide-react";
import { motion } from "framer-motion";

const STATS = [
  { value: "500+", label: "Profissionais", icon: Users },
  { value: "6", label: "Categorias", icon: Zap },
  { value: "4.8", label: "Nota média", icon: Star },
];

const HeroSection = () => (
  <section className="gradient-hero px-4 py-14 md:py-20 relative overflow-hidden">
    {/* Decorative orbs */}
    <div className="absolute top-10 right-10 w-64 h-64 rounded-full bg-primary/5 blur-3xl animate-pulse-soft" />
    <div className="absolute bottom-10 left-10 w-48 h-48 rounded-full bg-accent/5 blur-3xl animate-pulse-soft" />
    
    <div className="max-w-lg mx-auto relative z-10">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center"
      >
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/15 border border-primary/20 text-primary-foreground/90 text-xs font-medium mb-6">
          <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
          <MapPin size={12} />
          Porto Alegre e região metropolitana
        </div>
        
        <h2 className="font-display text-3xl md:text-5xl text-primary-foreground leading-[1.1] text-balance">
          O profissional certo,{" "}
          <span className="text-gradient">a um toque</span>
        </h2>
        
        <p className="text-primary-foreground/60 text-sm md:text-base mt-4 max-w-sm mx-auto leading-relaxed">
          Encontre, compare e contrate profissionais verificados na sua cidade
        </p>
      </motion.div>

      {/* Search CTA */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        <Link
          to="/buscar"
          className="flex items-center gap-3 w-full max-w-md mx-auto mt-8 px-5 py-4 rounded-2xl gradient-glass text-foreground shadow-elevated hover:shadow-card-hover transition-all duration-300 group"
        >
          <Search size={20} className="text-primary flex-shrink-0" />
          <span className="text-muted-foreground text-sm flex-1 text-left">
            Que serviço você precisa?
          </span>
          <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center group-hover:scale-110 transition-transform">
            <ArrowRight size={14} className="text-primary-foreground" />
          </div>
        </Link>
      </motion.div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.4 }}
        className="flex justify-center gap-8 mt-10"
      >
        {STATS.map((stat) => (
          <div key={stat.label} className="text-center">
            <p className="font-display text-2xl md:text-3xl text-primary-foreground">{stat.value}</p>
            <p className="text-[11px] text-primary-foreground/50 mt-1 uppercase tracking-wider">{stat.label}</p>
          </div>
        ))}
      </motion.div>
    </div>
  </section>
);

export default HeroSection;
