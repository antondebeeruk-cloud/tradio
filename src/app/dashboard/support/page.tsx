import Link from "next/link";
import { Lock, Mail } from "lucide-react";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { SupportAiChat } from "@/components/support-ai-chat";
import { hasEliteAccess } from "@/lib/subscription";
import { createClient } from "@/lib/supabase/server";

export default async function SupportPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirectedFrom=/dashboard/support");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan, subscription_status, trial_expires_at")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <AppShell active="support" plan={profile?.plan}>
      <header className="app-page-header">
        <div>
          <p className="eyebrow">Support AI</p>
          <h1 className="page-title">Get help using Tradio.</h1>
        </div>
      </header>

      <div className="app-page-body">
        {hasEliteAccess(profile) ? (
          <SupportAiChat />
        ) : (
          <section className="surface-pad text-center">
            <div className="mx-auto flex size-12 items-center justify-center rounded-lg bg-[#fff0e7] text-copper">
              <Lock aria-hidden="true" size={22} />
            </div>
            <h2 className="mt-4 text-lg font-semibold">
              Support AI is available on Elite.
            </h2>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-600">
              Upgrade for instant built-in answers about Tradio. Email support
              remains available on every paid plan.
            </p>
            <div className="mt-5 flex flex-col justify-center gap-3 sm:flex-row">
              <Link className="btn-accent" href="/pricing">
                <Lock aria-hidden="true" size={17} />
                Upgrade to Elite
              </Link>
              <a className="btn-secondary" href="mailto:hello@tradio.uk">
                <Mail aria-hidden="true" size={17} />
                Email support
              </a>
            </div>
          </section>
        )}
      </div>
    </AppShell>
  );
}
