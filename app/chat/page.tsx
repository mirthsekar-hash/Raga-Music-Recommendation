import { Suspense } from "react";
import { ChatWindow } from "@/components/ChatWindow";
import { ChatLoadingSkeleton } from "@/components/ui/Skeleton";

export default function ChatPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-spotify-black">
          <ChatLoadingSkeleton />
        </div>
      }
    >
      <ChatWindow />
    </Suspense>
  );
}
