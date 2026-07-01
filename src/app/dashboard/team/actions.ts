"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { sendSmtpEmail } from "@/lib/smtp";
import { hasProAccess } from "@/lib/subscription";
import { createAdminClient } from "@/lib/supabase/admin";
import { createPersonalClient } from "@/lib/supabase/server";

function teamRedirect(message: string): never {
  redirect(`/dashboard/team?message=${encodeURIComponent(message)}`);
}

function formValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"]/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
  })[character] ?? character);
}

async function findUserByEmail(email: string) {
  const admin = createAdminClient();

  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: 100,
    });
    if (error) throw new Error(error.message);

    const match = data.users.find(
      (user) => user.email?.toLowerCase() === email.toLowerCase(),
    );
    if (match || data.users.length < 100) return match ?? null;
  }

  return null;
}

async function requireTeamOwner() {
  const supabase = await createPersonalClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirectedFrom=/dashboard/team");

  const admin = createAdminClient();
  const { data: membership } = await admin
    .from("workspace_members")
    .select("owner_user_id")
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  if (membership) teamRedirect("Only the workspace owner can manage the team.");

  const { data: profile, error } = await admin
    .from("profiles")
    .select("business_name, plan, subscription_status, trial_expires_at")
    .eq("id", user.id)
    .maybeSingle();
  if (error) teamRedirect(error.message);

  if (!hasProAccess(profile)) {
    redirect(
      "/pricing?message=Team access is available on Tradio Pro and Elite.",
    );
  }

  return { admin, profile, user };
}

export async function inviteTeamMember(formData: FormData) {
  const email = formValue(formData, "email").toLowerCase();
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    teamRedirect("Enter a valid email address.");
  }

  const { admin, profile, user } = await requireTeamOwner();
  if (email === user.email?.toLowerCase()) {
    teamRedirect("You are already the workspace owner.");
  }

  const { count, error: countError } = await admin
    .from("workspace_members")
    .select("id", { count: "exact", head: true })
    .eq("owner_user_id", user.id)
    .eq("status", "active");
  if (countError) teamRedirect(countError.message);

  if (profile?.plan !== "elite" && (count ?? 0) >= 1) {
    teamRedirect("Tradio Pro includes the owner and one team member. Upgrade to Elite for more seats.");
  }

  let invitedUser = await findUserByEmail(email);
  let invitationSentBySupabase = false;

  if (!invitedUser) {
    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.APP_URL ||
      "https://tradio.uk";
    const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${siteUrl.replace(/\/$/, "")}/auth/callback?next=/dashboard/team`,
    });
    if (error || !data.user) {
      teamRedirect(error?.message ?? "The invitation could not be created.");
    }
    invitedUser = data.user;
    invitationSentBySupabase = true;
  }

  const { data: existingMembership } = await admin
    .from("workspace_members")
    .select("owner_user_id, status")
    .eq("user_id", invitedUser.id)
    .maybeSingle();

  if (
    existingMembership?.status === "active" &&
    existingMembership.owner_user_id !== user.id
  ) {
    teamRedirect("This person already belongs to another Tradio workspace.");
  }

  const { error } = await admin.from("workspace_members").upsert(
    {
      invited_by: user.id,
      owner_user_id: user.id,
      role: "member",
      status: "active",
      user_id: invitedUser.id,
    },
    { onConflict: "user_id" },
  );
  if (error) teamRedirect(error.message);

  await admin.from("workspace_activity_logs").insert({
    action: "invited",
    actor_user_id: user.id,
    entity_type: "workspace_member",
    metadata: { email },
    owner_user_id: user.id,
  });

  let emailWarning = "";
  if (!invitationSentBySupabase) {
    const from = process.env.EMAIL_FROM || process.env.SMTP_USER;
    try {
      if (!from) throw new Error("Email sender is not configured.");
      const businessName = profile?.business_name || "a Tradio business";
      await sendSmtpEmail({
        from,
        html: `<p>You have been added to <strong>${escapeHtml(businessName)}</strong> on Tradio.</p><p><a href="https://tradio.uk/login">Log in to open the shared workspace</a>.</p>`,
        subject: `You have been added to ${businessName} on Tradio`,
        text: `You have been added to ${businessName} on Tradio. Log in at https://tradio.uk/login`,
        to: email,
      });
    } catch {
      emailWarning = " The account was added, but the notification email could not be sent.";
    }
  }

  revalidatePath("/dashboard/team");
  teamRedirect(`Team member added.${emailWarning}`);
}

export async function removeTeamMember(formData: FormData) {
  const memberId = formValue(formData, "member_id");
  if (!memberId) teamRedirect("Team member not found.");

  const { admin, user } = await requireTeamOwner();
  const { data: member, error: memberError } = await admin
    .from("workspace_members")
    .select("user_id")
    .eq("id", memberId)
    .eq("owner_user_id", user.id)
    .maybeSingle();
  if (memberError || !member) teamRedirect(memberError?.message ?? "Team member not found.");

  const { error } = await admin
    .from("workspace_members")
    .delete()
    .eq("id", memberId)
    .eq("owner_user_id", user.id);
  if (error) teamRedirect(error.message);

  await admin.from("workspace_activity_logs").insert({
    action: "removed",
    actor_user_id: user.id,
    entity_id: member.user_id,
    entity_type: "workspace_member",
    owner_user_id: user.id,
  });

  revalidatePath("/dashboard/team");
  teamRedirect("Team member removed. Their personal account remains active.");
}
