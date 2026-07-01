"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { processRecurringJobs } from "@/lib/recurring-jobs";
import { hasProAccess } from "@/lib/subscription";
import { createClient } from "@/lib/supabase/server";

function value(formData: FormData, key: string) { const entry = formData.get(key); return typeof entry === "string" ? entry.trim() : ""; }
function recurringRedirect(message: string): never { redirect(`/dashboard/recurring?message=${encodeURIComponent(message)}`); }
async function requireProUser() {
  const supabase = await createClient(); const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirectedFrom=/dashboard/recurring");
  const { data: profile } = await supabase.from("profiles").select("plan,subscription_status,trial_expires_at").eq("id", user.id).maybeSingle();
  if (!hasProAccess(profile)) redirect("/pricing?message=Recurring Work is available on Tradio Pro and Elite.");
  return { supabase, user };
}
export async function createRecurringJob(formData: FormData) {
  const { supabase, user } = await requireProUser(); const startDate = value(formData, "start_date");
  const frequency = value(formData, "frequency");
  if (!startDate || !["weekly","fortnightly","monthly","quarterly","annually"].includes(frequency)) recurringRedirect("Add a valid start date and frequency.");
  const { error } = await supabase.from("recurring_jobs").insert({ customer_id: value(formData,"customer_id"), description: value(formData,"description") || null, duration_minutes: Math.max(Number(value(formData,"duration_minutes")) || 60, 15), end_date: value(formData,"end_date") || null, expected_value: Math.max(Number(value(formData,"expected_value")) || 0, 0), frequency, job_type: value(formData,"job_type") || null, location: value(formData,"location") || null, next_run_date: startDate, notes: value(formData,"notes") || null, send_reminder: formData.get("send_reminder") === "on", start_date: startDate, title: value(formData,"title"), user_id: user.id, visit_time: value(formData,"visit_time") || "09:00" });
  if (error) recurringRedirect(error.message); await processRecurringJobs(); revalidatePath("/dashboard/recurring"); revalidatePath("/dashboard/jobs"); revalidatePath("/dashboard/calendar"); recurringRedirect("Recurring work created and upcoming visits generated.");
}
export async function updateRecurringStatus(formData: FormData) {
  const { supabase, user } = await requireProUser(); const status = value(formData,"status");
  if (!["active","paused","cancelled"].includes(status)) recurringRedirect("Invalid status.");
  const { error } = await supabase.from("recurring_jobs").update({ status, updated_at: new Date().toISOString() }).eq("id", value(formData,"id")).eq("user_id", user.id);
  if (error) recurringRedirect(error.message); revalidatePath("/dashboard/recurring"); recurringRedirect(`Recurring work ${status}.`);
}
export async function deleteRecurringJob(formData: FormData) {
  const { supabase, user } = await requireProUser(); const { error } = await supabase.from("recurring_jobs").delete().eq("id", value(formData,"id")).eq("user_id", user.id);
  if (error) recurringRedirect(error.message); revalidatePath("/dashboard/recurring"); recurringRedirect("Recurring work deleted. Existing jobs were kept.");
}
export async function generateRecurringJobsNow() { await requireProUser(); const result = await processRecurringJobs(); revalidatePath("/dashboard/recurring"); revalidatePath("/dashboard/jobs"); recurringRedirect(`${result.generated} upcoming job${result.generated === 1 ? "" : "s"} generated.`); }
