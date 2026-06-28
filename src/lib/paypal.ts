type TradioPaidPlan = "lite" | "pro" | "elite";
type BillingInterval = "monthly" | "annual";

type PayPalLink = {
  href: string;
  rel: string;
};

type PayPalSubscriptionResponse = {
  id: string;
  links?: PayPalLink[];
  status?: string;
};

const paypalEnvironment = process.env.PAYPAL_ENVIRONMENT ?? "sandbox";
const paypalBaseUrl =
  paypalEnvironment === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";

function requireEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is not configured.`);
  }

  return value;
}

export function paypalPlanId(
  plan: TradioPaidPlan,
  billingInterval: BillingInterval,
) {
  const intervalName = billingInterval === "annual" ? "ANNUAL" : "MONTHLY";
  return requireEnv(`PAYPAL_${plan.toUpperCase()}_${intervalName}_PLAN_ID`);
}

async function paypalAccessToken() {
  const clientId = requireEnv("PAYPAL_CLIENT_ID");
  const clientSecret = requireEnv("PAYPAL_CLIENT_SECRET");
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString(
    "base64",
  );

  const response = await fetch(`${paypalBaseUrl}/v1/oauth2/token`, {
    body: "grant_type=client_credentials",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    method: "POST",
  });

  if (!response.ok) {
    throw new Error("PayPal authentication failed.");
  }

  const data = (await response.json()) as { access_token?: string };

  if (!data.access_token) {
    throw new Error("PayPal did not return an access token.");
  }

  return data.access_token;
}

export async function createPayPalSubscription({
  cancelUrl,
  customId,
  planId,
  returnUrl,
}: {
  cancelUrl: string;
  customId: string;
  planId: string;
  returnUrl: string;
}) {
  const accessToken = await paypalAccessToken();
  const response = await fetch(`${paypalBaseUrl}/v1/billing/subscriptions`, {
    body: JSON.stringify({
      application_context: {
        brand_name: "Tradio",
        cancel_url: cancelUrl,
        return_url: returnUrl,
        shipping_preference: "NO_SHIPPING",
        user_action: "SUBSCRIBE_NOW",
      },
      custom_id: customId,
      plan_id: planId,
    }),
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "PayPal-Request-Id": crypto.randomUUID(),
    },
    method: "POST",
  });

  if (!response.ok) {
    throw new Error("PayPal checkout could not be created.");
  }

  const data = (await response.json()) as PayPalSubscriptionResponse;
  const approvalUrl = data.links?.find((link) => link.rel === "approve")?.href;

  if (!data.id || !approvalUrl) {
    throw new Error("PayPal did not return a checkout link.");
  }

  return {
    approvalUrl,
    id: data.id,
  };
}

export async function getPayPalSubscription(subscriptionId: string) {
  const accessToken = await paypalAccessToken();
  const response = await fetch(
    `${paypalBaseUrl}/v1/billing/subscriptions/${subscriptionId}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      method: "GET",
    },
  );

  if (!response.ok) {
    throw new Error("PayPal subscription could not be verified.");
  }

  return (await response.json()) as PayPalSubscriptionResponse;
}

export async function cancelPayPalSubscription(
  subscriptionId: string,
  reason = "Cancelled from Tradio account settings.",
) {
  const accessToken = await paypalAccessToken();
  const response = await fetch(
    `${paypalBaseUrl}/v1/billing/subscriptions/${subscriptionId}/cancel`,
    {
      body: JSON.stringify({ reason }),
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      method: "POST",
    },
  );

  if (!response.ok) {
    throw new Error("PayPal subscription could not be cancelled.");
  }
}
