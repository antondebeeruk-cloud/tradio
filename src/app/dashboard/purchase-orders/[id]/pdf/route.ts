import { NextResponse } from "next/server";
import { createDocumentPdf } from "@/lib/pdf";
import { hasProAccess } from "@/lib/subscription";
import { createClient } from "@/lib/supabase/server";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", _request.url));
  const [{ data: profile }, { data: order }] = await Promise.all([
    supabase.from("profiles").select("business_name,trade,phone,business_address_line_1,business_address_line_2,business_town,business_postcode,vat_number,plan,subscription_status,trial_expires_at").eq("id", user.id).maybeSingle(),
    supabase.from("purchase_orders").select("*,suppliers(name)").eq("id", id).eq("user_id", user.id).maybeSingle(),
  ]);
  if (!hasProAccess(profile) || !order) return NextResponse.redirect(new URL("/dashboard/purchase-orders?message=Purchase+order+not+found", _request.url));
  const { data: items } = await supabase.from("purchase_order_items").select("description,quantity,unit_cost,line_total").eq("purchase_order_id", id).eq("user_id", user.id).order("sort_order");
  const supplier = Array.isArray(order.suppliers) ? order.suppliers[0] : order.suppliers;
  const pdf = createDocumentPdf({ businessProfile: profile, customerName: supplier?.name ?? "Supplier", documentLabel: "Purchase Order", documentNumber: order.purchase_order_number, dueDate: order.expected_date, issueDate: order.order_date, items: (items ?? []).map((item) => ({ ...item, unit_price: item.unit_cost })), status: order.status, subtotal: order.subtotal, total: order.total, vatAmount: order.vat_amount, vatRate: null });
  return new NextResponse(new Uint8Array(pdf), { headers: { "Content-Disposition": `attachment; filename="${order.purchase_order_number}.pdf"`, "Content-Type": "application/pdf" } });
}
