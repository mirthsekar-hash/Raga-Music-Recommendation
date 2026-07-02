"use client";

import { useEffect, useState } from "react";

interface TypewriterTextProps {
  text: string;
  className?: string;
  speedMs?: number;
}

export function TypewriterText({ text, className = "", speedMs = 12 }: TypewriterTextProps) {
  const [visible, setVisible] = useState("");

  useEffect(() => {
    setVisible("");
    if (!text) return;

    let index = 0;
    const timer = window.setInterval(() => {
      index += 1;
      setVisible(text.slice(0, index));
      if (index >= text.length) {
        window.clearInterval(timer);
      }
    }, speedMs);

    return () => window.clearInterval(timer);
  }, [text, speedMs]);

  return <span className={className}>{visible}</span>;
}
