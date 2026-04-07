import { Star } from "lucide-react";
import type { Review } from "@/data/mock";

interface ReviewItemProps {
  review: Review;
}

const ReviewItem = ({ review }: ReviewItemProps) => {
  return (
<<<<<<< HEAD
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
=======
    <div className="border-t-2 border-border py-4">
      <div className="flex items-center justify-between mb-1">
        <span className="font-display text-sm uppercase text-foreground">
          {review.clientName}
        </span>
        <div className="flex items-center gap-0.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              size={12}
              className={i < review.rating ? "text-primary" : "text-border"}
              fill={i < review.rating ? "currentColor" : "none"}
            />
          ))}
        </div>
      </div>
      <p className="text-xs text-muted-foreground uppercase font-display mb-2">
        {review.serviceDescription} — {new Date(review.date).toLocaleDateString("pt-BR")}
      </p>
      {review.rating === 5 && review.comment && (
        <p className="text-sm text-foreground leading-relaxed">
          {review.comment}
        </p>
>>>>>>> f38df2aedbfdd1c2343837c06db5bb59b8dcdb8a
      )}
    </div>
  );
};

export default ReviewItem;
