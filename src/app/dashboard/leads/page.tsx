import {
  CheckCircle2,
  MailPlus,
  RefreshCw,
  ShieldAlert,
  Trash2,
  UserPlus,
} from "lucide-react";
import { redirect } from "next/navigation";
import {
  checkMailboxNow,
  convertLeadToCustomer,
  convertLeadToQuote,
  createMockLead,
  deleteLead,
  markLeadAsSpam,
  updateLeadStatus,
} from "@/app/dashboard/leads/actions";
import { AppShell } from "@/components/app-shell";
import { CopyButton } from "@/components/copy-button";
import { formatDate } from "@/lib/documents";
import { generateLeadEmail } from "@/lib/lead-email";
import { isAdmin } from "@/lib/subscription";
import { createClient } from "@/lib/supabase/server";

type LeadsPageProps = {
  searchParams: {
    message?: string;
  };
};

const leadStatusOptions = ["new", "contacted", "quoted", "won", "lost", "spam"];

const leadStatusClasses: Record<string, string> = {
  contacted: "bg-[#eaf2ff] text-[#265a93]",
  lost: "bg-[#fff0e7] text-[#d94800]",
  new: "bg-field text-forest",
  quoted: "bg-[#fff5ef] text-[#d94800]",
  spam: "bg-slate-100 text-slate-500",
  won: "bg-[#e7f7ef] text-[#177a55]",
};

async function ensureLeadEmailForUser() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("business_name, full_name, lead_email_address, plan, role")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    redirect(`/dashboard?message=${encodeURIComponent(error.message)}`);
  }

  if (profile?.lead_email_address) {
    return { profile, supabase, user };
  }

  const leadEmail = generateLeadEmail({
    businessName: profile?.business_name,
    email: user.email,
    fullName: profile?.full_name,
  });

  const { data: updatedProfile, error: updateError } = await supabase
    .from("profiles")
    .upsert({
      id: user.id,
      ...leadEmail,
      updated_at: new Date().toISOString(),
    })
    .select("business_name, full_name, lead_email_address, plan, role")
    .single();

  if (updateError) {
    redirect(`/dashboard?message=${encodeURIComponent(updateError.message)}`);
  }

  return { profile: updatedProfile, supabase, user };
}

