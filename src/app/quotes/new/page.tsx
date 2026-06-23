import Link from "next/link";
import { FileText, Plus } from "lucide-react";
import { redirect } from "next/navigation";
import { createQuote } from "@/app/quotes/actions";
import { AppShell } from "@/components/app-shell";
import { QuoteForm } from "@/components/quote-form";
import { createClient } from "@/lib/supabase/server";

type NewQuotePageProps = {
  searchParams: {
    message?: string;
  };
};

export default async function NewQuotePage({ searchParams }: NewQuotePageProps) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: customers, error } = await supabase
    .from("customers")
    .select("id, name")
    .eq("user_id", user.id)
    .order("name", { ascending: true });

  if (error) {
    redirect(`/quotes?message=${encodeURIComponent(error.message)}`);
  }

  return (
    <AppShell active="quotes">
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
            message={searchParams.message}
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
