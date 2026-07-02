interface ChatBubbleProps {
  role: "user" | "assistant";
  children: React.ReactNode;
}

export function ChatBubble({ role, children }: ChatBubbleProps) {
  const isUser = role === "user";

  return (
    <div className={`flex w-full ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[min(100%,42rem)] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
          isUser
            ? "bg-spotify-green text-black rounded-br-md"
            : "bg-spotify-highlight text-white rounded-bl-md"
        }`}
      >
        {children}
      </div>
    </div>
  );
}
