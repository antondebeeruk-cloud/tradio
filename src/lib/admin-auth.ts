import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createPersonalClient } from "@/lib/supabase/server";

export async function requirePlatformAdmin() {
  const supabase = await createPersonalClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/admin/login?message=Please log in with an administrator account.");
  }

  const service = createAdminClient();
  const { data: membership, error } = await service
    .from("platform_admins")
    .select("user_id, created_at")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    redirect(
      `/admin/login?message=${encodeURIComponent(
        "Admin setup is incomplete. Run supabase/admin-portal.sql first.",
      )}`,
    );
  }

  if (!membership) {
    redirect("/admin/login?message=This account does not have administrator access.");
  }

  return { service, user };
}

export async function writeAdminAuditLog({
  action,
  adminUserId,
  metadata,
  targetUserId,
}: {
  action: string;
  adminUserId: string;
  metadata?: Record<string, unknown>;
  targetUserId?: string;
}) {
  const service = createAdminClient();

  await service.from("platform_admin_audit_logs").insert({
    action,
    admin_user_id: adminUserId,
    metadata: metadata ?? {},
    target_user_id: targetUserId ?? null,
  });
}
