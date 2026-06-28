import { NextResponse, type NextRequest } from "next/server";
import { cancelPayPalSubscription, getPayPalSubscription } from "@/lib/paypal";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login?redirectedFrom=/pricing", request.url));
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "paypal_subscription_id, pending_paypal_subscription_id, pending_plan, pending_billing_interval",
    )
    .eq("id", user.id)
    .maybeSingle();

  if (
    !profile?.pending_paypal_subscription_id ||
    !["lite", "pro", "elite"].includes(profile.pending_plan ?? "") ||
    !["monthly", "annual"].includes(profile.pending_billing_interval ?? "")
  ) {
    return NextResponse.redirect(
      new URL("/pricing?message=No pending PayPal subscription was found.", request.url),
    );
  }

  try {
    const subscription = await getPayPalSubscription(
      profile.pending_paypal_subscription_id,
    );

    if (subscription.status !== "ACTIVE") {
      return NextResponse.redirect(
        new URL(
          `/pricing?message=${encodeURIComponent(
            "PayPal has not activated the subscription yet. Please try again in a moment.",
          )}`,
          request.url,
        ),
      );
    }

    const { error: updateError } = await supabase.from("profiles").upsert({
      id: user.id,
      paypal_subscription_id: subscription.id,
      plan: profile.pending_plan,
      billing_interval: profile.pending_billing_interval,
      subscription_status: "active",
      trial_expires_at: null,
      pending_paypal_subscription_id: null,
      pending_plan: null,
      pending_billing_interval: null,
      updated_at: new Date().toISOString(),
    });

    if (updateError) {
      throw new Error(updateError.message);
    }

    if (
      profile.paypal_subscription_id &&
      profile.paypal_subscription_id !== subscription.id
    ) {
      await cancelPayPalSubscription(
        profile.paypal_subscription_id,
        "Replaced by a new Tradio subscription.",
      );
    }

    return NextResponse.redirect(new URL("/dashboard", request.url));
  } catch (error) {
    return NextResponse.redirect(
      new URL(
        `/pricing?message=${encodeURIComponent(
          error instanceof Error
            ? error.message
            : "PayPal subscription could not be verified.",
        )}`,
        request.url,
      ),
    );
  }
}
