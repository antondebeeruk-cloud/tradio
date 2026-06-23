import { Pencil } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { updateCustomer } from "@/app/customers/actions";
import { AppShell } from "@/components/app-shell";
import { CustomerForm } from "@/components/customer-form";
import { createClient } from "@/lib/supabase/server";

type EditCustomerPageProps = {
  params: {
    id: string;
  };
  searchParams: {
    message?: string;
  };
};

export default async function EditCustomerPage({
  params,
  searchParams,
}: EditCustomerPageProps) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [profileResult, customerResult] = await Promise.all([
    supabase.from("profiles").select("plan").eq("id", user.id).maybeSingle(),
    supabase
      .from("customers")
      .select(
        "id, name, email, phone, address_line_1, address_line_2, town, postcode, notes",
      )
      .eq("id", params.id)
      .eq("user_id", user.id)
      .single(),
  ]);

  const customer = customerResult.data;
  const error = customerResult.error;

  if (error || !customer) {
    notFound();
  }

  return (
    <AppShell active="customers" plan={profileResult.data?.plan}>
      <header className="app-page-header">
        <div>
          <p className="eyebrow">Customers</p>
          <h1 className="page-title">
            Edit {customer.name}.
          </h1>
        </div>
      </header>

      <div className="app-page-body">
        <section className="surface-pad">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-field text-forest">
              <Pencil aria-hidden="true" size={19} />
            </div>
            <div>
              <h2 className="text-base font-semibold">Customer details</h2>
              <p className="text-sm text-slate-500">
                Update contact, address, and notes for this customer.
              </p>
            </div>
          </div>

          <CustomerForm
            action={updateCustomer}
            customer={customer}
            message={searchParams.message}
            submitLabel="Save changes"
          />
        </section>
      </div>
    </AppShell>
  );
}
