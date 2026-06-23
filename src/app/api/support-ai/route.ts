import { NextResponse, type NextRequest } from "next/server";
import { getBuiltInSupportAnswer } from "@/lib/support-knowledge";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type SupportMessage = {
  content: string;
  role: "assistant" | "user";
};

const supportSystemPrompt = `
You are Tradio Support AI, a friendly support assistant for Tradio, a SaaS app for UK tradespeople.

Help users understand how to use Tradio features:
- customers
- quotes
- quote statuses: draft, sent, accepted, rejected
- invoices: unpaid, paid, overdue
- PDF export and emailing PDFs to customers
- lead email inbox and mailbox sync
- jobs and reports for Elite users
- account, subscription, cookie, privacy, and settings pages
- admin support access for admin users

Rules:
- Keep answers short, practical, and step-by-step.
- If the user asks about a bug, ask for the exact page and error message if needed.
- Do not claim Tradio is legally or tax compliant.
- Do not provide legal, tax, medical, or financial advice.
- If the user asks for account-specific billing changes, tell them to use the Account page or contact support.
- Never ask for passwords, API keys, PayPal secrets, Supabase service role keys, or mailbox passwords.
`;

function isSupportMessage(value: unknown): value is SupportMessage {
  if (!value || typeof value !== "object") {
    return false;
  }

  const message = value as Partial<SupportMessage>;
  return (
    (message.role === "assistant" || message.role === "user") &&
    typeof message.content === "string" &&
    message.content.trim().length > 0
  );
}

function extractResponseText(data: any) {
  if (typeof data.output_text === "string" && data.output_text.trim()) {
    return data.output_text.trim();
  }

  const output = Array.isArray(data.output) ? data.output : [];
  const textParts: string[] = [];

  for (const item of output) {
    const content = Array.isArray(item?.content) ? item.content : [];

    for (const part of content) {
      if (typeof part?.text === "string") {
        textParts.push(part.text);
      }
    }
  }

  return textParts.join("\n").trim();
}

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Login required." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const messages: SupportMessage[] = Array.isArray(body?.messages)
    ? body.messages.filter(isSupportMessage).slice(-10)
    : [];

  if (messages.length === 0) {
    return NextResponse.json(
      { error: "Please enter a support question." },
      { status: 400 },
    );
  }

  const latestQuestion = [...messages]
    .reverse()
    .find((message) => message.role === "user")?.content;
  const builtInAnswer = getBuiltInSupportAnswer(latestQuestion ?? messages[0].content);
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey || process.env.SUPPORT_AI_PROVIDER === "builtin") {
    return NextResponse.json({
      answer: builtInAnswer.answer,
      source: "built-in",
    });
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    body: JSON.stringify({
      input: [
        {
          content: supportSystemPrompt,
          role: "system",
        },
        ...messages.map((message) => ({
          content: message.content.slice(0, 1800),
          role: message.role,
        })),
      ],
      max_output_tokens: 700,
      model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
    }),
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const errorMessage = data?.error?.message || "";
    const isQuotaError =
      response.status === 429 ||
      errorMessage.toLowerCase().includes("quota") ||
      errorMessage.toLowerCase().includes("billing");

    if (isQuotaError) {
      return NextResponse.json({
        answer: `${builtInAnswer.answer}\n\nSupport AI is using Tradio's free built-in help right now because the connected AI quota is unavailable.`,
        source: "built-in",
      });
    }

    return NextResponse.json({
      answer: builtInAnswer.answer,
      source: "built-in",
    });
  }

  const answer = extractResponseText(data);

  return NextResponse.json({
    answer:
      answer ||
      "I could not produce an answer that time. Please try asking again.",
  });
}
