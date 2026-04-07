<<<<<<< HEAD
﻿import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Drill, ShieldCheck, Zap } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const HeroSection = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleRegister = () => {
    navigate("/auth?tab=register");
  };

  return (
    <section className="relative px-4 pt-16 pb-24 md:pt-32 md:pb-40 overflow-hidden bg-background">
      {/* Background Shift Architecture - No Gradients */}
      <div className="absolute top-0 right-0 w-1/2 h-full bg-secondary/20 -skew-x-12 translate-x-1/4 pointer-events-none"></div>

      <div className="max-w-7xl mx-auto relative z-10 flex flex-col items-start">
        
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
          className="inline-flex items-center gap-3 px-0 mb-10"
        >
          <div className="w-2 h-10 bg-primary rounded-full"></div>
          <span className="text-sm font-bold uppercase tracking-widest text-primary">
            O lugar certo para quem trabalha por conta própria
          </span>
        </motion.div>

        <motion.h1 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="font-display font-extrabold text-5xl sm:text-6xl md:text-[5rem] text-foreground tracking-tight max-w-5xl leading-[1.1]"
        >
          Sua habilidade. <br />
          <span className="text-primary">Nossa conexão.</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="mt-10 text-xl sm:text-2xl text-muted-foreground max-w-3xl leading-relaxed border-l-2 border-border pl-8"
        >
          O Fixr é feito para quem quer trabalhar mais e melhor.
          Crie seu perfil em segundos e seja encontrado por clientes que precisam do seu serviço agora.
        </motion.p>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="mt-16 flex flex-col sm:flex-row items-center gap-6 w-full sm:w-auto"
        >
          <button 
            onClick={handleRegister}
            className="w-full sm:w-auto px-10 py-5 bg-primary text-primary-foreground font-bold text-sm rounded-2xl shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all flex items-center justify-center gap-4 group"
          >
            Começar agora
            <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
          </button>
          
          <button 
            onClick={() => navigate("/buscar")}
            className="w-full sm:w-auto px-10 py-5 bg-secondary text-secondary-foreground font-bold text-sm rounded-2xl hover:bg-secondary/80 transition-all"
          >
            Procurar Profissionais
          </button>
        </motion.div>

        {/* Industrial Trust Indicators */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="mt-24 w-full grid grid-cols-1 md:grid-cols-2 gap-px bg-border"
        >
          <div className="bg-background p-10 flex items-start gap-6 group hover:bg-secondary/10 transition-colors">
            <div className="w-14 h-14 bg-primary/10 flex items-center justify-center text-primary rounded-2xl group-hover:bg-primary group-hover:text-white transition-all">
              <Drill className="w-7 h-7" />
            </div>
            <div className="text-left">
              <h3 className="font-display font-black text-lg uppercase tracking-wider mb-2">Mostre seu Trabalho</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">Tenha um perfil que passa confiança para o cliente e receba pedidos de orçamento direto no seu celular.</p>
            </div>
          </div>
          
          <div className="bg-background p-10 flex items-start gap-6 group hover:bg-secondary/10 transition-colors">
            <div className="w-14 h-14 bg-secondary flex items-center justify-center text-white rounded-2xl group-hover:bg-primary transition-all">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <div className="text-left">
              <h3 className="font-display font-black text-lg uppercase tracking-wider mb-2">Segurança de Verdade</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">Negocie direto com o cliente de forma transparente. No Fixr, o seu trabalho é valorizado.</p>
            </div>
          </div>
        </motion.div>

=======
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
>>>>>>> f38df2aedbfdd1c2343837c06db5bb59b8dcdb8a
      </div>
    </section>
  );
};

export default HeroSection;
<<<<<<< HEAD

=======
>>>>>>> f38df2aedbfdd1c2343837c06db5bb59b8dcdb8a
