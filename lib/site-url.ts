const LOCAL_SITE_URL = "http://localhost:3000";

export function getSiteUrl(requestHeaders?: Headers) {
  const configuredUrl = normalizeSiteUrl(process.env.NEXT_PUBLIC_SITE_URL);

  if (configuredUrl) {
    return configuredUrl;
  }

  const requestOrigin = normalizeSiteUrl(requestHeaders?.get("origin"));

  if (requestOrigin) {
    return requestOrigin;
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
