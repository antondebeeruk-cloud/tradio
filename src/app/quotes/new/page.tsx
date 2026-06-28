import Link from "next/link";
import { FileText, Plus } from "lucide-react";
import { redirect } from "next/navigation";
import { createQuote } from "@/app/quotes/actions";
import { AppShell } from "@/components/app-shell";
import { QuoteForm } from "@/components/quote-form";
import { createClient } from "@/lib/supabase/server";

type NewQuotePageProps = {
  searchParams: Promise<{
    customerId?: string;
    message?: string;
  }>;
};

export default async function NewQuotePage({ searchParams }: NewQuotePageProps) {
  const search = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [profileResult, customersResult, savedItemsResult] = await Promise.all([
    supabase.from("profiles").select("plan").eq("id", user.id).maybeSingle(),
    supabase
      .from("customers")
      .select("id, name")
      .eq("user_id", user.id)
      .order("name", { ascending: true }),
    supabase
      .from("saved_quote_items")
      .select("id, name, description, item_type, default_quantity, unit_price")
      .eq("user_id", user.id)
      .order("name", { ascending: true }),
  ]);

  const customers = customersResult.data;
  const savedItemsTableMissing =
    savedItemsResult.error?.message.includes("saved_quote_items") ||
    savedItemsResult.error?.message.includes("schema cache");
  const savedItems = savedItemsTableMissing ? [] : savedItemsResult.data ?? [];
  const error =
    profileResult.error ??
    customersResult.error ??
    (savedItemsTableMissing ? null : savedItemsResult.error);

  if (error) {
    redirect(`/quotes?message=${encodeURIComponent(error.message)}`);
  }

  return (
    <AppShell active="quotes" plan={profileResult.data?.plan}>
      <header className="app-page-header">
        <div>
          <p className="eyebrow">Quotes</p>
          <h1 className="page-title">
            Create a quote.
          </h1>
        </div>
      </header>

      <div className="app-page-body">
        {customers && customers.length > 0 ? (
          <QuoteForm
            action={createQuote}
            customers={customers}
            message={
              savedItemsTableMissing
                ? "Smart quote builder needs the latest Supabase SQL. Run supabase/saved-quote-items.sql to enable saved items."
                : search.message
            }
            savedItems={savedItems}
            selectedCustomerId={search.customerId}
          />
        ) : (
          <section className="empty-state">
            <div className="mx-auto flex size-12 items-center justify-center rounded-lg bg-field text-forest">
              <FileText aria-hidden="true" size={24} />
            </div>
            <h2 className="mt-4 text-lg font-semibold">Add a customer first</h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
              Quotes need a customer so Tradio can attach the correct contact
              and address details.
            </p>
            <Link
              className="btn-accent mt-5"
              href="/customers/new?returnTo=%2Fquotes%2Fnew"
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
