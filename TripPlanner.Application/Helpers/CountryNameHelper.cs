using System.Globalization;

namespace TripPlanner.Application.Helpers;

public static class CountryNameHelper
{
    private static readonly Lazy<Dictionary<string, RegionInfo>> Countries = new(BuildCountries);

    public static bool IsCountry(string name)
    {
        return Countries.Value.ContainsKey(name);
    }

    public static string? GetCountryCode(string name)
    {
        return Countries.Value.TryGetValue(name, out var region) ? region.TwoLetterISORegionName : null;
    }

    public static string? GetCanonicalName(string name)
    {
        return Countries.Value.TryGetValue(name, out var region) ? region.EnglishName : null;
    }

    private static Dictionary<string, RegionInfo> BuildCountries()
    {
        var countries = new Dictionary<string, RegionInfo>(StringComparer.OrdinalIgnoreCase);
        foreach (var culture in CultureInfo.GetCultures(CultureTypes.SpecificCultures))
        {
            try
            {
                var region = new RegionInfo(culture.Name);
                countries.TryAdd(region.EnglishName, region);
            }
            catch (ArgumentException)
            {
            }
        }
        return countries;
    }
}
