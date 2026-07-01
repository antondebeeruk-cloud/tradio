"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { sendEmailWithPdf } from "@/lib/email";
import { createDocumentPdf } from "@/lib/pdf";
import { hasProAccess } from "@/lib/subscription";
import { createClient } from "@/lib/supabase/server";

const statuses = new Set(["draft", "sent", "partially_received", "received", "cancelled"]);

function value(formData: FormData, key: string) {
  const entry = formData.get(key);
  return typeof entry === "string" ? entry.trim() : "";
}

function numberValue(entry: FormDataEntryValue | null) {
  const number = Number(entry ?? 0);
  return Number.isFinite(number) ? Math.max(number, 0) : 0;
}

function orderRedirect(message: string): never {
  redirect(`/dashboard/purchase-orders?message=${encodeURIComponent(message)}`);
}

async function requireProUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirectedFrom=/dashboard/purchase-orders");
  const { data: profile } = await supabase
    .from("profiles")
    .select("plan, subscription_status, trial_expires_at")
    .eq("id", user.id)
    .maybeSingle();
  if (!hasProAccess(profile)) redirect("/pricing?message=Purchase Orders are available on Tradio Pro and Elite.");
  return { profile, supabase, user };
}

export async function createSupplier(formData: FormData) {
  const { supabase, user } = await requireProUser();
  const name = value(formData, "name");
  if (!name) orderRedirect("Supplier name is required.");
  const { error } = await supabase.from("suppliers").insert({
    address: value(formData, "address") || null,
    contact_name: value(formData, "contact_name") || null,
    email: value(formData, "email") || null,
    name,
    phone: value(formData, "phone") || null,
    user_id: user.id,
  });
  if (error) orderRedirect(error.message);
  revalidatePath("/dashboard/purchase-orders");
  orderRedirect("Supplier saved.");
}

export async function deleteSupplier(formData: FormData) {
  const { supabase, user } = await requireProUser();
  const { error } = await supabase.from("suppliers").delete().eq("id", value(formData, "id")).eq("user_id", user.id);
  if (error) orderRedirect(error.message.includes("foreign key") ? "This supplier has purchase orders and cannot be deleted." : error.message);
  revalidatePath("/dashboard/purchase-orders");
  orderRedirect("Supplier deleted.");
}

