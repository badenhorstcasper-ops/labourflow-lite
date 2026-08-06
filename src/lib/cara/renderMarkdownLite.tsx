import React from "react";

/**
 * Turns CARA's simple formatting (**bold**, links, line breaks) into readable
 * text. Shared so the guest screens read exactly like the real chat.
 */
export function renderMarkdownLite(text: string) {
  const lines = text.split("\n");
  const tokenRe = /(\*\*[^*]+\*\*|\[[^\]]+\]\(https?:\/\/[^\s)]+\))/g;
  return lines.map((line, i) => (
    <div key={i}>
      {line.split(tokenRe).map((part, j) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return <strong key={j}>{part.slice(2, -2)}</strong>;
        }
        const linkMatch = /^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/.exec(part);
        if (linkMatch) {
          return (
            <a
              key={j}
              href={linkMatch[2]}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline hover:opacity-80 break-all"
            >
              {linkMatch[1]}
            </a>
          );
        }
        return <span key={j}>{part}</span>;
      })}
      {line === "" ? <span>&nbsp;</span> : null}
    </div>
  ));
}
