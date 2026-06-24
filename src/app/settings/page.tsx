import { redirect } from "next/navigation";
import Link from "next/link";
import { ExternalLink, Link2, Plus, Trash2, Unplug } from "lucide-react";
import {
  createSavedQuoteItem,
  deleteSavedQuoteItem,
  updateProfile,
} from "@/app/settings/actions";
import { AppShell } from "@/components/app-shell";
import { currency } from "@/lib/documents";
import { createClient } from "@/lib/supabase/server";
import { getXeroConnectionStatus } from "@/lib/xero";

type SettingsPageProps = {
  searchParams: {
    message?: string;
  };
};

const fieldClass =
  "field-control";

function settingsMessage(message?: string) {
  if (!message) {
    return null;
  }

  if (message.includes("does not exist")) {
    return "Settings needs the latest Supabase SQL update. Run the new SQL file, then refresh this page.";
  }

  return message;
}

export default async function SettingsPage({ searchParams }: SettingsPageProps) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [profileResult, savedItemsResult] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "full_name, business_name, trade, phone, logo_url, business_address_line_1, business_address_line_2, business_town, business_postcode, vat_number, plan",
      )
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("saved_quote_items")
      .select("id, name, description, item_type, default_quantity, unit_price")
      .eq("user_id", user.id)
      .order("name", { ascending: true }),
  ]);
  const profile = profileResult.data;
  const savedItemsTableMissing =
    savedItemsResult.error?.message.includes("saved_quote_items") ||
    savedItemsResult.error?.message.includes("schema cache");
  const savedItems = savedItemsTableMissing ? [] : savedItemsResult.data ?? [];
  const error =
    profileResult.error ?? (savedItemsTableMissing ? null : savedItemsResult.error);
  const xeroConnection = await getXeroConnectionStatus(user.id).catch(
    (xeroError) => ({
      error:
        xeroError instanceof Error
          ? xeroError.message
          : "Could not read Xero connection.",
    }),
  );
  const xeroConnectionError =
    xeroConnection && "error" in xeroConnection ? xeroConnection.error : null;
  const activeXeroConnection =
    xeroConnection && !("error" in xeroConnection) ? xeroConnection : null;

  const pageMessage = settingsMessage(error?.message ?? searchParams.message);

  return (
    <AppShell active="settings" plan={profile?.plan}>
      <header className="app-page-header">
        <div>
          <p className="eyebrow">Settings</p>
          <h1 className="page-title">
            Business details.
          </h1>
        </div>
      </header>

      <div className="app-page-body">
        <section className="surface-pad mb-6">
          <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="eyebrow">Smart quote builder</p>
              <h2 className="text-base font-semibold">Saved services and products</h2>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
                Save the jobs, fees, products, and services you quote often,
                then add them to new quotes in one click.
              </p>
            </div>
          </div>

          {savedItemsTableMissing ? (
            <p className="notice mb-5">
              Smart quote builder needs the latest Supabase SQL. Run
              supabase/saved-quote-items.sql, then refresh this page.
            </p>
          ) : null}

          <form
            action={createSavedQuoteItem}
            className="grid gap-4 rounded-lg border border-field bg-mist p-4 lg:grid-cols-[1fr_1.4fr_150px_140px_140px_auto]"
          >
            <div>
              <label className="text-sm font-medium" htmlFor="saved-name">
                Name
              </label>
              <input
                className={fieldClass}
                id="saved-name"
                name="name"
                placeholder="Boiler service"
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium" htmlFor="saved-description">
                Quote description
              </label>
              <input
                className={fieldClass}
                id="saved-description"
                name="description"
                placeholder="Annual boiler service and safety checks"
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium" htmlFor="saved-type">
                Type
              </label>
              <select className={fieldClass} id="saved-type" name="item_type">
                <option value="service">Service</option>
                <option value="product">Product</option>
                <option value="fee">Fee</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium" htmlFor="saved-quantity">
                Quantity
              </label>
              <input
                className={fieldClass}
                defaultValue="1"
                id="saved-quantity"
                min="0.01"
                name="default_quantity"
                step="0.01"
                type="number"
              />
            </div>
            <div>
              <label className="text-sm font-medium" htmlFor="saved-price">
                Unit price
              </label>
              <input
                className={fieldClass}
                defaultValue="0"
                id="saved-price"
                min="0"
                name="unit_price"
                step="0.01"
                type="number"
              />
            </div>
            <div className="flex items-end">
              <button className="btn-accent w-full">
                <Plus aria-hidden="true" size={16} />
                Save
              </button>
            </div>
          </form>

          <div className="mt-5 divide-y divide-field rounded-lg border border-field">
            {savedItems.length > 0 ? (
              savedItems.map((item) => (
                <article
                  className="grid gap-4 px-4 py-4 md:grid-cols-[1fr_auto] md:items-center"
                  key={item.id}
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold">{item.name}</h3>
                      <span className="status-pill bg-[#fff1e8] text-copper">
                        {item.item_type}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-slate-600">
                      {item.description}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Qty {Number(item.default_quantity ?? 1).toFixed(2)} x{" "}
                      {currency(Number(item.unit_price ?? 0))}
                    </p>
                  </div>
                  <form action={deleteSavedQuoteItem}>
                    <input name="id" type="hidden" value={item.id} />
                    <button className="btn-secondary text-slate-600 hover:text-ink">
                      <Trash2 aria-hidden="true" size={16} />
                      Delete
                    </button>
                  </form>
                </article>
              ))
            ) : (
              <p className="px-4 py-5 text-sm text-slate-500">
                No saved items yet. Add your regular services, products, or
                call-out fees above.
              </p>
            )}
          </div>
        </section>

        <section className="surface-pad mb-6">
          <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-lg bg-[#e8f6ff] text-[#006b9a]">
                  <Link2 aria-hidden="true" size={20} />
                </div>
                <div>
                  <h2 className="text-base font-semibold">Xero integration</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Connect Xero now. Quote and invoice export will be added in
                    the next stage.
                  </p>
                </div>
              </div>

              {xeroConnectionError ? (
                <p className="notice mt-4 max-w-2xl">
                  {xeroConnectionError}
                </p>
              ) : activeXeroConnection ? (
                <div className="mt-4 rounded-lg border border-field bg-mist p-4 text-sm">
                  <p className="font-semibold text-ink">
                    Connected to {activeXeroConnection.tenant_name ?? "Xero"}
                  </p>
                  <p className="mt-1 text-slate-500">
                    Tenant ID: {activeXeroConnection.tenant_id}
                  </p>
                  <p className="mt-1 text-slate-500">
                    Connected{" "}
                    {new Date(
                      activeXeroConnection.connected_at,
                    ).toLocaleDateString("en-GB")}
                  </p>
                </div>
              ) : (
                <p className="mt-4 text-sm text-slate-500">
                  Xero is not connected yet.
                </p>
              )}
            </div>

            <div className="flex shrink-0 flex-col gap-3 sm:flex-row md:flex-col">
              {xeroConnectionError || !activeXeroConnection ? (
                <Link className="btn-primary" href="/api/xero/connect">
                  <ExternalLink aria-hidden="true" size={16} />
                  Connect Xero
                </Link>
              ) : (
                <>
                  <Link className="btn-secondary" href="/api/xero/connect">
                    <ExternalLink aria-hidden="true" size={16} />
                    Reconnect
                  </Link>
                  <form action="/api/xero/disconnect" method="post">
                    <button className="btn-secondary w-full" type="submit">
                      <Unplug aria-hidden="true" size={16} />
                      Disconnect
                    </button>
                  </form>
                </>
              )}
            </div>
          </div>
        </section>

        <section className="surface-pad">
          <div className="mb-6">
            <h2 className="text-base font-semibold">Profile</h2>
            <p className="mt-1 text-sm text-slate-500">
              These details will be used as Tradio grows into quote, invoice,
              and PDF branding.
            </p>
          </div>

          <form action={updateProfile} className="space-y-5">
            <div className="grid gap-5 rounded-lg border border-field bg-mist p-4 md:grid-cols-[160px_1fr] md:items-center">
              <div className="flex aspect-square items-center justify-center overflow-hidden rounded-lg border border-field bg-white">
                {profile?.logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    alt="Business logo preview"
                    className="h-full w-full object-contain p-3"
                    src={profile.logo_url}
                  />
                ) : (
                  <span className="px-4 text-center text-sm font-medium text-slate-500">
                    Logo preview
                  </span>
                )}
              </div>

              <div>
                <label className="text-sm font-medium" htmlFor="logo_url">
                  Business logo URL
                </label>
                <input
                  className={fieldClass}
                  defaultValue={profile?.logo_url ?? ""}
                  id="logo_url"
                  name="logo_url"
                  placeholder="https://example.com/logo.png"
                  type="url"
                />
                <p className="mt-2 text-sm text-slate-500">
                  Use a public image URL for now. Storage upload can be added
                  later.
                </p>
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className="text-sm font-medium" htmlFor="full_name">
                  Your name
                </label>
                <input
                  className={fieldClass}
                  defaultValue={profile?.full_name ?? ""}
                  id="full_name"
                  name="full_name"
                  type="text"
                />
              </div>

              <div>
                <label className="text-sm font-medium" htmlFor="business_name">
                  Business name
                </label>
                <input
                  className={fieldClass}
                  defaultValue={profile?.business_name ?? ""}
                  id="business_name"
                  name="business_name"
                  type="text"
                />
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className="text-sm font-medium" htmlFor="trade">
                  Trade
                </label>
                <input
                  className={fieldClass}
                  defaultValue={profile?.trade ?? ""}
                  id="trade"
                  name="trade"
                  placeholder="Plumber, electrician, gardener..."
                  type="text"
                />
              </div>

              <div>
                <label className="text-sm font-medium" htmlFor="phone">
                  Phone
                </label>
                <input
                  className={fieldClass}
                  defaultValue={profile?.phone ?? ""}
                  id="phone"
                  name="phone"
                  type="tel"
                />
              </div>
            </div>

            <div className="rounded-lg border border-field p-4">
              <h3 className="text-sm font-semibold">Business address</h3>
              <div className="mt-4 space-y-5">
                <div>
                  <label
                    className="text-sm font-medium"
                    htmlFor="business_address_line_1"
                  >
                    Address line 1
                  </label>
                  <input
                    className={fieldClass}
                    defaultValue={profile?.business_address_line_1 ?? ""}
                    id="business_address_line_1"
                    name="business_address_line_1"
                    type="text"
                  />
                </div>

                <div>
                  <label
                    className="text-sm font-medium"
                    htmlFor="business_address_line_2"
                  >
                    Address line 2
                  </label>
                  <input
                    className={fieldClass}
                    defaultValue={profile?.business_address_line_2 ?? ""}
                    id="business_address_line_2"
                    name="business_address_line_2"
                    type="text"
                  />
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                  <div>
                    <label
                      className="text-sm font-medium"
                      htmlFor="business_town"
                    >
                      Town or city
                    </label>
                    <input
                      className={fieldClass}
                      defaultValue={profile?.business_town ?? ""}
                      id="business_town"
                      name="business_town"
                      type="text"
                    />
                  </div>

                  <div>
                    <label
                      className="text-sm font-medium"
                      htmlFor="business_postcode"
                    >
                      Postcode
                    </label>
                    <input
                      className={fieldClass}
                      defaultValue={profile?.business_postcode ?? ""}
                      id="business_postcode"
                      name="business_postcode"
                      type="text"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium" htmlFor="vat_number">
                VAT number
              </label>
              <input
                className={fieldClass}
                defaultValue={profile?.vat_number ?? ""}
                id="vat_number"
                name="vat_number"
                placeholder="GB123456789"
                type="text"
              />
            </div>

            <div>
              <label className="text-sm font-medium" htmlFor="email">
                Login email
              </label>
              <input
                className={`${fieldClass} bg-slate-50 text-slate-500`}
                disabled
                id="email"
                type="email"
                value={user.email ?? ""}
              />
            </div>

            {pageMessage ? (
              <p className="notice">
                {pageMessage}
              </p>
            ) : null}

            <div className="flex justify-end">
              <button className="btn-primary">
                Save settings
              </button>
            </div>
          </form>
        </section>
      </div>
    </AppShell>
  );
}
