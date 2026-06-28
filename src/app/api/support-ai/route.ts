import { NextResponse, type NextRequest } from "next/server";
import { getBuiltInSupportAnswer } from "@/lib/support-knowledge";
import { createClient } from "@/lib/supabase/server";
import { hasEliteAccess } from "@/lib/subscription";

export const runtime = "nodejs";

type SupportMessage = {
  content: string;
  role: "assistant" | "user";
};

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

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Login required." }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan, subscription_status, trial_expires_at")
    .eq("id", user.id)
    .maybeSingle();

  if (!hasEliteAccess(profile)) {
    return NextResponse.json(
      { error: "Support AI is available on Tradio Elite." },
      { status: 403 },
    );
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
  const builtInAnswer = getBuiltInSupportAnswer(
    latestQuestion ?? messages[0].content,
  );

  return NextResponse.json({
    answer: builtInAnswer.answer,
    source: "built-in",
  });
}
