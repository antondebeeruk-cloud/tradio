"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createPersonalClient } from "@/lib/supabase/server";

export async function updatePassword(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  const confirmation = String(formData.get("password_confirmation") ?? "");
  if (password.length < 8) redirect("/reset-password?message=Use at least 8 characters.");
  if (password !== confirmation) redirect("/reset-password?message=The passwords do not match.");
  const supabase = await createPersonalClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/forgot-password?message=Your reset link has expired. Request a new one.");
  const { error } = await supabase.auth.updateUser({ password });
  if (error) redirect(`/reset-password?message=${encodeURIComponent(error.message)}`);
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login?message=Password updated. Log in with your new password.");
}
