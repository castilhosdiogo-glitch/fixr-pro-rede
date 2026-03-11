import { Star } from "lucide-react";
import { motion } from "framer-motion";

const testimonials = [
  {
    text: "Encontrei um eletricista excelente em 5 minutos. Trabalho impecável!",
    author: "Maria S.",
    city: "Porto Alegre",
    rating: 5,
  },
  {
    text: "A montagem ficou perfeita. Profissional pontual e muito cuidadoso.",
    author: "João L.",
    city: "Canoas",
    rating: 5,
  },
  {
    text: "Resolveu o problema de encanamento que outros não conseguiram. Super recomendo!",
    author: "Ana C.",
    city: "Gravataí",
    rating: 5,
  },
];

const SocialProofSection = () => (
  <section className="px-4 py-8 max-w-lg mx-auto">
    <motion.h2
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      className="font-display text-lg text-foreground text-center mb-5"
    >
      O que dizem nossos clientes
    </motion.h2>
    <div className="flex flex-col gap-3">
      {testimonials.map((t, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: i % 2 === 0 ? -20 : 20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: i * 0.1 }}
          className="rounded-xl bg-card shadow-card p-5"
        >
          <div className="flex gap-0.5 mb-2">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star key={s} size={14} className="text-primary" fill="currentColor" />
            ))}
          </div>
          <p className="text-sm text-foreground leading-relaxed">
            "{t.text}"
          </p>
          <p className="text-xs text-muted-foreground mt-3">
            — {t.author}, {t.city}
          </p>
        </motion.div>
      ))}
    </div>
  </section>
);

export default SocialProofSection;
