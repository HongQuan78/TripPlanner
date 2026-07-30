import { describe, it, expect } from "vitest";
import { formatCategory } from "./formatCategory";

describe("formatCategory", () => {
  it("maps known categories", () => {
    expect(formatCategory("foods")).toBe("Food");
    expect(formatCategory("historic")).toBe("Historic");
    expect(formatCategory("architecture")).toBe("Architecture");
    expect(formatCategory("interesting_places")).toBe("Interesting place");
  });

  it("humanizes unknown categories with underscores", () => {
    expect(formatCategory("some_place")).toBe("Some Place");
    expect(formatCategory("my_category")).toBe("My Category");
  });

  it("humanizes single-word unknown categories", () => {
    expect(formatCategory("museum")).toBe("Museum");
    expect(formatCategory("park")).toBe("Park");
  });

  it("handles null and undefined", () => {
    expect(formatCategory(null)).toBe("");
    expect(formatCategory(undefined)).toBe("");
  });

  it("handles empty string", () => {
    expect(formatCategory("")).toBe("");
  });

  it("handles all known categories", () => {
    const categories = [
      "interesting_places",
      "cultural",
      "historic",
      "architecture",
      "natural",
      "amusements",
      "foods",
      "museums",
      "churches",
      "parks",
      "archaeological",
      "palaces",
      "castles",
    ];

    categories.forEach((cat) => {
      const result = formatCategory(cat);
      expect(result).toBeTruthy();
      expect(result.length).toBeGreaterThan(0);
    });
  });
});
