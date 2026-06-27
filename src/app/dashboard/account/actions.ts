"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cancelPayPalSubscription } from "@/lib/paypal";
import { createClient } from "@/lib/supabase/server";

async function requireUser() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return { supabase, user };
}

export async function cancelSubscription() {
  const { supabase, user } = await requireUser();
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("paypal_subscription_id")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    redirect(`/dashboard/account?message=${encodeURIComponent(error.message)}`);
  }

  if (!profile?.paypal_subscription_id) {
    // TODO: Connect cancellation for non-PayPal or manually-created subscriptions.
    redirect(
      `/dashboard/account?message=${encodeURIComponent(
        "PayPal cancellation is not connected for this subscription yet.",
      )}`,
    );
  }

  try {
    await cancelPayPalSubscription(profile.paypal_subscription_id);
  } catch (paypalError) {
    const message =
      paypalError instanceof Error
        ? paypalError.message
        : "PayPal cancellation failed.";
    redirect(`/dashboard/account?message=${encodeURIComponent(message)}`);
  }

  const { error: updateError } = await supabase
    .from("profiles")
    .update({
      cancelled_at: new Date().toISOString(),
      subscription_status: "cancelled",
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (updateError) {
    redirect(`/dashboard/account?message=${encodeURIComponent(updateError.message)}`);
  }

  revalidatePath("/dashboard/account");
  redirect(
    `/dashboard/account?message=${encodeURIComponent(
      "Subscription cancelled. Your plan remains visible in your account records.",
    )}`,
  );
}

export async function requestAccountDeletion() {
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("profiles")
    .update({
      data_deletion_requested_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) {
    redirect(`/dashboard/account?message=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/dashboard/account");
  redirect(
    `/dashboard/account?message=${encodeURIComponent(
      "Account deletion request recorded.",
    )}`,
  );
}
