import { Star } from "lucide-react";
import type { Review } from "@/data/mock";

interface ReviewItemProps {
  review: Review;
}

const ReviewItem = ({ review }: ReviewItemProps) => {
  return (
    <div className="border-t border-border/40 py-6 last:pb-8">
      <div className="flex items-center justify-between mb-3">
        <span className="font-display font-black text-xs uppercase tracking-widest text-foreground">
          CLIENTE: {review.clientName.toUpperCase()}
        </span>
        <div className="flex items-center gap-1 bg-secondary/20 px-2 py-0.5 border border-border">
          <Star size={10} className="text-primary" fill="currentColor" />
          <span className="text-[10px] font-black text-foreground">{review.rating.toFixed(1)}</span>
        </div>
      </div>
      <p className="text-[9px] font-black uppercase tracking-[0.2em] text-primary mb-3">
        SERVIÇO: {review.serviceDescription.toUpperCase()} // DATA: {new Date(review.date).toLocaleDateString("pt-BR")}
      </p>
      {review.comment && (
        <div className="bg-secondary/5 border-l-2 border-primary p-4">
          <p className="text-xs text-foreground leading-relaxed uppercase font-medium opacity-90">
            "{review.comment}"
          </p>
        </div>
      )}
    </div>
  );
};

export default ReviewItem;
