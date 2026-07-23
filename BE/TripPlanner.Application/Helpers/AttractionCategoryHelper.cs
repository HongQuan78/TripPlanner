namespace TripPlanner.Application.Helpers;

public static class AttractionCategoryHelper
{
    public const int MinRateValue = 1;
    public const int MaxRateValue = 3;

    private static readonly HashSet<string> AllowedCategoryCodes = new(StringComparer.OrdinalIgnoreCase)
    {
        "cultural",
        "historic",
        "architecture",
        "natural",
        "amusements",
        "foods"
    };

    public static IReadOnlyCollection<string> AllowedCategories => AllowedCategoryCodes;

    public static bool IsAllowedCategory(string? category)
    {
        if (string.IsNullOrWhiteSpace(category))
        {
            return false;
        }

        return AllowedCategoryCodes.Contains(category.Trim());
    }
}
