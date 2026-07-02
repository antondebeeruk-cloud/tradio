import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

const allowedMethods = "GET, HEAD, POST, PUT, PATCH, DELETE, OPTIONS";
const blockedMethods = new Set(["CONNECT", "TRACE", "TRACK"]);

function forwardedProtocol(request: NextRequest) {
  return (
    request.headers.get("x-forwarded-proto")?.split(",")[0].trim() ||
    request.nextUrl.protocol.replace(":", "")
  ).toLowerCase();
}

function secureResponse(request: NextRequest, response: NextResponse) {
  const isProduction = process.env.NODE_ENV === "production";
  const isHttps = forwardedProtocol(request) === "https";
  const contentPolicy = [
    "default-src 'self'",
    "base-uri 'self'",
    `connect-src 'self' https://*.supabase.co wss://*.supabase.co${isProduction ? "" : " http: ws:"}`,
    "font-src 'self' data:",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "frame-src 'self' https://www.google.com",
    "img-src 'self' data: blob: https:",
    "object-src 'none'",
    `script-src 'self' 'unsafe-inline'${isProduction ? "" : " 'unsafe-eval'"}`,
    "style-src 'self' 'unsafe-inline'",
  ];
  if (isHttps) contentPolicy.push("upgrade-insecure-requests");

  response.headers.set(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
  );
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Expires", "0");
  response.headers.set(
    "Content-Security-Policy",
    contentPolicy.join("; "),
  );
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(self), geolocation=(self), microphone=()");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-DNS-Prefetch-Control", "off");
  response.headers.set("X-Frame-Options", "DENY");

  if (isHttps) {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=63072000; includeSubDomains; preload",
    );
  }

  return response;
}

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
  const isProductionHost =
    hostname === "tradio.uk" ||
    hostname === "www.tradio.uk" ||
    hostname === "admin.tradio.uk";

  if (blockedMethods.has(request.method.toUpperCase())) {
    return secureResponse(
      request,
      new NextResponse(null, {
        headers: { Allow: allowedMethods },
        status: 405,
      }),
    );
  }

  if (isProductionHost && forwardedProtocol(request) !== "https") {
    const secureUrl = request.nextUrl.clone();
    secureUrl.protocol = "https:";
    return secureResponse(request, NextResponse.redirect(secureUrl, 308));
  }
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
    return secureResponse(
      request,
      NextResponse.redirect(
        new URL(`${adminPath}${request.nextUrl.search}`, "https://admin.tradio.uk"),
      ),
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
    return secureResponse(request, NextResponse.redirect(adminHome));
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
    return secureResponse(request, nextResponse());
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
              response.cookies.set(name, value, {
                ...options,
                httpOnly: true,
                sameSite: options.sameSite ?? "lax",
                secure: process.env.NODE_ENV === "production",
              });
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
    return secureResponse(
      request,
      clearSupabaseCookies(request, NextResponse.redirect(redirectUrl)),
    );
  }

  if (isProtectedRoute && hasValidSession && !hasPlanAccess) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/pricing";
    redirectUrl.searchParams.set(
      "message",
      "Choose an active package to continue using Tradio.",
    );
    return secureResponse(request, NextResponse.redirect(redirectUrl));
  }

  if (isAuthRoute && hasValidSession) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = hasPlanAccess ? "/dashboard" : "/pricing";
    redirectUrl.search = "";
    return secureResponse(request, NextResponse.redirect(redirectUrl));
  }

  return secureResponse(request, response);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
