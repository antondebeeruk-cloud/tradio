"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";

type CustomerOption = {
  id: string;
  name: string;
};

type QuoteItem = {
  id: string;
  description: string;
  quantity: string;
  unitPrice: string;
};

type SavedQuoteItem = {
  default_quantity: number | string;
  description: string;
  id: string;
  item_type: string;
  name: string;
  unit_price: number | string;
};

type QuoteFormProps = {
  action: (formData: FormData) => Promise<void>;
  customers: CustomerOption[];
  message?: string;
  savedItems?: SavedQuoteItem[];
  selectedCustomerId?: string;
};

const fieldClass =
  "field-control";

function currency(value: number) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format(value);
}

function toNumber(value: string, fallback: number) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function createBlankItem(id: string): QuoteItem {
  return {
    id,
    description: "",
    quantity: "1",
    unitPrice: "0",
  };
}

export function QuoteForm({
  action,
  customers,
  message,
  savedItems = [],
  selectedCustomerId,
}: QuoteFormProps) {
  const router = useRouter();
  const [items, setItems] = useState<QuoteItem[]>([createBlankItem("item-1")]);
  const [vatRate, setVatRate] = useState("20");
  const nextItemId = useRef(2);

  const totals = useMemo(() => {
    const subtotal = items.reduce((runningTotal, item) => {
      const quantity = Math.max(toNumber(item.quantity, 0), 0);
      const unitPrice = Math.max(toNumber(item.unitPrice, 0), 0);
      return runningTotal + quantity * unitPrice;
    }, 0);
    const vatAmount = subtotal * (Math.max(toNumber(vatRate, 0), 0) / 100);

    return {
      subtotal,
      vatAmount,
      total: subtotal + vatAmount,
    };
  }, [items, vatRate]);

  function updateItem(id: string, updates: Partial<QuoteItem>) {
    setItems((currentItems) =>
      currentItems.map((item) =>
        item.id === id ? { ...item, ...updates } : item,
      ),
    );
  }

  function removeItem(id: string) {
    setItems((currentItems) =>
      currentItems.length === 1
        ? currentItems
        : currentItems.filter((item) => item.id !== id),
    );
  }

  function applySavedItem(itemId: string, quoteItemId: string) {
    const savedItem = savedItems.find((item) => item.id === itemId);

    if (!savedItem) {
      return;
    }

    updateItem(quoteItemId, {
      description: savedItem.description,
      quantity: String(savedItem.default_quantity ?? 1),
      unitPrice: String(savedItem.unit_price ?? 0),
    });
  }

  return (
    <form action={action} className="space-y-6">
      <section className="surface-pad">
        <div className="grid gap-5 md:grid-cols-[1fr_160px]">
          <div>
            <label className="text-sm font-medium" htmlFor="customer_id">
              Customer
            </label>
            <select
              className={fieldClass}
              defaultValue={selectedCustomerId ?? ""}
              id="customer_id"
              name="customer_id"
              onChange={(event) => {
                if (event.target.value === "__create_customer__") {
                  router.push("/customers/new?returnTo=%2Fquotes%2Fnew");
                }
              }}
              required
            >
              <option value="">Choose a customer</option>
              <option value="__create_customer__">+ Create new customer</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium" htmlFor="vat_rate">
              VAT rate
            </label>
            <div className="relative">
              <input
                className={`${fieldClass} pr-8`}
                id="vat_rate"
                min="0"
                name="vat_rate"
                onChange={(event) => setVatRate(event.target.value)}
                step="0.01"
                type="number"
                value={vatRate}
              />
              <span className="pointer-events-none absolute bottom-2 right-3 text-sm text-slate-500">
                %
              </span>
            </div>
          </div>
        </div>

        <div className="mt-5">
          <label className="text-sm font-medium" htmlFor="notes">
            Notes
          </label>
          <textarea
            className={`${fieldClass} min-h-24 resize-y`}
            id="notes"
            name="notes"
          />
        </div>
      </section>

      <section className="surface overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-field px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold">Line items</h2>
            <p className="mt-1 text-sm text-slate-500">
              Add labour, materials, call-out fees, or any other charge.
            </p>
          </div>
          <button
            className="btn-secondary"
            onClick={() => {
              const id = `item-${nextItemId.current}`;
              nextItemId.current += 1;
              setItems((currentItems) => [...currentItems, createBlankItem(id)]);
            }}
            type="button"
          >
            <Plus aria-hidden="true" size={16} />
            Add item
          </button>
        </div>

        <div className="divide-y divide-field">
          {items.map((item, index) => {
            const lineTotal =
              Math.max(toNumber(item.quantity, 0), 0) *
              Math.max(toNumber(item.unitPrice, 0), 0);

            return (
              <div
                className="grid gap-4 px-5 py-4 lg:grid-cols-[180px_1fr_120px_140px_120px_auto] lg:items-end"
                key={item.id}
              >
                <div>
                  <label
                    className="text-sm font-medium"
                    htmlFor={`saved-item-${item.id}`}
                  >
                    Saved item
                  </label>
                  <select
                    className={fieldClass}
                    disabled={savedItems.length === 0}
                    id={`saved-item-${item.id}`}
                    onChange={(event) => applySavedItem(event.target.value, item.id)}
                    value=""
                  >
                    <option value="">
                      {savedItems.length > 0 ? "Choose item" : "No saved items"}
                    </option>
                    {savedItems.map((savedItem) => (
                      <option key={savedItem.id} value={savedItem.id}>
                        {savedItem.name} - {currency(Number(savedItem.unit_price ?? 0))}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    className="text-sm font-medium"
                    htmlFor={`description-${item.id}`}
                  >
                    Description
                  </label>
                  <input
                    className={fieldClass}
                    id={`description-${item.id}`}
                    name="item_description"
                    onChange={(event) =>
                      updateItem(item.id, { description: event.target.value })
                    }
                    placeholder={index === 0 ? "Labour and materials" : ""}
                    required={index === 0}
                    type="text"
                    value={item.description}
                  />
                </div>

                <div>
                  <label
                    className="text-sm font-medium"
                    htmlFor={`quantity-${item.id}`}
                  >
                    Quantity
                  </label>
                  <input
                    className={fieldClass}
                    id={`quantity-${item.id}`}
                    min="0.01"
                    name="item_quantity"
                    onChange={(event) =>
                      updateItem(item.id, { quantity: event.target.value })
                    }
                    step="0.01"
                    type="number"
                    value={item.quantity}
                  />
                </div>

                <div>
                  <label
                    className="text-sm font-medium"
                    htmlFor={`unit-price-${item.id}`}
                  >
                    Unit price
                  </label>
                  <input
                    className={fieldClass}
                    id={`unit-price-${item.id}`}
                    min="0"
                    name="item_unit_price"
                    onChange={(event) =>
                      updateItem(item.id, { unitPrice: event.target.value })
                    }
                    step="0.01"
                    type="number"
                    value={item.unitPrice}
                  />
                </div>

                <div>
                  <p className="text-sm font-medium">Line total</p>
                  <p className="mt-2 rounded-lg bg-field px-3 py-2 text-sm font-semibold text-ink">
                    {currency(lineTotal)}
                  </p>
                </div>

                <button
                  aria-label="Remove item"
                  className="inline-flex size-10 items-center justify-center rounded-lg border border-field text-slate-600 transition hover:bg-field hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
                  disabled={items.length === 1}
                  onClick={() => removeItem(item.id)}
                  type="button"
                >
                  <Trash2 aria-hidden="true" size={16} />
                </button>
              </div>
            );
          })}
        </div>
      </section>

      <section className="surface-pad">
        <div className="ml-auto max-w-sm space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-500">Subtotal</span>
            <span className="font-semibold">{currency(totals.subtotal)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-500">VAT</span>
            <span className="font-semibold">{currency(totals.vatAmount)}</span>
          </div>
          <div className="flex items-center justify-between border-t border-field pt-3 text-lg font-semibold">
            <span>Total</span>
            <span>{currency(totals.total)}</span>
          </div>
        </div>

        {message ? (
          <p className="notice mt-5">
            {message}
          </p>
        ) : null}

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Link
            className="btn-secondary px-4"
            href="/quotes"
          >
            Cancel
          </Link>
          <button className="btn-primary">
            Create quote
          </button>
        </div>
      </section>
    </form>
  );
}
