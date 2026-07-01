"use server";

import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createPersonalClient } from "@/lib/supabase/server";

function value(formData: FormData, key: string) {
  const entry = formData.get(key);
  return typeof entry === "string" ? entry.trim() : "";
}

export async function adminLogin(formData: FormData) {
  const email = value(formData, "email");
  const password = value(formData, "password");
  const supabase = await createPersonalClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.user) {
    redirect(
      `/admin/login?message=${encodeURIComponent(
        error?.message ?? "Administrator login failed.",
      )}`,
    );
  }

  const service = createAdminClient();
  const { data: membership, error: membershipError } = await service
    .from("platform_admins")
    .select("user_id")
    .eq("user_id", data.user.id)
    .maybeSingle();

  if (membershipError || !membership) {
    await supabase.auth.signOut();
    redirect(
      `/admin/login?message=${encodeURIComponent(
        membershipError
          ? "Admin setup is incomplete. Run supabase/admin-portal.sql first."
          : "This account does not have administrator access.",
      )}`,
    );
  }

  redirect("/admin");
}

export async function adminLogout() {
  const supabase = await createPersonalClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}
