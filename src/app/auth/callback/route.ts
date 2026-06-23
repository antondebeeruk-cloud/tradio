import { createClient } from "@/lib/supabase/server";
import { generateLeadEmail } from "@/lib/lead-email";
import { NextResponse, type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const nextParam = requestUrl.searchParams.get("next") ?? "/dashboard";
  const next =
    nextParam.startsWith("/") && !nextParam.startsWith("//")
      ? nextParam
      : "/dashboard";

  if (code) {
    const supabase = createClient();
    await supabase.auth.exchangeCodeForSession(code);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const fullName =
        typeof user.user_metadata?.full_name === "string"
          ? user.user_metadata.full_name
          : "";
      const businessName =
        typeof user.user_metadata?.business_name === "string"
          ? user.user_metadata.business_name
          : "";
      const { data: profile } = await supabase
        .from("profiles")
        .select("lead_email_address")
        .eq("id", user.id)
        .maybeSingle();
      const leadEmail = profile?.lead_email_address
        ? {}
        : generateLeadEmail({
            businessName,
            email: user.email,
            fullName,
          });

      await supabase.from("profiles").upsert({
        id: user.id,
        business_name: businessName || null,
        full_name: fullName || null,
        updated_at: new Date().toISOString(),
        ...leadEmail,
      });
    }
  }

  return NextResponse.redirect(new URL(next, request.url));
}
