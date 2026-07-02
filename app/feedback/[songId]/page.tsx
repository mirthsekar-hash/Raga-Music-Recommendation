import { FeedbackScreen } from "@/components/screens/FeedbackScreen";

interface PageProps {
  params: Promise<{ songId: string }>;
}

export default async function FeedbackPage({ params }: PageProps) {
  const { songId } = await params;
  return <FeedbackScreen songId={songId} />;
}
