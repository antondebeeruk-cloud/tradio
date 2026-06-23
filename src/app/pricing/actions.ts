"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createPayPalSubscription, paypalPlanId } from "@/lib/paypal";
import { trialExpiryDate } from "@/lib/subscription";
import { createClient } from "@/lib/supabase/server";

type PaidPlan = "lite" | "elite";

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

async function requireUser() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirectedFrom=/pricing");
  }

  return { supabase, user };
}

function requestOrigin() {
  const headerStore = headers();
  return (
    headerStore.get("origin") ??
    process.env.NEXT_PUBLIC_APP_URL ??
    "http://localhost:3000"
  );
}

export async function startFreeTrial() {
  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("profiles").upsert({
    id: user.id,
    plan: "trial",
    subscription_status: "active",
    trial_expires_at: trialExpiryDate().toISOString(),
    updated_at: new Date().toISOString(),
  });

  if (error) {
    redirect(`/pricing?message=${encodeURIComponent(error.message)}`);
  }

  redirect("/dashboard");
}

export async function startPayPalCheckout(formData: FormData) {
  const plan = getString(formData, "plan") as PaidPlan;

  if (plan !== "lite" && plan !== "elite") {
    redirect("/pricing?message=Choose a valid plan.");
  }

  const { supabase, user } = await requireUser();
  const origin = requestOrigin();

  try {
    const subscription = await createPayPalSubscription({
      cancelUrl: `${origin}/pricing/paypal/cancel`,
      customId: `${user.id}:${plan}`,
      planId: paypalPlanId(plan),
      returnUrl: `${origin}/pricing/paypal/success`,
    });

    const { error } = await supabase.from("profiles").upsert({
      id: user.id,
      paypal_subscription_id: subscription.id,
      plan,
      subscription_status: "pending",
      trial_expires_at: null,
      updated_at: new Date().toISOString(),
    });

    if (error) {
      redirect(`/pricing?message=${encodeURIComponent(error.message)}`);
    }

    redirect(subscription.approvalUrl);
  } catch (error) {
    redirect(
      `/pricing?message=${encodeURIComponent(
        error instanceof Error ? error.message : "PayPal checkout failed.",
      )}`,
    );
  }
}
