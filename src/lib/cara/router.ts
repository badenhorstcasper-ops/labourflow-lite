// Decides whether a user message can be answered from CARA's built-in
// knowledge / templates, or whether it needs to fall back to the AI edge
// function. Built-in always wins so we don't spend AI credits unnecessarily.

import { TEMPLATE_REGISTRY } from "@/lib/documents/templates";
import { findTopic, type KnowledgeTopic } from "./knowledge";

export type CaraAnswer =
  | {
      source: "knowledge";
      topic: KnowledgeTopic;
      text: string;
    }
  | {
      source: "template";
      templateKey: string;
      text: string;
    }
  | {
      source: "ai";
    };

function renderTopic(t: KnowledgeTopic): string {
  const stepLines = t.steps.map((s, i) => `${i + 1}. ${s}`).join("\n");
  return `**${t.label}**\n\n${t.summary}\n\n**What to do, in order:**\n${stepLines}`;
}

function matchTemplate(text: string): string | undefined {
  const k = text.toLowerCase();
  // Direct hints: "write me a warning", "draft a contract", "dismissal letter", "nda", etc.
  const intentWords = ["write", "draft", "create", "generate", "make", "letter for", "send a"];
  const wantsDoc = intentWords.some((w) => k.includes(w));
  for (const t of TEMPLATE_REGISTRY) {
    const nameHit = k.includes(t.key) || k.includes(t.name.toLowerCase());
    if (nameHit && wantsDoc) return t.key;
  }
  return undefined;
}

export function routeMessage(text: string): CaraAnswer {
  const topic = findTopic(text);
  if (topic) {
    return { source: "knowledge", topic, text: renderTopic(topic) };
  }
  const templateKey = matchTemplate(text);
  if (templateKey) {
    const def = TEMPLATE_REGISTRY.find((t) => t.key === templateKey)!;
    return {
      source: "template",
      templateKey,
      text: `I can build you a **${def.name}** right now — it uses your company branding and is saved to your Documents. Tap the button below to open the form.`,
    };
  }
  return { source: "ai" };
}
