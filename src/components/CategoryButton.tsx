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

const colorMap: Record<string, string> = {
  Hammer: "bg-primary/10 text-primary",
  Zap: "bg-primary/10 text-primary",
  Droplets: "bg-accent/10 text-accent",
  SprayCan: "bg-success/10 text-success",
  Key: "bg-primary/10 text-primary",
  Wind: "bg-accent/10 text-accent",
};

interface CategoryButtonProps {
  category: Category;
  compact?: boolean;
}

const CategoryButton = ({ category, compact }: CategoryButtonProps) => {
  const Icon = iconMap[category.icon] || Hammer;
  const colors = colorMap[category.icon] || "bg-primary/10 text-primary";

  if (compact) {
    return (
      <Link
        to={`/buscar?categoria=${category.id}`}
        className="flex flex-col items-center gap-2 p-3 rounded-lg bg-card shadow-card hover:shadow-card-hover transition-all duration-200 group"
      >
        <div className={`flex items-center justify-center w-12 h-12 rounded-xl ${colors} group-hover:scale-105 transition-transform`}>
          <Icon size={22} />
        </div>
        <span className="text-xs font-medium text-foreground text-center leading-tight">
          {category.name}
        </span>
      </Link>
    );
  }

  return (
    <Link
      to={`/buscar?categoria=${category.id}`}
      className="flex items-center gap-4 w-full p-4 rounded-lg bg-card shadow-card hover:shadow-card-hover transition-all duration-200 group"
    >
      <div className={`flex items-center justify-center w-12 h-12 rounded-xl ${colors} group-hover:scale-105 transition-transform`}>
        <Icon size={22} />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-display text-sm uppercase tracking-tight text-foreground">
          {category.name}
        </h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          {category.count} profissionais
        </p>
      </div>
      <span className="text-muted-foreground group-hover:text-primary transition-colors">→</span>
    </Link>
  );
};

export default CategoryButton;
