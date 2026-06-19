const LOCAL_SITE_URL = "http://localhost:3000";

export function getSiteUrl(requestHeaders?: Headers) {
  const configuredUrl = normalizeSiteUrl(process.env.NEXT_PUBLIC_SITE_URL);

  if (configuredUrl) {
    return configuredUrl;
  }

  const requestOrigin = getRequestOrigin(requestHeaders);

  if (requestOrigin) {
    return requestOrigin;
  }

  const vercelUrl = normalizeSiteUrl(
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null,
  );

  if (vercelUrl) {
    return vercelUrl;
  }

  return LOCAL_SITE_URL;
}

export function getAuthRedirectUrl(path: `/${string}`, requestHeaders?: Headers) {
  return `${getSiteUrl(requestHeaders)}${path}`;
}

function normalizeSiteUrl(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  try {
    const url = new URL(value);
    return url.origin;
  } catch {
    return null;
  }
}

function getRequestOrigin(requestHeaders?: Headers) {
  if (!requestHeaders) {
    return null;
  }

  const forwardedHost =
    getFirstHeaderValue(requestHeaders.get("x-forwarded-host")) ??
    getFirstHeaderValue(requestHeaders.get("host"));

  if (forwardedHost) {
    const forwardedProto =
      getFirstHeaderValue(requestHeaders.get("x-forwarded-proto")) ??
      getDefaultProtocol(forwardedHost);
    const forwardedOrigin = normalizeSiteUrl(
      forwardedHost.includes("://")
        ? forwardedHost
        : `${forwardedProto}://${forwardedHost}`,
    );

    if (forwardedOrigin) {
      return forwardedOrigin;
    }
  }

  return normalizeSiteUrl(requestHeaders.get("origin"));
}

function getFirstHeaderValue(value: string | null | undefined) {
  const firstValue = value?.split(",")[0]?.trim();
  return firstValue || null;
}

function getDefaultProtocol(host: string) {
  return host.startsWith("localhost") || host.startsWith("127.0.0.1")
    ? "http"
    : "https";
}