export default async function LeadsPage({ searchParams }: LeadsPageProps) {
  const { profile, supabase, user } = await ensureLeadEmailForUser();
  const { data: leads, error } = await supabase
    .from("leads")
    .select(
      "id, customer_name, source_platform, subject, phone, postcode, status, received_at, from_email, from_name, job_description, body_text, original_recipient",
    )
    .eq("user_id", user.id)
    .order("received_at", { ascending: false });

  if (error) {
    redirect(`/dashboard?message=${encodeURIComponent(error.message)}`);
  }

  const canCheckMailbox =
    isAdmin(profile) || process.env.NODE_ENV !== "production";

  return (
    <AppShell active="leads" plan={profile?.plan}>
      <header className="app-page-header">
        <div>
          <p className="eyebrow">Lead inbox</p>
          <h1 className="page-title">Capture enquiries from lead websites.</h1>
        </div>
      </header>

      <div className="app-page-body">
        {searchParams.message ? (
          <p className="notice mb-5">{searchParams.message}</p>
        ) : null}

        <section className="surface-pad">
          <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <div className="flex items-center gap-3">
                <div className="flex size-11 items-center justify-center rounded-lg bg-field text-forest">
                  <MailPlus aria-hidden="true" size={22} />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">Your lead email</h2>
                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    Use this email on lead websites. Any enquiries sent here
                    will appear in your Tradio leads.
                  </p>
                </div>
              </div>
              <p className="mt-5 break-all rounded-lg border border-field bg-mist px-4 py-3 text-sm font-bold text-forest">
                {profile?.lead_email_address}
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row lg:flex-col">
              <CopyButton text={profile?.lead_email_address ?? ""} />
              <form action={createMockLead}>
                <button className="btn-primary w-full">
                  <MailPlus aria-hidden="true" size={16} />
                  Create mock lead
                </button>
              </form>
              {canCheckMailbox ? (
                <form action={checkMailboxNow}>
                  <button className="btn-accent w-full">
                    <RefreshCw aria-hidden="true" size={16} />
                    Check mailbox now
                  </button>
                </form>
              ) : null}
            </div>
          </div>
        </section>

        <section className="surface mt-6 overflow-hidden">
          <div className="section-bar">
            <h2 className="font-semibold">Leads</h2>
            <p className="mt-1 text-sm text-slate-500">
              {leads?.length ?? 0} lead{leads?.length === 1 ? "" : "s"} captured.
            </p>
          </div>

          {leads && leads.length > 0 ? (
            <div className="divide-y divide-field">
              {leads.map((lead) => (
                <article className="px-4 py-5 sm:px-5" key={lead.id}>
                  <div className="grid gap-4 xl:grid-cols-[1fr_auto] xl:items-start">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold">
                          {lead.customer_name || lead.from_name || "Unknown lead"}
                        </h3>
                        <span
                          className={`status-pill ${
                            leadStatusClasses[lead.status] ?? leadStatusClasses.new
                          }`}
                        >
                          {lead.status}
                        </span>
                        <span className="status-pill bg-[#fff5ef] text-[#d94800]">
                          {lead.source_platform || "Email"}
                        </span>
                      </div>
                      <p className="mt-1 text-sm font-medium text-ink">
                        {lead.subject || "No subject"}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        {lead.phone ? `${lead.phone} - ` : ""}
                        {lead.postcode ? `${lead.postcode} - ` : ""}
                        {lead.received_at ? formatDate(lead.received_at) : "No date"}
                      </p>
                    </div>

                    <form action={updateLeadStatus} className="flex gap-2">
                      <input name="id" type="hidden" value={lead.id} />
                      <select
                        className="field-control mt-0"
                        defaultValue={lead.status}
                        name="status"
                      >
                        {leadStatusOptions.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                      <button className="btn-secondary">
                        <CheckCircle2 aria-hidden="true" size={16} />
                        Save
                      </button>
                    </form>
                  </div>

                  <details className="mt-4 rounded-lg border border-field bg-white">
                    <summary className="cursor-pointer px-4 py-3 text-sm font-bold">
                      View lead details
                    </summary>
                    <div className="grid gap-4 border-t border-field p-4 lg:grid-cols-2">
                      <div className="space-y-2 text-sm text-slate-600">
                        <p>
                          <span className="font-semibold text-ink">From:</span>{" "}
                          {lead.from_name || "Unknown"} {lead.from_email ? `<${lead.from_email}>` : ""}
                        </p>
                        <p>
                          <span className="font-semibold text-ink">Sent to:</span>{" "}
                          {lead.original_recipient || "Not found"}
                        </p>
                        <p>
                          <span className="font-semibold text-ink">Phone:</span>{" "}
                          {lead.phone || "Not found"}
                        </p>
                        <p>
                          <span className="font-semibold text-ink">Postcode:</span>{" "}
                          {lead.postcode || "Not found"}
                        </p>
                      </div>
                      <p className="whitespace-pre-line rounded-lg bg-mist p-4 text-sm leading-6 text-slate-700">
                        {lead.job_description || lead.body_text || "No message body found."}
                      </p>
                    </div>
                  </details>

                  <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                    <form action={convertLeadToCustomer}>
                      <input name="id" type="hidden" value={lead.id} />
                      <button className="btn-primary w-full">
                        <UserPlus aria-hidden="true" size={16} />
                        Convert to customer
                      </button>
                    </form>
                    <form action={convertLeadToQuote}>
                      <input name="id" type="hidden" value={lead.id} />
                      <button className="btn-accent w-full">Convert to quote</button>
                    </form>
                    <form action={markLeadAsSpam}>
                      <input name="id" type="hidden" value={lead.id} />
                      <button className="btn-secondary w-full text-slate-600 hover:text-ink">
                        <ShieldAlert aria-hidden="true" size={16} />
                        Mark as spam
                      </button>
                    </form>
                    <form action={deleteLead}>
                      <input name="id" type="hidden" value={lead.id} />
                      <button className="btn-secondary w-full text-slate-600 hover:border-[#ffd8c2] hover:bg-[#fff5ef] hover:text-[#d94800]">
                        <Trash2 aria-hidden="true" size={16} />
                        Delete
                      </button>
                    </form>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="px-5 py-10 text-center">
              <div className="mx-auto flex size-12 items-center justify-center rounded-lg bg-field text-forest">
                <MailPlus aria-hidden="true" size={24} />
              </div>
              <h2 className="mt-4 text-lg font-semibold">No leads yet</h2>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                Use your lead email address on websites like Bark,
                Checkatrade, Facebook, MyBuilder, or Totaljobs.
              </p>
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
