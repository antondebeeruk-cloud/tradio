import Link from "next/link";
import { Mail, Pencil, Phone, Plus, Trash2, UserRound } from "lucide-react";
import { redirect } from "next/navigation";
import { deleteCustomer } from "@/app/customers/actions";
import { AppShell } from "@/components/app-shell";
import { createClient } from "@/lib/supabase/server";

type CustomersPageProps = {
  searchParams: {
    message?: string;
  };
};

export default async function CustomersPage({ searchParams }: CustomersPageProps) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: customers, error } = await supabase
    .from("customers")
    .select(
      "id, name, email, phone, address_line_1, address_line_2, town, postcode, notes, created_at",
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    redirect(`/dashboard?message=${encodeURIComponent(error.message)}`);
  }

  return (
    <AppShell active="customers">
      <header className="app-page-header">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="eyebrow">Customers</p>
            <h1 className="page-title">
              Keep customer details ready for quotes and invoices.
            </h1>
          </div>
          <Link
            className="btn-accent"
            href="/customers/new"
          >
            <Plus aria-hidden="true" size={17} />
            Add customer
          </Link>
        </div>
      </header>

      <div className="app-page-body">
        {searchParams.message ? (
          <p className="notice mb-5">
            {searchParams.message}
          </p>
        ) : null}

        {customers && customers.length > 0 ? (
          <section className="surface overflow-hidden">
            <div className="grid gap-3 border-b border-field px-5 py-4 sm:grid-cols-[1fr_auto] sm:items-center">
              <div>
                <h2 className="text-base font-semibold">Customer list</h2>
                <p className="mt-1 text-sm text-slate-500">
                  {customers.length} saved customer
                  {customers.length === 1 ? "" : "s"}
                </p>
              </div>
            </div>

            <div className="divide-y divide-field">
              {customers.map((customer) => {
                const address = [
                  customer.address_line_1,
                  customer.address_line_2,
                  customer.town,
                  customer.postcode,
                ]
                  .filter(Boolean)
                  .join(", ");

                return (
                  <article
                    className="grid gap-4 px-5 py-4 lg:grid-cols-[1fr_auto] lg:items-center"
                    key={customer.id}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-3">
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-field text-forest">
                          <UserRound aria-hidden="true" size={19} />
                        </div>
                        <div className="min-w-0">
                          <h3 className="truncate font-semibold">{customer.name}</h3>
                          <p className="mt-1 text-sm text-slate-500">
                            {address || "No address added yet"}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-col gap-2 text-sm text-slate-500 sm:flex-row sm:flex-wrap sm:gap-x-5">
                        {customer.email ? (
                          <span className="inline-flex items-center gap-2">
                            <Mail aria-hidden="true" size={15} />
                            {customer.email}
                          </span>
                        ) : null}
                        {customer.phone ? (
                          <span className="inline-flex items-center gap-2">
                            <Phone aria-hidden="true" size={15} />
                            {customer.phone}
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 sm:flex-row lg:justify-end">
                      <Link
                        className="btn-secondary"
                        href={`/customers/${customer.id}/edit`}
                      >
                        <Pencil aria-hidden="true" size={16} />
                        Edit
                      </Link>
                      <form action={deleteCustomer}>
                        <input name="id" type="hidden" value={customer.id} />
                        <button className="btn-secondary w-full text-slate-600 hover:text-ink">
                          <Trash2 aria-hidden="true" size={16} />
                          Delete
                        </button>
                      </form>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        ) : (
          <section className="empty-state">
            <div className="mx-auto flex size-12 items-center justify-center rounded-lg bg-field text-forest">
              <UserRound aria-hidden="true" size={24} />
            </div>
            <h2 className="mt-4 text-lg font-semibold">No customers yet</h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
              Add your first customer so quotes and invoices can pull through the
              right contact and address details.
            </p>
            <Link
              className="btn-accent mt-5"
              href="/customers/new"
            >
              <Plus aria-hidden="true" size={17} />
              Add customer
            </Link>
          </section>
        )}
      </div>
    </AppShell>
  );
}
