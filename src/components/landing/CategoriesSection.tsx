import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { categories } from "@/data/mock";
import CategoryButton from "@/components/CategoryButton";

const CategoriesSection = () => (
  <section className="px-4 py-8 max-w-lg mx-auto">
    <motion.div
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      className="flex items-center justify-between mb-5"
    >
      <div>
        <h2 className="font-display text-lg text-foreground">Categorias</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Encontre por tipo de serviço</p>
      </div>
      <Link to="/buscar" className="text-xs text-primary font-medium flex items-center gap-1 hover:gap-2 transition-all">
        Ver todos <ArrowRight size={12} />
      </Link>
    </motion.div>
    <div className="grid grid-cols-3 gap-2">
      {categories.map((category, i) => (
        <CategoryButton key={category.id} category={category} compact index={i} />
      ))}
    </div>
  </section>
);

export default CategoriesSection;
