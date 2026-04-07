import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Hammer, Zap, Droplets, SprayCan, Key, Wind, type LucideIcon } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
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
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(`/buscar?categoria=${category.id}`);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
    >
      <button
        onClick={handleClick}
        className="group flex flex-col items-center gap-3 p-4 rounded-2xl bg-secondary/10 border-2 border-border hover:border-primary transition-colors w-full h-full"
      >
        <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center border-2 border-primary group-hover:bg-primary/90 transition-all">
          <Icon size={24} className="text-primary-foreground" />
        </div>
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground text-center leading-tight">
          {category.name.toUpperCase()}
        </span>
        {!compact && (
          <span className="text-[9px] font-black uppercase tracking-widest text-primary opacity-60">[{category.count} TÉCNICOS]</span>
        )}
      </button>
    </motion.div>
  );
};

export default CategoryButton;