export async function createPurchaseOrder(formData: FormData) {
  const { supabase, user } = await requireProUser();
  const supplierId = value(formData, "supplier_id");
  const descriptions = formData.getAll("item_description").map(String);
  const quantities = formData.getAll("item_quantity");
  const unitCosts = formData.getAll("item_unit_cost");
  const vatRates = formData.getAll("item_vat_rate");
  const items = descriptions.map((description, index) => {
    const quantity = numberValue(quantities[index]);
    const unitCost = numberValue(unitCosts[index]);
    const vatRate = numberValue(vatRates[index]);
    const lineSubtotal = Math.round(quantity * unitCost * 100) / 100;
    const vatAmount = Math.round(lineSubtotal * vatRate) / 100;
    return { description: description.trim(), lineSubtotal, quantity, unitCost, vatAmount, vatRate };
  }).filter((item) => item.description && item.quantity > 0);
  if (!supplierId || !items.length) orderRedirect("Choose a supplier and add at least one valid item.");

  const subtotal = items.reduce((sum, item) => sum + item.lineSubtotal, 0);
  const vatAmount = items.reduce((sum, item) => sum + item.vatAmount, 0);
  const number = `PO-${new Date().getFullYear()}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
  const { data: order, error } = await supabase.from("purchase_orders").insert({
    expected_date: value(formData, "expected_date") || null,
    job_id: value(formData, "job_id") || null,
    notes: value(formData, "notes") || null,
    order_date: value(formData, "order_date") || new Date().toISOString().slice(0, 10),
    purchase_order_number: number,
    status: "draft",
    subtotal,
    supplier_id: supplierId,
    total: subtotal + vatAmount,
    user_id: user.id,
    vat_amount: vatAmount,
  }).select("id").single();
  if (error || !order) orderRedirect(error?.message ?? "Purchase order could not be created.");

  const { error: itemsError } = await supabase.from("purchase_order_items").insert(items.map((item, index) => ({
    description: item.description,
    line_subtotal: item.lineSubtotal,
    line_total: item.lineSubtotal + item.vatAmount,
    purchase_order_id: order.id,
    quantity: item.quantity,
    sort_order: index,
    unit_cost: item.unitCost,
    user_id: user.id,
    vat_amount: item.vatAmount,
    vat_rate: item.vatRate,
  })));
  if (itemsError) {
    await supabase.from("purchase_orders").delete().eq("id", order.id);
    orderRedirect(itemsError.message);
  }
  revalidatePath("/dashboard/purchase-orders");
  orderRedirect(`${number} created.`);
}

export async function updatePurchaseOrderStatus(formData: FormData) {
  const { supabase, user } = await requireProUser();
  const id = value(formData, "id");
  const status = value(formData, "status");
  if (!statuses.has(status)) orderRedirect("Invalid purchase order status.");
  const { data: order } = await supabase.from("purchase_orders").select("id, job_id, supplier_id, purchase_order_number, suppliers(name)").eq("id", id).eq("user_id", user.id).maybeSingle();
  if (!order) orderRedirect("Purchase order not found.");

  if (status === "received" && order.job_id) {
    const { data: items } = await supabase.from("purchase_order_items").select("id, description, quantity, unit_cost, line_subtotal, vat_rate, vat_amount, line_total").eq("purchase_order_id", id).eq("user_id", user.id);
    const supplier = Array.isArray(order.suppliers) ? order.suppliers[0] : order.suppliers;
    if (items?.length) {
      const { data: existingCosts } = await supabase
        .from("job_costs")
        .select("source_purchase_order_item_id")
        .in("source_purchase_order_item_id", items.map((item) => item.id));
      const existingItemIds = new Set(
        (existingCosts ?? []).map((cost) => cost.source_purchase_order_item_id),
      );
      const newCosts = items.filter((item) => !existingItemIds.has(item.id)).map((item) => ({
        category: "materials",
        cost_type: "supplier_invoice",
        description: item.description,
        document_reference: order.purchase_order_number,
        job_id: order.job_id,
        purchase_date: new Date().toISOString().slice(0, 10),
        purchase_type: "product",
        quantity: item.quantity,
        source_purchase_order_item_id: item.id,
        subtotal: item.line_subtotal,
        supplier_name: supplier?.name ?? null,
        total: item.line_total,
        unit_cost: item.unit_cost,
        user_id: user.id,
        vat_amount: item.vat_amount,
        vat_rate: item.vat_rate,
      }));
      if (newCosts.length) {
        const { error: costError } = await supabase.from("job_costs").insert(newCosts);
        if (costError) orderRedirect(costError.message);
      }
      await Promise.all(
        items.map((item) =>
          supabase
            .from("purchase_order_items")
            .update({ quantity_received: item.quantity })
            .eq("id", item.id)
            .eq("user_id", user.id),
        ),
      );
    }
  }

  const { error } = await supabase.from("purchase_orders").update({ received_at: status === "received" ? new Date().toISOString() : null, status }).eq("id", id).eq("user_id", user.id);
  if (error) orderRedirect(error.message);
  revalidatePath("/dashboard/purchase-orders");
  revalidatePath("/dashboard/jobs");
  revalidatePath("/dashboard/reports");
  orderRedirect(`Purchase order marked ${status.replaceAll("_", " ")}.`);
}

export async function emailPurchaseOrder(formData: FormData) {
  const { supabase, user } = await requireProUser();
  const id = value(formData, "id");
  const { data: order } = await supabase.from("purchase_orders").select("*, suppliers(name,email)").eq("id", id).eq("user_id", user.id).maybeSingle();
  if (!order) orderRedirect("Purchase order not found.");
  const supplier = Array.isArray(order.suppliers) ? order.suppliers[0] : order.suppliers;
  if (!supplier?.email) orderRedirect("Add an email address to this supplier first.");
  const [{ data: items }, { data: profile }] = await Promise.all([
    supabase.from("purchase_order_items").select("description, quantity, unit_cost, line_total").eq("purchase_order_id", id).order("sort_order"),
    supabase.from("profiles").select("business_name, trade, phone, business_address_line_1, business_address_line_2, business_town, business_postcode, vat_number").eq("id", user.id).maybeSingle(),
  ]);
  const pdf = createDocumentPdf({ businessProfile: profile, customerName: supplier.name, documentLabel: "Purchase Order", documentNumber: order.purchase_order_number, dueDate: order.expected_date, issueDate: order.order_date, items: (items ?? []).map((item) => ({ ...item, unit_price: item.unit_cost })), status: order.status, subtotal: order.subtotal, total: order.total, vatAmount: order.vat_amount, vatRate: null });
  try {
    await sendEmailWithPdf({ attachment: pdf, filename: `${order.purchase_order_number}.pdf`, html: `<p>Please find purchase order ${order.purchase_order_number} attached.</p>`, subject: `Purchase order ${order.purchase_order_number}`, text: `Please find purchase order ${order.purchase_order_number} attached.`, to: supplier.email });
  } catch (error) { orderRedirect(error instanceof Error ? error.message : "Email could not be sent."); }
  await supabase.from("purchase_orders").update({ status: order.status === "draft" ? "sent" : order.status }).eq("id", id).eq("user_id", user.id);
  revalidatePath("/dashboard/purchase-orders");
  orderRedirect("Purchase order emailed.");
}
