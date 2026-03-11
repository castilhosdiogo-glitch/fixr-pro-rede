import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Hammer, Zap, Droplets, SprayCan, Key, Wind, type LucideIcon } from "lucide-react";
import type { Category } from "@/data/mock";

const iconMap: Record<string, LucideIcon> = {
  Hammer, Zap, Droplets, SprayCan, Key, Wind,
};

interface CategoryButtonProps {
  category: Category;
  compact?: boolean;
  index?: number;
}

const CategoryButton = ({ category, compact, index = 0 }: CategoryButtonProps) => {
  const Icon = iconMap[category.icon] || Hammer;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
    >
      <Link
        to={`/buscar?categoria=${category.id}`}
        className="group flex flex-col items-center gap-2 p-4 rounded-xl bg-card shadow-card hover:shadow-card-hover transition-all duration-300"
      >
        <div className="w-11 h-11 rounded-xl gradient-primary flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
          <Icon size={20} className="text-primary-foreground" />
        </div>
        <span className="text-xs font-medium text-foreground text-center leading-tight">
          {category.name}
        </span>
        {!compact && (
          <span className="text-[10px] text-muted-foreground">{category.count} profissionais</span>
        )}
      </Link>
    </motion.div>
  );
};

export default CategoryButton;
