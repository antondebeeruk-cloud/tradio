import { createPersonalClient } from "@/lib/supabase/server";
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
    const supabase = await createPersonalClient();
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      const errorUrl = new URL(next === "/reset-password" ? "/forgot-password" : "/login", request.url);
      errorUrl.searchParams.set("message", "This email link is invalid or has expired. Please request a new one.");
      return NextResponse.redirect(errorUrl);
    }

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
        .select("id, lead_email_address")
        .eq("id", user.id)
        .maybeSingle();
      const leadEmail = profile?.lead_email_address
        ? {}
        : generateLeadEmail({
            businessName,
            email: user.email,
            fullName,
          });

      if (profile) {
        if (!profile.lead_email_address) {
          await supabase.from("profiles").update({ ...leadEmail, updated_at: new Date().toISOString() }).eq("id", user.id);
        }
      } else {
        await supabase.from("profiles").insert({ id: user.id, business_name: businessName || null, full_name: fullName || null, ...leadEmail });
      }
    }
  }

  return NextResponse.redirect(new URL(next, request.url));
}
