import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Raga – AI Discovery Companion",
  description:
    "Discover hidden gems, emerging artists, and music you'll love — guided by AI and cultural discovery signals.",
  openGraph: {
    title: "Raga – AI Discovery Companion",
    description:
      "Conversational music discovery with personalized recommendations and cultural discovery signals.",
    type: "website",
    siteName: "Raga",
  },
  twitter: {
    card: "summary_large_image",
    title: "Raga – AI Discovery Companion",
    description:
      "Discover hidden gems and emerging artists with an AI-powered music companion.",
  },
};

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
