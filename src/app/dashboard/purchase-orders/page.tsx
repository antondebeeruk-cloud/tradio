import { Download, Mail, PackageCheck, Plus, Store, Trash2 } from "lucide-react";
import { redirect } from "next/navigation";
import { createPurchaseOrder, createSupplier, deleteSupplier, emailPurchaseOrder, updatePurchaseOrderStatus } from "@/app/dashboard/purchase-orders/actions";
import { AppShell } from "@/components/app-shell";
import { PurchaseOrderForm } from "@/components/purchase-order-form";
import { currency, formatDate } from "@/lib/documents";
import { hasProAccess } from "@/lib/subscription";
import { createClient } from "@/lib/supabase/server";

export default async function PurchaseOrdersPage({ searchParams }: { searchParams: Promise<{ message?: string }> }) {
  const search = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirectedFrom=/dashboard/purchase-orders");
  const [{ data: profile }, suppliersResult, jobsResult, ordersResult] = await Promise.all([
    supabase.from("profiles").select("plan,subscription_status,trial_expires_at").eq("id", user.id).maybeSingle(),
    supabase.from("suppliers").select("id,name,contact_name,email,phone").eq("user_id", user.id).order("name"),
    supabase.from("jobs").select("id,title").eq("user_id", user.id).order("created_at", { ascending: false }),
    supabase.from("purchase_orders").select("id,purchase_order_number,status,order_date,expected_date,total,job_id,suppliers(name,email),jobs(title)").eq("user_id", user.id).order("created_at", { ascending: false }),
  ]);
  if (!hasProAccess(profile)) redirect("/pricing?message=Purchase Orders are available on Tradio Pro and Elite.");
  const error = suppliersResult.error ?? jobsResult.error ?? ordersResult.error;
  if (error) redirect(`/dashboard?message=${encodeURIComponent(error.message)}`);
  const suppliers = suppliersResult.data ?? [];
  const orders = ordersResult.data ?? [];

  return <AppShell active="purchase-orders" plan={profile?.plan}>
    <header className="app-page-header"><div><p className="eyebrow">Pro purchasing</p><h1 className="page-title">Suppliers and purchase orders.</h1></div></header>
    <div className="app-page-body space-y-6">
      {search.message ? <p className="notice">{search.message}</p> : null}
      <section className="surface-pad"><div className="mb-5 flex items-center gap-3"><Store className="text-copper" size={21} /><div><h2 className="font-semibold">Suppliers</h2><p className="text-sm text-slate-500">Save supplier contacts before creating an order.</p></div></div>
        <form action={createSupplier} className="grid gap-4 md:grid-cols-2 xl:grid-cols-6"><input className="field-control" name="name" placeholder="Supplier name" required /><input className="field-control" name="contact_name" placeholder="Contact name" /><input className="field-control" name="email" placeholder="Email" type="email" /><input className="field-control" name="phone" placeholder="Phone" /><input className="field-control" name="address" placeholder="Address" /><button className="btn-secondary"><Plus size={16} /> Save</button></form>
        <div className="mt-4 flex flex-wrap gap-2">{suppliers.map((supplier) => <div className="flex items-center gap-2 rounded-lg border border-field px-3 py-2 text-sm" key={supplier.id}><span className="font-semibold">{supplier.name}</span><form action={deleteSupplier}><input name="id" type="hidden" value={supplier.id} /><button aria-label={`Delete ${supplier.name}`} className="text-slate-400 hover:text-copper"><Trash2 size={14} /></button></form></div>)}</div>
      </section>
      {suppliers.length ? <PurchaseOrderForm action={createPurchaseOrder} jobs={jobsResult.data ?? []} suppliers={suppliers} /> : <p className="notice">Add a supplier to create your first purchase order.</p>}
      <section className="surface overflow-hidden"><div className="border-b border-field px-5 py-4"><h2 className="font-semibold">Purchase orders</h2></div><div className="divide-y divide-field">{orders.length ? orders.map((order) => { const supplier = Array.isArray(order.suppliers) ? order.suppliers[0] : order.suppliers; const job = Array.isArray(order.jobs) ? order.jobs[0] : order.jobs; return <article className="grid gap-4 px-5 py-5 xl:grid-cols-[1fr_auto] xl:items-center" key={order.id}><div><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold">{order.purchase_order_number}</h3><span className="status-pill bg-field text-forest">{order.status.replaceAll("_", " ")}</span></div><p className="mt-1 text-sm text-slate-600">{supplier?.name} · {formatDate(order.order_date)}{job?.title ? ` · ${job.title}` : ""}</p><p className="mt-2 font-semibold">{currency(order.total)}</p></div><div className="flex flex-wrap gap-2"><a className="btn-secondary" href={`/dashboard/purchase-orders/${order.id}/pdf`}><Download size={16} /> PDF</a><form action={emailPurchaseOrder}><input name="id" type="hidden" value={order.id} /><button className="btn-secondary"><Mail size={16} /> Email</button></form><form action={updatePurchaseOrderStatus} className="flex gap-2"><input name="id" type="hidden" value={order.id} /><select className="field-control mt-0 min-w-40" defaultValue={order.status} name="status"><option value="draft">Draft</option><option value="sent">Sent</option><option value="partially_received">Part received</option><option value="received">Received</option><option value="cancelled">Cancelled</option></select><button className="btn-primary"><PackageCheck size={16} /> Update</button></form></div></article>; }) : <p className="px-5 py-8 text-sm text-slate-500">No purchase orders yet.</p>}</div></section>
    </div>
  </AppShell>;
}
