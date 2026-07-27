const KNOWN_CATEGORIES: Record<string, string> = {
  interesting_places: "Interesting place",
  cultural: "Cultural",
  historic: "Historic",
  architecture: "Architecture",
  natural: "Natural",
  amusements: "Amusements",
  foods: "Food",
  museums: "Museum",
  churches: "Church",
  parks: "Park",
  archaeological: "Archaeological",
  palaces: "Palace",
  castles: "Castle",
};

export function formatCategory(category: string | null | undefined): string {
  if (!category) {
    return "";
  }

  if (category in KNOWN_CATEGORIES) {
    return KNOWN_CATEGORIES[category];
  }

  return category
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}
