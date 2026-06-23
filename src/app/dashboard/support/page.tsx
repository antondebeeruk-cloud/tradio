import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { SupportAiChat } from "@/components/support-ai-chat";
import { createClient } from "@/lib/supabase/server";

export default async function SupportPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirectedFrom=/dashboard/support");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan")
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
        <SupportAiChat />
      </div>
    </AppShell>
  );
}
