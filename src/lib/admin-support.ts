import { redirect } from "next/navigation";
import { hasAdminAccess } from "@/lib/admin-access";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type AdminProfile = {
  business_name?: string | null;
  full_name?: string | null;
  role?: string | null;
};

export async function requireAdmin() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("business_name, full_name, role")
    .eq("id", user.id)
    .maybeSingle<AdminProfile>();

  if (!hasAdminAccess(profile?.role, user.email)) {
    redirect("/dashboard?message=Admin access is required.");
  }

  return { adminProfile: profile, adminUser: user };
}

export async function logAdminSupportAccess({
  action,
  adminUserId,
  targetUserId,
}: {
  action: string;
  adminUserId: string;
  targetUserId?: string | null;
}) {
  const admin = createAdminClient();
  const { error } = await admin.from("admin_support_access_logs").insert({
    action,
    admin_user_id: adminUserId,
    target_user_id: targetUserId ?? null,
  });

  if (error) {
    console.error("Could not record admin support access.", error.message);
  }
}
