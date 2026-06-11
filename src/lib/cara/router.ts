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
      templateKeys: string[];
      followUps: string[];
    }
  | {
      source: "template";
      templateKey: string;
      text: string;
    }
  | {
      source: "ai";
      groundingTopicKey?: string;
    };

function renderTopic(t: KnowledgeTopic): string {
  const stepLines = t.steps.map((s, i) => `${i + 1}. ${s}`).join("\n");
  return `**${t.label}**\n\n${t.summary}\n\n**What to do, in order:**\n${stepLines}`;
}

const INTENT_WORDS = [
  "write", "draft", "create", "generate", "make", "send", "issue",
  "prepare", "letter for", "letter to", "fire", "dismiss", "terminate",
];

function matchTemplate(text: string): string | undefined {
  const k = text.toLowerCase();
  const wantsDoc = INTENT_WORDS.some((w) => k.includes(w));
  if (!wantsDoc) return undefined;
  // direct matches by name / key (longest match wins)
  let best: { key: string; score: number } | undefined;
  for (const t of TEMPLATE_REGISTRY) {
    const candidates = [t.key, t.name.toLowerCase()];
    for (const c of candidates) {
      if (k.includes(c)) {
        const score = c.length;
        if (!best || score > best.score) best = { key: t.key, score };
      }
    }
  }
  // fire / dismiss / terminate → dismissal letter
  if (!best && /\b(fire|dismiss|terminate)\b/.test(k)) {
    return "dismissal";
  }
  return best?.key;
}

// Indicators that the user wants more detail than the canned answer.
const QUESTION_INDICATORS = [
  "how long", "how many", "can i", "must i", "do i have to", "what if",
  "what happens", "is it legal", "am i allowed", "what does", "why",
];

export function routeMessage(text: string): CaraAnswer {
  const lower = text.trim().toLowerCase();

  // 1. Document intent wins outright ("draft a warning for John") — user is asking us to MAKE something.
  const templateKey = matchTemplate(text);
  if (templateKey) {
    const def = TEMPLATE_REGISTRY.find((t) => t.key === templateKey)!;
    return {
      source: "template",
      templateKey,
      text: `I can build you a **${def.name}** right now — it uses your company branding and is saved to your Documents. Tap the button below to open the form.`,
    };
  }

  // 2. Topic match — always answer from the app brain first.
  const topic = findTopic(text);
  if (topic) {
    // If the user is asking a specific question on this topic, still show the
    // built-in answer, but the UI can offer "ask CARA for more detail" which
    // hits the AI grounded with this topic.
    const isQuestion = QUESTION_INDICATORS.some((q) => lower.includes(q));
    return {
      source: "knowledge",
      topic,
      text: renderTopic(topic) + (isQuestion ? "\n\n_Need more detail on your exact situation? Tap “Ask CARA for more detail” below._" : ""),
      templateKeys: topic.relatedTemplates ?? [],
      followUps: topic.followUps ?? [],
    };
  }

  // 3. Nothing matched. Let the AI handle it ungrounded.
  return { source: "ai" };
}
