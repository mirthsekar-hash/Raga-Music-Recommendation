import type { HTMLAttributes } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  interactive?: boolean;
}

export function Card({ interactive = false, className = "", children, ...props }: CardProps) {
  return (
    <div
      className={`rounded-lg bg-spotify-highlight/80 p-4 ${
        interactive
          ? "cursor-pointer transition hover:bg-spotify-highlight hover:shadow-card"
          : ""
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
