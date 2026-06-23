import { currency, formatDate } from "@/lib/documents";

type DocumentItem = {
  description: string;
  quantity: number | string;
  unit_price: number | string;
  line_total: number | string;
};

type BusinessProfile = {
  business_address_line_1?: string | null;
  business_address_line_2?: string | null;
  business_name?: string | null;
  business_postcode?: string | null;
  business_town?: string | null;
  logo_url?: string | null;
  phone?: string | null;
  trade?: string | null;
  vat_number?: string | null;
};

type DocumentTemplateProps = {
  customer: {
    address_line_1?: string | null;
    address_line_2?: string | null;
    email?: string | null;
    name?: string | null;
    phone?: string | null;
    postcode?: string | null;
    town?: string | null;
  } | null;
  documentLabel: string;
  documentNumber: string;
  dueDate?: string | null;
  issueDate: string | null;
  items: DocumentItem[];
  notes?: string | null;
  profile?: BusinessProfile | null;
  status: string;
  subtotal: number | null;
  total: number | null;
  vatAmount: number | null;
  vatRate: number | null;
};

export function DocumentTemplate({
  customer,
  documentLabel,
  documentNumber,
  dueDate,
  issueDate,
  items,
  notes,
  profile,
  status,
  subtotal,
  total,
  vatAmount,
  vatRate,
}: DocumentTemplateProps) {
  const address = [
    customer?.address_line_1,
    customer?.address_line_2,
    customer?.town,
    customer?.postcode,
  ].filter(Boolean);
  const businessAddress = [
    profile?.business_address_line_1,
    profile?.business_address_line_2,
    profile?.business_town,
    profile?.business_postcode,
  ].filter(Boolean);
  const businessName = profile?.business_name || "Tradio";

  return (
    <main className="mx-auto max-w-4xl bg-white px-6 py-8 text-ink print:px-0 print:py-0">
      <section className="surface p-8 print:border-0 print:shadow-none">
        <header className="grid gap-8 border-b border-field pb-8 sm:grid-cols-[1fr_auto]">
          <div className="flex gap-4">
            {profile?.logo_url ? (
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg border border-field bg-white">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  alt={`${businessName} logo`}
                  className="max-h-14 max-w-14 object-contain"
                  src={profile.logo_url}
                />
              </div>
            ) : null}
            <div>
              <p className="text-2xl font-semibold">{businessName}</p>
              {profile?.trade ? (
                <p className="mt-1 text-sm text-slate-500">{profile.trade}</p>
              ) : null}
              {businessAddress.length > 0 ? (
                <div className="mt-2 text-sm leading-6 text-slate-600">
                  {businessAddress.map((line, index) => (
                    <p key={`${line}-${index}`}>{line}</p>
                  ))}
                </div>
              ) : null}
              <div className="mt-2 space-y-1 text-sm text-slate-600">
                {profile?.phone ? <p>{profile.phone}</p> : null}
                {profile?.vat_number ? (
                  <p>VAT number: {profile.vat_number}</p>
                ) : null}
              </div>
            </div>
          </div>
          <div className="sm:text-right">
            <p className="text-sm font-medium text-slate-500">{documentLabel}</p>
            <h1 className="mt-1 text-3xl font-semibold">{documentNumber}</h1>
            <p className="mt-2 rounded-lg bg-field px-3 py-1 text-sm font-semibold capitalize text-forest sm:inline-block">
              {status}
            </p>
          </div>
        </header>

        <section className="grid gap-8 border-b border-field py-8 sm:grid-cols-2">
          <div>
            <h2 className="text-sm font-semibold text-slate-500">Customer</h2>
            <p className="mt-2 font-semibold">{customer?.name}</p>
            {address.length > 0 ? (
              <div className="mt-2 text-sm leading-6 text-slate-600">
                {address.map((line, index) => (
                  <p key={`${line}-${index}`}>{line}</p>
                ))}
              </div>
            ) : null}
            {customer?.email ? (
              <p className="mt-2 text-sm text-slate-600">{customer.email}</p>
            ) : null}
            {customer?.phone ? (
              <p className="mt-1 text-sm text-slate-600">{customer.phone}</p>
            ) : null}
          </div>

          <div className="sm:text-right">
            <h2 className="text-sm font-semibold text-slate-500">Dates</h2>
            <p className="mt-2 text-sm text-slate-600">
              Issued: {formatDate(issueDate)}
            </p>
            {dueDate ? (
              <p className="mt-1 text-sm text-slate-600">
                Due: {formatDate(dueDate)}
              </p>
            ) : null}
          </div>
        </section>

        <section className="py-8">
          <div className="overflow-hidden rounded-lg border border-field">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-field text-forest">
                <tr>
                  <th className="px-4 py-3 font-semibold">Description</th>
                  <th className="px-4 py-3 text-right font-semibold">Qty</th>
                  <th className="px-4 py-3 text-right font-semibold">Unit</th>
                  <th className="px-4 py-3 text-right font-semibold">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-field">
                {items.map((item, index) => (
                  <tr key={`${item.description}-${index}`}>
                    <td className="px-4 py-3">{item.description}</td>
                    <td className="px-4 py-3 text-right">{item.quantity}</td>
                    <td className="px-4 py-3 text-right">
                      {currency(Number(item.unit_price))}
                    </td>
                    <td className="px-4 py-3 text-right font-medium">
                      {currency(Number(item.line_total))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="ml-auto mt-6 max-w-sm space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Subtotal</span>
              <span className="font-semibold">{currency(subtotal)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">VAT ({vatRate ?? 0}%)</span>
              <span className="font-semibold">{currency(vatAmount)}</span>
            </div>
            <div className="flex items-center justify-between border-t border-field pt-3 text-lg font-semibold">
              <span>Total</span>
              <span>{currency(total)}</span>
            </div>
          </div>
        </section>

        {notes ? (
          <section className="border-t border-field pt-6">
            <h2 className="text-sm font-semibold text-slate-500">Notes</h2>
            <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-600">
              {notes}
            </p>
          </section>
        ) : null}
      </section>
    </main>
  );
}
