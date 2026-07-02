import { RecommendationCardView } from "@/components/RecommendationCard";
import type { RecommendationCard } from "@/types";

interface RecommendationGridProps {
  cards: RecommendationCard[];
  title?: string;
}

export function RecommendationGrid({ cards, title }: RecommendationGridProps) {
  if (!cards.length) return null;

  return (
    <section className="w-full">
      {title && (
        <h3 className="mb-2 text-xs font-bold uppercase tracking-widest text-spotify-subtext">
          {title}
        </h3>
      )}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {cards.map((card, index) => (
          <RecommendationCardView key={card.candidate.song.id} card={card} compact index={index} />
        ))}
      </div>
    </section>
  );
}
