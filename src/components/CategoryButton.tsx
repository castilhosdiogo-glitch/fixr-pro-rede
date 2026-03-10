import { Link } from "react-router-dom";
import { Hammer, Zap, Droplets, SprayCan, Key, Wind, type LucideIcon } from "lucide-react";
import type { Category } from "@/data/mock";

const iconMap: Record<string, LucideIcon> = {
  Hammer,
  Zap,
  Droplets,
  SprayCan,
  Key,
  Wind,
};

interface CategoryButtonProps {
  category: Category;
}

const CategoryButton = ({ category }: CategoryButtonProps) => {
  const Icon = iconMap[category.icon] || Hammer;

  return (
    <Link
      to={`/buscar?categoria=${category.id}`}
      className="flex items-center gap-4 w-full p-4 bg-card border-2 border-border hover:border-primary transition-colors"
    >
      <div className="flex items-center justify-center w-12 h-12 bg-secondary">
        <Icon size={24} className="text-foreground" fill="currentColor" />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-display text-base uppercase tracking-tight text-foreground">
          {category.name}
        </h3>
        <p className="text-sm text-muted-foreground">
          {category.count} profissionais
        </p>
      </div>
      <span className="text-muted-foreground text-lg">→</span>
    </Link>
  );
};

export default CategoryButton;
