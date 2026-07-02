"use client";

import { AlertTriangle, CheckCircle2, FileSpreadsheet, Upload } from "lucide-react";
import { useActionState } from "react";
import {
  importCustomers,
  previewCustomerImport,
} from "@/app/customers/import/actions";
import type { CustomerImportState } from "@/lib/customer-import";

const initialState: CustomerImportState = {};

function sourceLabel(source?: string) {
  if (source === "quickbooks") return "QuickBooks";
  if (source === "xero") return "Xero";
  if (source === "sage") return "Sage";
  return "CSV";
}

export function CustomerImporter({ message }: { message?: string }) {
  const [state, previewAction, pending] = useActionState(
    previewCustomerImport,
    initialState,
  );
  const rows = state.rows ?? [];
  const ready = rows.filter((row) => row.status === "ready");
  const duplicates = rows.filter((row) => row.status === "duplicate");
  const invalid = rows.filter((row) => row.status === "invalid");

  return (
    <div className="space-y-6">
      {message ? <p className="notice">{message}</p> : null}

      <section className="surface-pad">
        <div className="flex items-start gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-[#fff1e8] text-copper">
            <FileSpreadsheet aria-hidden="true" size={22} />
          </div>
          <div>
            <h2 className="font-semibold">Upload customer export</h2>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              Export customers or contacts as CSV from Sage, QuickBooks or Xero.
              Tradio will show a preview before saving anything.
            </p>
          </div>
        </div>

        <form action={previewAction} className="mt-6 grid gap-4 md:grid-cols-[0.7fr_1.3fr_auto] md:items-end">
          <label className="grid gap-2 text-sm font-semibold">
            Export source
            <select className="field-control" defaultValue="auto" name="source">
              <option value="auto">Detect automatically</option>
              <option value="sage">Sage</option>
              <option value="quickbooks">QuickBooks</option>
              <option value="xero">Xero</option>
            </select>
          </label>
          <label className="grid gap-2 text-sm font-semibold">
            Customer CSV
            <input
              accept=".csv,text/csv"
              className="field-control file:mr-3 file:rounded-md file:border-0 file:bg-field file:px-3 file:py-1.5 file:text-sm file:font-bold file:text-forest"
              name="customer_file"
              required
              type="file"
            />
          </label>
          <button className="btn-accent" disabled={pending}>
            <Upload aria-hidden="true" size={17} />
            {pending ? "Reading file..." : "Preview import"}
          </button>
        </form>
        {state.message ? (
          <p className="notice mt-5" role="alert">{state.message}</p>
        ) : null}
        <p className="mt-4 text-xs leading-5 text-slate-500">
          CSV only, maximum 2MB and 500 customers. The file is read for this
          import and is not stored as an attachment.
        </p>
      </section>

      {rows.length > 0 ? (
        <section className="surface overflow-hidden">
          <div className="border-b border-field px-5 py-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="eyebrow">{sourceLabel(state.detectedSource)} detected</p>
                <h2 className="mt-1 text-lg font-semibold">Check the import preview</h2>
              </div>
              <div className="flex flex-wrap gap-2 text-xs font-bold">
                <span className="status-pill bg-[#e7f7ef] text-[#177a55]">{ready.length} ready</span>
                <span className="status-pill bg-[#fff4db] text-[#8a5b00]">{duplicates.length} duplicate</span>
                <span className="status-pill bg-[#fde8e8] text-[#a42828]">{invalid.length} invalid</span>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-left text-sm">
              <thead className="bg-mist text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Row</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Contact</th>
                  <th className="px-4 py-3">Address</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-field">
                {rows.slice(0, 100).map((row) => (
                  <tr key={`${row.rowNumber}-${row.name}`}>
                    <td className="px-4 py-3 text-slate-500">{row.rowNumber}</td>
                    <td className="px-4 py-3 font-semibold">{row.name || "Name not found"}</td>
                    <td className="px-4 py-3 text-slate-600">
                      <span className="block">{row.email || "No email"}</span>
                      <span className="mt-0.5 block text-xs text-slate-500">{row.phone || "No phone"}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {[row.address_line_1, row.address_line_2, row.town, row.postcode]
                        .filter(Boolean)
                        .join(", ") || "No address"}
                    </td>
                    <td className="px-4 py-3">
                      {row.status === "ready" ? (
                        <span className="inline-flex items-center gap-1.5 font-bold text-[#177a55]"><CheckCircle2 size={15} />Ready</span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 font-bold text-[#a65d00]"><AlertTriangle size={15} />{row.issue}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {rows.length > 100 ? (
            <p className="border-t border-field px-5 py-3 text-sm text-slate-500">
              Showing the first 100 of {rows.length} rows. All ready rows will be imported.
            </p>
          ) : null}

          <div className="border-t border-field bg-mist px-5 py-4">
            <form action={importCustomers} className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <input name="rows" type="hidden" value={JSON.stringify(rows)} />
              <p className="text-sm text-slate-600">
                Duplicates and invalid rows will be skipped automatically.
              </p>
              <button className="btn-primary" disabled={ready.length === 0}>
                <CheckCircle2 aria-hidden="true" size={17} />
                Import {ready.length} customer{ready.length === 1 ? "" : "s"}
              </button>
            </form>
          </div>
        </section>
      ) : null}
    </div>
  );
}
