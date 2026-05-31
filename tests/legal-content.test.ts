import { describe, expect, it } from "vitest";
import {
  termsContent,
  privacyContent,
  type LegalContent,
} from "../components/legal/legal-content";

function expectValidLegalContent(content: LegalContent, expectedTitle: string) {
  expect(content.title).toBe(expectedTitle);
  expect(content.version).toBeTruthy();
  expect(content.displayVersion).toBeTruthy();
  expect(content.lastUpdated).toBeTruthy();
  expect(content.description).toBeTruthy();
  expect(content.summary).toBeTruthy();
  expect(content.sections.length).toBeGreaterThan(0);

  for (const section of content.sections) {
    expect(section.heading).toBeTruthy();
    expect(section.paragraphs.length).toBeGreaterThan(0);
    for (const paragraph of section.paragraphs) {
      expect(paragraph.trim().length).toBeGreaterThan(0);
    }
  }
}

describe("terms content", () => {
  it("has valid structure with title, version, summary, and sections", () => {
    expectValidLegalContent(termsContent, "Terms of Service");
  });

  it("includes key points section", () => {
    const headings = termsContent.sections.map((s) => s.heading);
    expect(headings).toContain("Key points");
  });

  it("includes account use section", () => {
    const headings = termsContent.sections.map((s) => s.heading);
    expect(headings).toContain("Account use");
  });

  it("includes borrower profiles and loan applications section", () => {
    const headings = termsContent.sections.map((s) => s.heading);
    expect(headings).toContain("Borrower profiles and loan applications");
  });

  it("includes lender review and offers section", () => {
    const headings = termsContent.sections.map((s) => s.heading);
    expect(headings).toContain("Lender review and offers");
  });

  it("includes repayments and proof of payment section", () => {
    const headings = termsContent.sections.map((s) => s.heading);
    expect(headings).toContain("Repayments and proof of payment");
  });

  it("includes platform management section", () => {
    const headings = termsContent.sections.map((s) => s.heading);
    expect(headings).toContain("Platform management");
  });

  it("includes user responsibilities section", () => {
    const headings = termsContent.sections.map((s) => s.heading);
    expect(headings).toContain("User responsibilities");
  });

  it("includes contact section", () => {
    const headings = termsContent.sections.map((s) => s.heading);
    expect(headings).toContain("Contact");
  });

  it("has a readable last updated date", () => {
    expect(termsContent.lastUpdated).toMatch(/\w+ \d+, \d{4}/);
  });
});

describe("privacy content", () => {
  it("has valid structure with title, version, summary, and sections", () => {
    expectValidLegalContent(privacyContent, "Privacy Notice");
  });

  it("includes key points section", () => {
    const headings = privacyContent.sections.map((s) => s.heading);
    expect(headings).toContain("Key points");
  });

  it("includes information collected section", () => {
    const headings = privacyContent.sections.map((s) => s.heading);
    expect(headings).toContain("Information collected");
  });

  it("includes how information is used section", () => {
    const headings = privacyContent.sections.map((s) => s.heading);
    expect(headings).toContain("How information is used");
  });

  it("includes who can access workflow data section", () => {
    const headings = privacyContent.sections.map((s) => s.heading);
    expect(headings).toContain("Who can access workflow data");
  });

  it("includes document and proof uploads section", () => {
    const headings = privacyContent.sections.map((s) => s.heading);
    expect(headings).toContain("Document and proof uploads");
  });

  it("includes retention and account review section", () => {
    const headings = privacyContent.sections.map((s) => s.heading);
    expect(headings).toContain("Retention and account review");
  });

  it("includes contact section", () => {
    const headings = privacyContent.sections.map((s) => s.heading);
    expect(headings).toContain("Contact");
  });

  it("has a readable last updated date", () => {
    expect(privacyContent.lastUpdated).toMatch(/\w+ \d+, \d{4}/);
  });
});

describe("legal content separation", () => {
  it("terms and privacy have different titles", () => {
    expect(termsContent.title).not.toBe(privacyContent.title);
  });

  it("terms and privacy have different versions", () => {
    expect(termsContent.version).not.toBe(privacyContent.version);
  });

  it("terms and privacy have different section structures", () => {
    const termsHeadings = termsContent.sections.map((s) => s.heading);
    const privacyHeadings = privacyContent.sections.map((s) => s.heading);
    expect(termsHeadings).not.toEqual(privacyHeadings);
  });

  it("terms and privacy have different summaries", () => {
    expect(termsContent.summary).not.toBe(privacyContent.summary);
  });
});
