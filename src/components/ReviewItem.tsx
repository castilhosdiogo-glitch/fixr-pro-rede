import { Star } from "lucide-react";
import type { Review } from "@/data/mock";

interface ReviewItemProps {
  review: Review;
}

const ReviewItem = ({ review }: ReviewItemProps) => {
  return (
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
      <p className="text-sm text-foreground leading-relaxed">
        {review.comment}
      </p>
    </div>
  );
};

export default ReviewItem;
