import { NextResponse, type NextRequest } from "next/server";
import { getPayPalSubscription } from "@/lib/paypal";
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
    .select("plan, paypal_subscription_id")
    .eq("id", user.id)
    .maybeSingle();

  if (
    !profile?.paypal_subscription_id ||
    (profile.plan !== "lite" && profile.plan !== "elite")
  ) {
    return NextResponse.redirect(
      new URL("/pricing?message=No pending PayPal subscription was found.", request.url),
    );
  }

  try {
    const subscription = await getPayPalSubscription(
      profile.paypal_subscription_id,
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

    await supabase.from("profiles").upsert({
      id: user.id,
      paypal_subscription_id: subscription.id,
      plan: profile.plan,
      subscription_status: "active",
      trial_expires_at: null,
      updated_at: new Date().toISOString(),
    });

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
