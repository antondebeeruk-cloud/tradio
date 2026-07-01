import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

function hasSupabaseSessionCookie(request: NextRequest) {
  return request.cookies
    .getAll()
    .some(
      (cookie) =>
        cookie.name.startsWith("sb-") && cookie.name.includes("auth-token"),
    );
}

function clearSupabaseCookies(request: NextRequest, response: NextResponse) {
  request.cookies
    .getAll()
    .filter((cookie) => cookie.name.startsWith("sb-"))
    .forEach((cookie) => {
      response.cookies.delete(cookie.name);
    });

  return response;
}

function requestHostname(request: NextRequest) {
  return (request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "")
    .split(",")[0]
    .trim()
    .split(":")[0]
    .toLowerCase();
}

function hasActivePlan(profile: {
  plan?: string | null;
  subscription_status?: string | null;
  trial_expires_at?: string | null;
} | null) {
  if (!profile?.plan || profile.subscription_status !== "active") {
    return false;
  }

  if (profile.plan === "trial") {
    return Boolean(
      profile.trial_expires_at &&
        new Date(profile.trial_expires_at).getTime() > Date.now(),
    );
  }

  return ["lite", "pro", "elite"].includes(profile.plan);
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const hostname = requestHostname(request);
  const isAdminHost =
    hostname === "admin.tradio.uk" || hostname === "admin.localhost";
  const adminRewritePath =
    isAdminHost && pathname === "/"
      ? "/admin"
      : isAdminHost && pathname === "/login"
        ? "/admin/login"
        : null;
  const routePath = adminRewritePath ?? pathname;

  if (
    routePath.startsWith("/admin") &&
    !isAdminHost &&
    (hostname === "tradio.uk" || hostname === "www.tradio.uk")
  ) {
    const adminPath = routePath === "/admin" ? "/" : routePath;
    return NextResponse.redirect(
      new URL(`${adminPath}${request.nextUrl.search}`, "https://admin.tradio.uk"),
    );
  }

  if (
    isAdminHost &&
    pathname !== "/" &&
    pathname !== "/login" &&
    !pathname.startsWith("/admin") &&
    !pathname.startsWith("/api") &&
    !pathname.startsWith("/auth")
  ) {
    const adminHome = request.nextUrl.clone();
    adminHome.pathname = "/";
    adminHome.search = "";
    return NextResponse.redirect(adminHome);
  }

  const isProtectedRoute =
    routePath.startsWith("/dashboard") ||
    routePath.startsWith("/customers") ||
    routePath.startsWith("/quotes") ||
    routePath.startsWith("/invoices") ||
    routePath.startsWith("/settings");
  const isPricingRoute = routePath.startsWith("/pricing");
  const isAuthRoute = routePath === "/login" || routePath === "/signup";
  const isAdminLoginRoute = routePath === "/admin/login";
  const isAdminRoute = routePath.startsWith("/admin") && !isAdminLoginRoute;
  const needsAuthCheck =
    isProtectedRoute ||
    isPricingRoute ||
    isAuthRoute ||
    isAdminRoute ||
    isAdminLoginRoute;

  const nextResponse = () => {
    if (adminRewritePath) {
      const rewriteUrl = request.nextUrl.clone();
      rewriteUrl.pathname = adminRewritePath;
      return NextResponse.rewrite(rewriteUrl);
    }

    return NextResponse.next({ request });
  };

  if (!needsAuthCheck) {
    return nextResponse();
  }

  let response = nextResponse();
  const hasSession = hasSupabaseSessionCookie(request);
  let hasValidSession = false;
  let hasPlanAccess = false;

  if (hasSession) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (supabaseUrl && supabaseAnonKey) {
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
            response = nextResponse();
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options);
            });
          },
        },
      });

      const { data, error } = await supabase.auth
        .getUser()
        .catch((authError: Error) => ({
          data: { user: null },
          error: authError,
        }));

      hasValidSession = Boolean(data.user && !error);

      if (data.user && !error) {
        const { data: membership } = await supabase
          .from("workspace_members")
          .select("owner_user_id")
          .eq("user_id", data.user.id)
          .eq("status", "active")
          .maybeSingle();
        const planOwnerId = membership?.owner_user_id ?? data.user.id;
        const { data: profile } = await supabase
          .from("profiles")
          .select("plan, subscription_status, trial_expires_at")
          .eq("id", planOwnerId)
          .maybeSingle();
        hasPlanAccess = hasActivePlan(profile);
      }

      if (error) {
        clearSupabaseCookies(request, response);
      }
    }
  }

  if (
    (isProtectedRoute || isPricingRoute || isAdminRoute) &&
    !hasValidSession
  ) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = isAdminRoute ? "/admin/login" : "/login";
    redirectUrl.searchParams.set("redirectedFrom", routePath);
    redirectUrl.searchParams.set(
      "message",
      hasSession
        ? "Your session expired. Please log in again."
        : "Please log in to continue.",
    );
    return clearSupabaseCookies(request, NextResponse.redirect(redirectUrl));
  }

  if (isProtectedRoute && hasValidSession && !hasPlanAccess) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/pricing";
    redirectUrl.searchParams.set(
      "message",
      "Choose an active package to continue using Tradio.",
    );
    return NextResponse.redirect(redirectUrl);
  }

  if (isAuthRoute && hasValidSession) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = hasPlanAccess ? "/dashboard" : "/pricing";
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
