const PRODUCTION_SITE_URL = "https://tradio.uk";

export function siteUrl() {
  const configured =
    process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXT_PUBLIC_APP_URL;

  if (configured) {
    try {
      const url = new URL(configured);
      const isLocalhost = ["localhost", "127.0.0.1", "::1"].includes(
        url.hostname,
      );

      if (process.env.NODE_ENV !== "production" || !isLocalhost) {
        return url.origin;
      }
    } catch {
      // Fall through to a known-safe URL when configuration is malformed.
    }
  }

  return process.env.NODE_ENV === "production"
    ? PRODUCTION_SITE_URL
    : "http://localhost:3000";
}

export function siteRedirect(path: string) {
  return new URL(path, siteUrl());
}
