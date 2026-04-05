import { Star, Quote } from "lucide-react";
import { motion } from "framer-motion";

const testimonials = [
  {
    text: "Encontrei um eletricista excelente em 5 minutos. Trabalho impecável e preço justo!",
    author: "Maria S.",
    city: "Porto Alegre",
    rating: 5,
    service: "Eletricista",
  },
  {
    text: "A montagem ficou perfeita. Profissional pontual e muito cuidadoso com os móveis.",
    author: "João L.",
    city: "Canoas",
    rating: 5,
    service: "Montador",
  },
  {
    text: "Resolveu o problema de encanamento que outros não conseguiram. Super recomendo a plataforma!",
    author: "Ana C.",
    city: "Gravataí",
    rating: 5,
    service: "Encanador",
  },
];

const SocialProofSection = () => (
  <section className="px-4 py-10 max-w-lg mx-auto">
    <motion.div
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      className="text-center mb-6"
    >
      <h2 className="font-display text-2xl text-foreground">
        O que dizem nossos clientes
      </h2>
      <p className="text-sm text-muted-foreground mt-1">
        Avaliações reais de quem já usou a plataforma
      </p>
    </motion.div>
    <div className="flex flex-col gap-3">
      {testimonials.map((t, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: i * 0.1 }}
          className="rounded-2xl bg-card shadow-card p-5 relative"
        >
          <Quote size={24} className="absolute top-4 right-4 text-primary/10" />
          <div className="flex gap-0.5 mb-3">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star key={s} size={14} className="text-primary" fill="currentColor" />
            ))}
          </div>
          <p className="text-sm text-foreground leading-relaxed pr-6">
            "{t.text}"
          </p>
          <div className="flex items-center justify-between mt-4">
            <p className="text-xs text-muted-foreground">
              — {t.author}, {t.city}
            </p>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
              {t.service}
            </span>
          </div>
        </motion.div>
      ))}
    </div>
  </section>
);

export default SocialProofSection;
