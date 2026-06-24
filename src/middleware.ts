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

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isProtectedRoute =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/customers") ||
    pathname.startsWith("/quotes") ||
    pathname.startsWith("/invoices") ||
    pathname.startsWith("/settings");
  const isPricingRoute = pathname.startsWith("/pricing");
  const isAuthRoute = pathname === "/login" || pathname === "/signup";
  const needsAuthCheck = isProtectedRoute || isPricingRoute || isAuthRoute;

  if (!needsAuthCheck) {
    return NextResponse.next();
  }

  let response = NextResponse.next({
    request,
  });
  const hasSession = hasSupabaseSessionCookie(request);
  let hasValidSession = false;

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
            response = NextResponse.next({
              request,
            });
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

      if (error) {
        clearSupabaseCookies(request, response);
      }
    }
  }

  if ((isProtectedRoute || isPricingRoute) && !hasValidSession) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("redirectedFrom", pathname);
    redirectUrl.searchParams.set(
      "message",
      "Your session expired. Please log in again.",
    );
    return clearSupabaseCookies(request, NextResponse.redirect(redirectUrl));
  }

  if (isAuthRoute && hasValidSession) {
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
