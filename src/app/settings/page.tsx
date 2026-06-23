import { redirect } from "next/navigation";
import { updateProfile } from "@/app/settings/actions";
import { AppShell } from "@/components/app-shell";
import { createClient } from "@/lib/supabase/server";

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
    return "Settings needs the latest Supabase profile update. Run the logo, address, and VAT SQL, then refresh this page.";
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

  const { data: profile, error } = await supabase
    .from("profiles")
    .select(
      "full_name, business_name, trade, phone, logo_url, business_address_line_1, business_address_line_2, business_town, business_postcode, vat_number",
    )
    .eq("id", user.id)
    .maybeSingle();

  const pageMessage = settingsMessage(error?.message ?? searchParams.message);

  return (
    <AppShell active="settings">
      <header className="app-page-header">
        <div>
          <p className="eyebrow">Settings</p>
          <h1 className="page-title">
            Business details.
          </h1>
        </div>
      </header>

      <div className="app-page-body">
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
