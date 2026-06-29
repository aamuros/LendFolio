import { describe, expect, it } from "vitest";
import { fullNameSchema } from "@/lib/signup";

describe("fullNameSchema", () => {
  it.each([
    "Juan dela Cruz",
    "Maria Lourdes Santos",
    "Anne-Marie Reyes",
    "John O'Connor",
  ])("accepts a full name: %s", (name) => {
    expect(fullNameSchema.safeParse(name).success).toBe(true);
  });

  it.each(["Oliver", "Oliver123 Jumawid", "Oliver @ Jumawid", "   "])(
    "rejects an invalid full name: %s",
    (name) => {
      expect(fullNameSchema.safeParse(name).success).toBe(false);
    },
  );
});
