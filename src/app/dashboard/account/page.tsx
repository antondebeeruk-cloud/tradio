import Link from "next/link";
import { Download, ShieldCheck, Trash2, XCircle } from "lucide-react";
import { redirect } from "next/navigation";
import {
  cancelSubscription,
  requestAccountDeletion,
} from "@/app/dashboard/account/actions";
import { AppShell } from "@/components/app-shell";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { formatDate } from "@/lib/documents";
import { createClient } from "@/lib/supabase/server";

type AccountPageProps = {
  searchParams: {
    message?: string;
  };
};

function planLabel(plan?: string | null) {
  if (plan === "trial") {
    return "Trial";
  }

  if (plan === "lite") {
    return "Lite";
  }

  if (plan === "elite") {
    return "Elite";
  }

  return "No plan selected";
}

export default async function AccountPage({ searchParams }: AccountPageProps) {
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
      "full_name, business_name, plan, subscription_status, trial_expires_at, paypal_subscription_id, cancelled_at, data_deletion_requested_at",
    )
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    redirect(`/dashboard?message=${encodeURIComponent(error.message)}`);
  }

  const details = [
    { label: "Email", value: user.email ?? "Not available" },
    { label: "Current plan", value: planLabel(profile?.plan) },
    {
      label: "Subscription status",
      value: profile?.subscription_status ?? "Not active",
    },
    {
      label: "Trial expiry",
      value: profile?.trial_expires_at
        ? formatDate(profile.trial_expires_at)
        : "Not on trial",
    },
    {
      label: "PayPal subscription ID",
      value: profile?.paypal_subscription_id ?? "Not connected",
    },
    {
      label: "Cancelled at",
      value: profile?.cancelled_at ? formatDate(profile.cancelled_at) : "Not cancelled",
    },
    {
      label: "Deletion requested",
      value: profile?.data_deletion_requested_at
        ? formatDate(profile.data_deletion_requested_at)
        : "No request recorded",
    },
  ];

  return (
    <AppShell active="account" plan={profile?.plan}>
      <header className="app-page-header">
        <div>
          <p className="eyebrow">Account</p>
          <h1 className="page-title">Manage your Tradio account.</h1>
        </div>
      </header>

      <div className="app-page-body">
        {searchParams.message ? (
          <p className="notice mb-5">{searchParams.message}</p>
        ) : null}

        <section className="surface-pad">
          <div className="flex items-start gap-4">
            <div className="flex size-11 items-center justify-center rounded-lg bg-field text-forest">
              <ShieldCheck aria-hidden="true" size={22} />
            </div>
            <div>
              <h2 className="text-lg font-semibold">
                {profile?.full_name || profile?.business_name || user.email}
              </h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                Review subscription details, export your data, or request
                account deletion.
              </p>
            </div>
          </div>

          <dl className="mt-6 grid gap-4 md:grid-cols-2">
            {details.map((detail) => (
              <div className="rounded-lg border border-field bg-mist p-4" key={detail.label}>
                <dt className="text-xs font-semibold uppercase text-slate-500">
                  {detail.label}
                </dt>
                <dd className="mt-2 break-words text-sm font-semibold text-ink">
                  {detail.value}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="mt-6 grid gap-5 lg:grid-cols-2">
          <article className="surface-pad">
            <h2 className="text-lg font-semibold">Subscription</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Upgrade your plan from pricing, or cancel a connected PayPal
              subscription.
            </p>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <Link className="btn-accent" href="/pricing">
                Upgrade plan
              </Link>
              <form action={cancelSubscription} id="cancel-subscription">
                <ConfirmSubmitButton
                  className="btn-secondary"
                  message="Cancel this subscription? This will contact PayPal when a PayPal subscription ID is connected."
                >
                  <XCircle aria-hidden="true" size={16} />
                  Cancel subscription
                </ConfirmSubmitButton>
              </form>
            </div>
          </article>

          <article className="surface-pad">
            <h2 className="text-lg font-semibold">Privacy controls</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Export your account data or record a deletion request for manual
              follow-up.
            </p>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <Link className="btn-primary" href="/dashboard/account/export">
                <Download aria-hidden="true" size={16} />
                Export my data
              </Link>
              <form action={requestAccountDeletion}>
                <ConfirmSubmitButton
                  className="btn-secondary text-slate-600 hover:text-ink"
                  message="Request account deletion? This records the request for follow-up."
                >
                  <Trash2 aria-hidden="true" size={16} />
                  Request deletion
                </ConfirmSubmitButton>
              </form>
            </div>
          </article>
        </section>
      </div>
    </AppShell>
  );
}
