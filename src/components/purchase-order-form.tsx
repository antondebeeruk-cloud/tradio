"use client";

import { Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

type Option = { id: string; name?: string; title?: string };
type Item = { id: number; description: string; quantity: string; unitCost: string; vatRate: string };

export function PurchaseOrderForm({ action, jobs, suppliers }: { action: (formData: FormData) => Promise<void>; jobs: Option[]; suppliers: Option[] }) {
  const [items, setItems] = useState<Item[]>([{ id: 1, description: "", quantity: "1", unitCost: "0", vatRate: "20" }]);
  const totals = useMemo(() => items.reduce((total, item) => {
    const subtotal = Math.max(Number(item.quantity) || 0, 0) * Math.max(Number(item.unitCost) || 0, 0);
    return { subtotal: total.subtotal + subtotal, vat: total.vat + subtotal * Math.max(Number(item.vatRate) || 0, 0) / 100 };
  }, { subtotal: 0, vat: 0 }), [items]);
  const update = (id: number, changes: Partial<Item>) => setItems((current) => current.map((item) => item.id === id ? { ...item, ...changes } : item));

  return (
    <form action={action} className="space-y-5">
      <section className="surface-pad grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <div><label className="text-sm font-medium">Supplier</label><select className="field-control" name="supplier_id" required><option value="">Choose supplier</option>{suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}</select></div>
        <div><label className="text-sm font-medium">Job</label><select className="field-control" name="job_id"><option value="">No job linked</option>{jobs.map((job) => <option key={job.id} value={job.id}>{job.title}</option>)}</select></div>
        <div><label className="text-sm font-medium">Order date</label><input className="field-control" defaultValue={new Date().toISOString().slice(0, 10)} name="order_date" type="date" /></div>
        <div><label className="text-sm font-medium">Expected date</label><input className="field-control" name="expected_date" type="date" /></div>
        <div className="md:col-span-2 xl:col-span-4"><label className="text-sm font-medium">Notes</label><textarea className="field-control min-h-20" name="notes" /></div>
      </section>
      <section className="surface overflow-hidden">
        <div className="flex items-center justify-between border-b border-field px-5 py-4"><div><h2 className="font-semibold">Order items</h2><p className="mt-1 text-sm text-slate-500">Products, materials or supplier services.</p></div><button className="btn-secondary" onClick={() => setItems((current) => [...current, { id: Date.now(), description: "", quantity: "1", unitCost: "0", vatRate: "20" }])} type="button"><Plus size={16} /> Add item</button></div>
        <div className="divide-y divide-field">{items.map((item) => <div className="grid gap-4 px-5 py-4 md:grid-cols-[1fr_110px_140px_110px_auto] md:items-end" key={item.id}>
          <div><label className="text-sm font-medium">Description</label><input className="field-control" name="item_description" onChange={(event) => update(item.id, { description: event.target.value })} required value={item.description} /></div>
          <div><label className="text-sm font-medium">Quantity</label><input className="field-control" min="0.01" name="item_quantity" onChange={(event) => update(item.id, { quantity: event.target.value })} step="0.01" type="number" value={item.quantity} /></div>
          <div><label className="text-sm font-medium">Unit cost</label><input className="field-control" min="0" name="item_unit_cost" onChange={(event) => update(item.id, { unitCost: event.target.value })} step="0.01" type="number" value={item.unitCost} /></div>
          <div><label className="text-sm font-medium">VAT %</label><input className="field-control" min="0" name="item_vat_rate" onChange={(event) => update(item.id, { vatRate: event.target.value })} step="0.01" type="number" value={item.vatRate} /></div>
          <button aria-label="Remove item" className="btn-secondary" disabled={items.length === 1} onClick={() => setItems((current) => current.filter((entry) => entry.id !== item.id))} type="button"><Trash2 size={16} /></button>
        </div>)}</div>
        <div className="border-t border-field bg-mist px-5 py-4 text-right"><p className="text-sm text-slate-500">Subtotal £{totals.subtotal.toFixed(2)} · VAT £{totals.vat.toFixed(2)}</p><p className="mt-1 text-xl font-semibold">Total £{(totals.subtotal + totals.vat).toFixed(2)}</p></div>
      </section>
      <button className="btn-accent"><Plus size={17} /> Create purchase order</button>
    </form>
  );
}
