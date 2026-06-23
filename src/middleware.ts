import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function hasActiveSubscription(profile: {
  plan: string | null;
  role: string | null;
  subscription_status: string | null;
  trial_expires_at: string | null;
} | null) {
  if (profile?.role === "admin") {
    return true;
  }

  if (!profile?.plan || profile.subscription_status !== "active") {
    return false;
  }

  if (profile.plan === "trial") {
    return profile.trial_expires_at
      ? new Date(profile.trial_expires_at).getTime() > Date.now()
      : false;
  }

  return profile.plan === "lite" || profile.plan === "elite";
}

function hasEliteAccess(profile: {
  plan: string | null;
  role: string | null;
  subscription_status: string | null;
  trial_expires_at: string | null;
} | null) {
  if (profile?.role === "admin") {
    return true;
  }

  if (!hasActiveSubscription(profile)) {
    return false;
  }

  return profile?.plan === "elite" || profile?.plan === "trial";
}

export async function middleware(request: NextRequest) {
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(
        cookiesToSet: {
          name: string;
          options: CookieOptions;
          value: string;
        }[],
      ) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });

        response = NextResponse.next({ request });

        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isEliteRoute =
    pathname.startsWith("/dashboard/reports") ||
    pathname.startsWith("/dashboard/jobs");
  const isProtectedRoute =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/customers") ||
    pathname.startsWith("/quotes") ||
    pathname.startsWith("/invoices") ||
    pathname.startsWith("/settings");
  const isPricingRoute = pathname.startsWith("/pricing");
  const isAuthRoute = pathname === "/login" || pathname === "/signup";

  if (isProtectedRoute && !user) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("redirectedFrom", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  if (isProtectedRoute && user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("plan, role, subscription_status, trial_expires_at")
      .eq("id", user.id)
      .maybeSingle();

    if (!hasActiveSubscription(profile)) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/pricing";
      redirectUrl.search = "";

      if (
        profile?.plan === "trial" &&
        profile.subscription_status === "active" &&
        profile.trial_expires_at
      ) {
        redirectUrl.searchParams.set("message", "Your free trial has expired.");
      }

      return NextResponse.redirect(redirectUrl);
    }

    if (isEliteRoute && !hasEliteAccess(profile)) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/pricing";
      redirectUrl.search = "";
      redirectUrl.searchParams.set(
        "message",
        "Reports and Job Tracking are available on Tradio Elite. Upgrade to unlock these features.",
      );
      return NextResponse.redirect(redirectUrl);
    }
  }

  if (isPricingRoute && !user) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("redirectedFrom", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  if (isAuthRoute && user) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/pricing";
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
