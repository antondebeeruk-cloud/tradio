import { NextResponse } from "next/server";
import { hasEliteAccess } from "@/lib/subscription";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_OCR_FILE_SIZE = 8 * 1024 * 1024;

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan, role, subscription_status, trial_expires_at")
    .eq("id", user.id)
    .maybeSingle();

  if (!hasEliteAccess(profile)) {
    return NextResponse.json({ error: "Upgrade required" }, { status: 403 });
  }

  const formData = await request.formData();
  const file = formData.get("receipt_file");

  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "No receipt image found." }, { status: 400 });
  }

  if (file.size > MAX_OCR_FILE_SIZE) {
    return NextResponse.json(
      { error: "Receipt photo is too large. Use a file under 8MB." },
      { status: 400 },
    );
  }

  if (!file.type.startsWith("image/")) {
    return NextResponse.json(
      { error: "Only receipt photos can be scanned. PDFs can still be attached." },
      { status: 400 },
    );
  }

  try {
    const { recognize } = await import("tesseract.js");
    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await recognize(buffer, "eng");

    return NextResponse.json({ text: result.data.text.trim() });
  } catch {
    return NextResponse.json(
      { error: "Receipt scan failed. You can still enter the details manually." },
      { status: 500 },
    );
  }
}
