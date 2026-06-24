import { NextResponse } from "next/server";
import { hasEliteAccess } from "@/lib/subscription";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_OCR_FILE_SIZE = 8 * 1024 * 1024;
const OCR_TIMEOUT_MS = 45_000;

type OcrWorker = {
  recognize: (image: Buffer) => Promise<{ data: { text: string } }>;
  setParameters?: (parameters: Record<string, string>) => Promise<unknown>;
};

const globalForOcr = globalThis as typeof globalThis & {
  tradioOcrWorker?: Promise<OcrWorker>;
};

async function getOcrWorker() {
  if (!globalForOcr.tradioOcrWorker) {
    globalForOcr.tradioOcrWorker = import("tesseract.js").then(
      async ({ createWorker, PSM }) => {
        const worker = (await createWorker("eng", 1, {
          cachePath: "/tmp/tradio-tesseract",
        })) as OcrWorker;

        await worker.setParameters?.({
          tessedit_pageseg_mode: PSM.SPARSE_TEXT,
        });

        return worker;
      },
    );
  }

  return globalForOcr.tradioOcrWorker;
}

async function withTimeout<T>(promise: Promise<T>) {
  let timeout: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timeout = setTimeout(
          () => reject(new Error("Receipt scan timed out.")),
          OCR_TIMEOUT_MS,
        );
      }),
    ]);
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
}

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
    const buffer = Buffer.from(await file.arrayBuffer());
    const worker = await withTimeout(getOcrWorker());
    const result = await withTimeout(worker.recognize(buffer));

    return NextResponse.json({ text: result.data.text.trim() });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error && error.message.includes("timed out")
            ? "Receipt scan timed out. Try once more; the scanner may still be warming up."
            : "Receipt scan failed. You can still enter the details manually.",
      },
      { status: 500 },
    );
  }
}
