import { Badge } from "@/components/ui/Badge";
import { TRENDING_BUZZ_THRESHOLD } from "@/lib/scoring/trending";
import type { MatchedSignals } from "@/types";

interface DiscoveryBadgesProps {
  signals: MatchedSignals;
  className?: string;
}

function isTrending(signals: MatchedSignals): boolean {
  if (typeof signals.isTrending === "boolean") return signals.isTrending;
  return (
    !signals.isHiddenGem && signals.communityBuzzScore >= TRENDING_BUZZ_THRESHOLD
  );
}

export function DiscoveryBadges({ signals, className = "" }: DiscoveryBadgesProps) {
  const trending = isTrending(signals);
  const hasBadge = trending || signals.isHiddenGem || signals.isEmergingArtist;
  if (!hasBadge) return null;

  return (
    <div className={`flex flex-wrap gap-1 ${className}`}>
      {trending && <Badge variant="trending">Trending</Badge>}
      {signals.isHiddenGem && <Badge variant="gem">Hidden Gem</Badge>}
      {signals.isEmergingArtist && <Badge variant="emerging">Emerging</Badge>}
    </div>
  );
}

export function discoverySubtitle(signals: MatchedSignals): string {
  if (isTrending(signals)) return "Trending";
  if (signals.isHiddenGem) return "Hidden gem";
  if (signals.isEmergingArtist) return "Emerging artist";
  return "Discovery";
}
