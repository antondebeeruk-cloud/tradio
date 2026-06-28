import { Plus } from "lucide-react";
import { redirect } from "next/navigation";
import { createCustomer } from "@/app/customers/actions";
import { AppShell } from "@/components/app-shell";
import { CustomerForm } from "@/components/customer-form";
import { createClient } from "@/lib/supabase/server";

type NewCustomerPageProps = {
  searchParams: Promise<{
    message?: string;
    returnTo?: string;
  }>;
};

export default async function NewCustomerPage({
  searchParams,
}: NewCustomerPageProps) {
  const search = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan")
    .eq("id", user.id)
    .maybeSingle();
  const returnTo =
    search.returnTo === "/quotes/new" ? "/quotes/new" : "/customers";

  return (
    <AppShell active="customers" plan={profile?.plan}>
      <header className="app-page-header">
        <div>
          <p className="eyebrow">Customers</p>
          <h1 className="page-title">
            Add a customer.
          </h1>
        </div>
      </header>

      <div className="app-page-body">
        <section className="surface-pad">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-field text-forest">
              <Plus aria-hidden="true" size={20} />
            </div>
            <div>
              <h2 className="text-base font-semibold">Customer details</h2>
              <p className="text-sm text-slate-500">
                These details will be reused on quotes and invoices.
              </p>
            </div>
          </div>

          <CustomerForm
            action={createCustomer}
            message={search.message}
            returnTo={returnTo}
            submitLabel="Add customer"
          />
        </section>
      </div>
    </AppShell>
  );
}
