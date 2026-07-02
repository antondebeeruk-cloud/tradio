import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { CustomerImporter } from "@/components/customer-importer";
import { createClient } from "@/lib/supabase/server";

export default async function CustomerImportPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>;
}) {
  const search = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <AppShell active="customers" plan={profile?.plan}>
      <header className="app-page-header">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="eyebrow">Customers</p>
            <h1 className="page-title">Import customers.</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Move contacts from Sage, QuickBooks or Xero without retyping them.
            </p>
          </div>
          <Link className="btn-secondary" href="/customers">
            <ArrowLeft aria-hidden="true" size={17} />
            Customer list
          </Link>
        </div>
      </header>
      <div className="app-page-body">
        <CustomerImporter message={search.message} />
      </div>
    </AppShell>
  );
}
