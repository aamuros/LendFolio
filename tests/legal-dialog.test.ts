import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

function readSource(path: string): string {
  return readFileSync(path, "utf8");
}

describe("legal dialog component structure", () => {
  const source = readSource("components/legal/legal-dialog.tsx");

  it("uses DialogTitle for accessible dialog heading", () => {
    expect(source).toContain("<DialogTitle");
    expect(source).toContain("content.title");
  });

  it("uses DialogDescription for accessible dialog description", () => {
    expect(source).toContain("<DialogDescription");
    expect(source).toContain("content.description");
  });

  it("renders version and last updated metadata", () => {
    expect(source).toContain("content.displayVersion");
    expect(source).toContain("content.lastUpdated");
  });

  it("renders content sections with headings", () => {
    expect(source).toContain("content.sections.map");
    expect(source).toContain("section.heading");
    expect(source).toContain("section.paragraphs.map");
  });

  it("uses ScrollArea for scrollable content body", () => {
    expect(source).toContain("<ScrollArea");
    expect(source).toContain("flex-1");
  });

  it("includes a footer close button without harsh separator", () => {
    expect(source).toContain("<DialogFooter");
    expect(source).toContain("Close");
    expect(source).toContain("border-t-0");
    expect(source).toContain("bg-transparent");
  });

  it("constrains modal height and width for readability", () => {
    expect(source).toContain("max-h-");
    expect(source).toContain("sm:max-w-[640px]");
  });

  it("uses responsive width with safe mobile margins", () => {
    expect(source).toContain("w-[calc(100%-1rem)]");
  });

  it("applies full-bleed footer without negative margin bleed", () => {
    expect(source).toContain("mx-0 mb-0");
  });
});

describe("dialog overlay backdrop", () => {
  const source = readSource("components/ui/dialog.tsx");

  it("uses subtle backdrop blur on overlay", () => {
    expect(source).toContain("backdrop-blur-sm");
  });

  it("uses translucent overlay color", () => {
    expect(source).toContain("bg-black/");
  });
});

describe("signup form consent integration", () => {
  const source = readSource("app/signup/signup-form.tsx");

  it("renders LegalDialog for terms of service link", () => {
    expect(source).toContain("Terms of Service");
    expect(source).toContain("termsContent");
    expect(source).toContain("<LegalDialog");
  });

  it("renders LegalDialog for privacy notice link", () => {
    expect(source).toContain("Privacy Notice");
    expect(source).toContain("privacyContent");
    expect(source).toContain("<LegalDialog");
  });

  it("passes different content objects for terms and privacy", () => {
    const termsMatch = source.match(/content=\{termsContent\}/g);
    const privacyMatch = source.match(/content=\{privacyContent\}/g);
    expect(termsMatch).toHaveLength(1);
    expect(privacyMatch).toHaveLength(1);
  });

  it("does not auto-check consent checkboxes", () => {
    expect(source).not.toContain("defaultChecked");
    expect(source).not.toContain("checked={true}");
  });

  it("requires consent checkboxes to be manually checked", () => {
    expect(source).toContain('name="termsAccepted"');
    expect(source).toContain('name="privacyAccepted"');
    const checkboxMatches = source.match(/required\s*\/?>/g);
    expect(checkboxMatches).toBeTruthy();
    expect(checkboxMatches!.length).toBeGreaterThanOrEqual(2);
  });

  it("groups consent checkboxes with accessible label", () => {
    expect(source).toContain('role="group"');
    expect(source).toContain('aria-label="Required disclosures"');
  });
});

describe("terms and privacy content separation", () => {
  const termsSource = readSource("components/legal/legal-content.ts");

  it("defines terms content with distinct title", () => {
    expect(termsSource).toContain('title: "Terms of Service"');
  });

  it("defines privacy content with distinct title", () => {
    expect(termsSource).toContain('title: "Privacy Notice"');
  });

  it("defines lender verification authorization content", () => {
    expect(termsSource).toContain(
      'title: "Authorization for Verification"',
    );
    expect(termsSource).toContain('lastUpdated: "June 14, 2026"');
    expect(termsSource).toContain("does not require the lender to fund any loan");
  });

  it("assigns different version identifiers", () => {
    expect(termsSource).toContain('version: "2026-05-terms-v1"');
    expect(termsSource).toContain('version: "2026-05-privacy-v1"');
  });

  it("includes human-readable display versions", () => {
    expect(termsSource).toContain('displayVersion: "v1.0"');
  });

  it("assigns readable last updated dates", () => {
    expect(termsSource).toContain('lastUpdated: "May 31, 2026"');
  });

  it("includes distinct summary text for each document", () => {
    const termsSummaryMatch = termsSource.match(
      /export const termsContent[\s\S]*?summary:\s*"([^"]+)"/,
    );
    const privacySummaryMatch = termsSource.match(
      /export const privacyContent[\s\S]*?summary:\s*"([^"]+)"/,
    );
    expect(termsSummaryMatch).toBeTruthy();
    expect(privacySummaryMatch).toBeTruthy();
    expect(termsSummaryMatch![1]).not.toBe(privacySummaryMatch![1]);
  });
});
