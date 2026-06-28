"use server";

import { redirect } from "next/navigation";
import { createPayPalSubscription, paypalPlanId } from "@/lib/paypal";
import { siteUrl } from "@/lib/site-url";
import { hasActiveSubscription, trialExpiryDate } from "@/lib/subscription";
import { createClient } from "@/lib/supabase/server";

type PaidPlan = "lite" | "pro" | "elite";
type BillingInterval = "monthly" | "annual";

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirectedFrom=/pricing");
  }

  return { supabase, user };
}

export async function startFreeTrial() {
  const { supabase, user } = await requireUser();
  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("plan, subscription_status, trial_expires_at")
    .eq("id", user.id)
    .maybeSingle();

  if (
    hasActiveSubscription(existingProfile) ||
    existingProfile?.plan === "trial"
  ) {
    redirect("/pricing?message=The free trial has already been used on this account.");
  }

  const { error } = await supabase.from("profiles").upsert({
    id: user.id,
    plan: "trial",
    billing_interval: null,
    subscription_status: "active",
    trial_expires_at: trialExpiryDate().toISOString(),
    pending_paypal_subscription_id: null,
    pending_plan: null,
    pending_billing_interval: null,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    redirect(`/pricing?message=${encodeURIComponent(error.message)}`);
  }

  redirect("/dashboard");
}

export async function startPayPalCheckout(formData: FormData) {
  const plan = getString(formData, "plan") as PaidPlan;
  const billingInterval = getString(
    formData,
    "billing_interval",
  ) as BillingInterval;

  if (!["lite", "pro", "elite"].includes(plan)) {
    redirect("/pricing?message=Choose a valid plan.");
  }
  if (!["monthly", "annual"].includes(billingInterval)) {
    redirect("/pricing?message=Choose monthly or annual billing.");
  }

  const { supabase, user } = await requireUser();
  const origin = siteUrl();
  let approvalUrl = "";

  try {
    const subscription = await createPayPalSubscription({
      cancelUrl: `${origin}/pricing/paypal/cancel`,
      customId: `${user.id}:${plan}:${billingInterval}`,
      planId: paypalPlanId(plan, billingInterval),
      returnUrl: `${origin}/pricing/paypal/success`,
    });

    const { error } = await supabase.from("profiles").upsert({
      id: user.id,
      pending_paypal_subscription_id: subscription.id,
      pending_plan: plan,
      pending_billing_interval: billingInterval,
      updated_at: new Date().toISOString(),
    });

    if (error) {
      throw new Error(error.message);
    }

    approvalUrl = subscription.approvalUrl;
  } catch (error) {
    redirect(
      `/pricing?message=${encodeURIComponent(
        error instanceof Error ? error.message : "PayPal checkout failed.",
      )}`,
    );
  }

  redirect(approvalUrl);
}
