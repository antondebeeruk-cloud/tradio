import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const [
    profile,
    customers,
    quotes,
    quoteItems,
    invoices,
    invoiceItems,
    jobs,
  ] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    supabase.from("customers").select("*").eq("user_id", user.id),
    supabase.from("quotes").select("*").eq("user_id", user.id),
    supabase.from("quote_items").select("*").eq("user_id", user.id),
    supabase.from("invoices").select("*").eq("user_id", user.id),
    supabase.from("invoice_items").select("*").eq("user_id", user.id),
    supabase.from("jobs").select("*").eq("user_id", user.id),
  ]);

  const firstError =
    profile.error ??
    customers.error ??
    quotes.error ??
    quoteItems.error ??
    invoices.error ??
    invoiceItems.error ??
    jobs.error;

  if (firstError) {
    return NextResponse.json({ error: firstError.message }, { status: 500 });
  }

  const exportBody = {
    exported_at: new Date().toISOString(),
    user: {
      email: user.email,
      id: user.id,
    },
    profile: profile.data,
    customers: customers.data ?? [],
    quotes: quotes.data ?? [],
    quote_items: quoteItems.data ?? [],
    invoices: invoices.data ?? [],
    invoice_items: invoiceItems.data ?? [],
    jobs: jobs.data ?? [],
  };

  return new NextResponse(JSON.stringify(exportBody, null, 2), {
    headers: {
      "Content-Disposition": 'attachment; filename="tradio-data-export.json"',
      "Content-Type": "application/json",
    },
  });
}
