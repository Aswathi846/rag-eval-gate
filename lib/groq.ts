/**
 * Talks to the Groq API.
 *
 * Groq speaks the same language as the OpenAI API, so this is a plain HTTP
 * request. No special library is needed and you can read exactly what is
 * being sent.
 */

import { MODEL, TEMPERATURE } from "@/config";

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

export class GroqError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "GroqError";
    this.status = status;
  }
}

export async function askGroq(messages: ChatMessage[]): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    throw new GroqError(
      "GROQ_API_KEY is not set. Add it in Vercel under Settings, Environment Variables.",
      500
    );
  }

  const response = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      temperature: TEMPERATURE,
      messages,
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new GroqError(
      `Groq returned ${response.status}. ${detail.slice(0, 300)}`,
      response.status
    );
  }

  const data = await response.json();
  const reply = data?.choices?.[0]?.message?.content;

  if (typeof reply !== "string" || reply.trim() === "") {
    throw new GroqError("Groq returned an empty answer.", 502);
  }

  return reply.trim();
}
