namespace TripPlanner.Application.Helpers;

public static class DestinationCategoryHelper
{
    private static readonly string[] RestaurantKindMarkers = ["food", "restaurant"];

    public static bool IsRestaurantCategory(string? category)
    {
        if (string.IsNullOrWhiteSpace(category))
        {
            return false;
        }

        return RestaurantKindMarkers.Any(marker => category.Contains(marker, StringComparison.OrdinalIgnoreCase));
    }
}
