import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getAuthRedirectUrl, getSiteUrl } from "../lib/site-url";

const originalSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;
const originalVercelUrl = process.env.VERCEL_URL;

describe("site URL resolution", () => {
  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    delete process.env.VERCEL_URL;
  });

  afterEach(() => {
    restoreEnv("NEXT_PUBLIC_SITE_URL", originalSiteUrl);
    restoreEnv("VERCEL_URL", originalVercelUrl);
  });

  it("uses the configured production site URL first", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://lendfolio.example/app";

    expect(getSiteUrl()).toBe("https://lendfolio.example");
  });

  it("uses forwarded request host headers for deployed server actions", () => {
    const headers = new Headers({
      "x-forwarded-host": "lendfolio.vercel.app",
      "x-forwarded-proto": "https",
    });

    expect(getAuthRedirectUrl("/login?message=email-confirmed", headers)).toBe(
      "https://lendfolio.vercel.app/login?message=email-confirmed",
    );
  });

  it("falls back to the Vercel deployment URL when request headers are absent", () => {
    process.env.VERCEL_URL = "lendfolio-git-main.vercel.app";

    expect(getSiteUrl()).toBe("https://lendfolio-git-main.vercel.app");
  });
});

function restoreEnv(
  key: "NEXT_PUBLIC_SITE_URL" | "VERCEL_URL",
  value: string | undefined,
) {
  if (value === undefined) {
    delete process.env[key];
    return;
  }

  process.env[key] = value;
}
