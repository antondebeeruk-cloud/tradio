import type { NextRequest } from "next/server";

export function isTrustedSameOriginRequest(request: NextRequest) {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const host = (forwardedHost ?? request.headers.get("host") ?? "")
    .split(",")[0]
    .trim()
    .toLowerCase();
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const protocol = (
    forwardedProto?.split(",")[0].trim() ||
    request.nextUrl.protocol.replace(":", "")
  ).toLowerCase();
  const source = request.headers.get("origin") ?? request.headers.get("referer");
  const fetchSite = request.headers.get("sec-fetch-site");

  if (!host || !source || (fetchSite && fetchSite !== "same-origin")) return false;

  try {
    const sourceUrl = new URL(source);
    const sourceHost = sourceUrl.host.toLowerCase();
    const productionHosts = new Set(["tradio.uk", "www.tradio.uk"]);
    if (process.env.NODE_ENV === "production" && !productionHosts.has(sourceHost)) {
      return false;
    }
    return sourceHost === host && sourceUrl.protocol === `${protocol}:`;
  } catch {
    return false;
  }
}
