import { Activity, MailPlus, ShieldCheck, Trash2, UsersRound } from "lucide-react";
import { redirect } from "next/navigation";
import {
  inviteTeamMember,
  removeTeamMember,
} from "@/app/dashboard/team/actions";
import { AppShell } from "@/components/app-shell";
import { hasProAccess } from "@/lib/subscription";
import { createAdminClient } from "@/lib/supabase/admin";
import { createPersonalClient } from "@/lib/supabase/server";
import { getWorkspaceContext } from "@/lib/workspace";

type TeamPageProps = {
  searchParams: Promise<{ message?: string }>;
};

export default async function TeamPage({ searchParams }: TeamPageProps) {
  const search = await searchParams;
  const supabase = await createPersonalClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirectedFrom=/dashboard/team");

  const workspace = await getWorkspaceContext(supabase, user);
  const admin = createAdminClient();
  const [
    { data: ownerProfile },
    { data: memberships, error },
    { data: activity },
  ] =
    await Promise.all([
      admin
        .from("profiles")
        .select("business_name, plan, subscription_status, trial_expires_at")
        .eq("id", workspace.ownerUserId)
        .maybeSingle(),
      admin
        .from("workspace_members")
        .select("id, user_id, role, status, joined_at")
        .eq("owner_user_id", workspace.ownerUserId)
        .eq("status", "active")
        .order("joined_at", { ascending: true }),
      admin
        .from("workspace_activity_logs")
        .select("id, actor_user_id, action, entity_type, created_at")
        .eq("owner_user_id", workspace.ownerUserId)
        .order("created_at", { ascending: false })
        .limit(15),
    ]);

  if (!hasProAccess(ownerProfile)) {
    redirect("/pricing?message=Team access is available on Tradio Pro and Elite.");
  }
  if (error) {
    redirect(`/dashboard?message=${encodeURIComponent(error.message)}`);
  }

  const members = await Promise.all(
    (memberships ?? []).map(async (membership) => {
      const { data } = await admin.auth.admin.getUserById(membership.user_id);
      return { ...membership, email: data.user?.email ?? "Unknown account" };
    }),
  );
  const actorIds = Array.from(
    new Set<string>(
      (activity ?? [])
        .map((item) => item.actor_user_id)
        .filter((actorId): actorId is string => Boolean(actorId)),
    ),
  );
  const actorEmails = new Map<string, string>();
  await Promise.all(
    actorIds.map(async (actorId) => {
      const { data } = await admin.auth.admin.getUserById(actorId);
      actorEmails.set(actorId, data.user?.email ?? "Former team member");
    }),
  );
  const seatLimit = ownerProfile?.plan === "elite" ? null : 2;

  return (
    <AppShell active="team" plan={ownerProfile?.plan}>
      <header className="app-page-header">
        <div>
          <p className="eyebrow">Pro team workspace</p>
          <h1 className="page-title">Work together from one business account.</h1>
        </div>
      </header>

      <div className="app-page-body space-y-6">
        {search.message ? <p className="notice">{search.message}</p> : null}

        <section className="surface-pad">
          <div className="flex items-start gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-field text-forest">
              <UsersRound aria-hidden="true" size={20} />
            </div>
            <div>
              <h2 className="font-semibold">{ownerProfile?.business_name || "Your workspace"}</h2>
              <p className="mt-1 text-sm text-slate-500">
                {members.length + 1} active user{members.length ? "s" : ""}
                {seatLimit ? ` of ${seatLimit} included` : " with unlimited Elite seats"}.
              </p>
            </div>
          </div>

          {workspace.isOwner ? (
            <form action={inviteTeamMember} className="mt-6 flex flex-col gap-3 rounded-lg border border-field bg-mist p-4 sm:flex-row sm:items-end">
              <div className="min-w-0 flex-1">
                <label className="text-sm font-medium" htmlFor="team-email">Team member email</label>
                <input className="field-control" id="team-email" name="email" placeholder="team@example.com" required type="email" />
              </div>
              <button className="btn-accent sm:mb-0.5">
                <MailPlus aria-hidden="true" size={17} />
                Invite member
              </button>
            </form>
          ) : (
            <p className="notice mt-6">You are a team member. Only the workspace owner can add or remove people.</p>
          )}
        </section>

        <section className="surface overflow-hidden">
          <div className="border-b border-field px-5 py-4">
            <h2 className="font-semibold">Workspace members</h2>
          </div>
          <div className="divide-y divide-field">
            <article className="flex items-center justify-between gap-4 px-5 py-4">
              <div>
                <p className="font-semibold">Workspace owner</p>
                <p className="mt-1 text-sm text-slate-500">Owns billing and business settings</p>
              </div>
              <span className="status-pill bg-[#e7f7ef] text-[#177a55]">
                <ShieldCheck aria-hidden="true" size={13} /> Owner
              </span>
            </article>
            {members.map((member) => (
              <article className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between" key={member.id}>
                <div>
                  <p className="font-semibold">{member.email}</p>
                  <p className="mt-1 text-sm text-slate-500">Shared workspace member</p>
                </div>
                {workspace.isOwner ? (
                  <form action={removeTeamMember}>
                    <input name="member_id" type="hidden" value={member.id} />
                    <button className="btn-secondary text-slate-600">
                      <Trash2 aria-hidden="true" size={16} /> Remove
                    </button>
                  </form>
                ) : null}
              </article>
            ))}
          </div>
        </section>

        <section className="surface overflow-hidden">
          <div className="flex items-center gap-3 border-b border-field px-5 py-4">
            <Activity aria-hidden="true" className="text-copper" size={19} />
            <div>
              <h2 className="font-semibold">Recent activity</h2>
              <p className="mt-1 text-sm text-slate-500">See who changed shared workspace records.</p>
            </div>
          </div>
          <div className="divide-y divide-field">
            {(activity ?? []).length ? (
              (activity ?? []).map((item) => (
                <article className="flex flex-col gap-1 px-5 py-3 text-sm sm:flex-row sm:items-center sm:justify-between" key={item.id}>
                  <p>
                    <span className="font-semibold">{item.actor_user_id ? actorEmails.get(item.actor_user_id) : "System"}</span>{" "}
                    {item.action} {item.entity_type.replaceAll("_", " ")}.
                  </p>
                  <time className="text-xs text-slate-500">
                    {new Date(item.created_at).toLocaleString("en-GB")}
                  </time>
                </article>
              ))
            ) : (
              <p className="px-5 py-5 text-sm text-slate-500">No shared activity yet.</p>
            )}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
