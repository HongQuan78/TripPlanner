namespace TripPlanner.Infrastructure.Settings;

public sealed class OverpassSettings
{
    public const string SectionName = "OverpassSettings";
    public string BaseUrl { get; init; } = "https://overpass-api.de/api/";
    public int TimeoutMilliseconds { get; init; } = 5000;
    public int CacheMinutes { get; init; } = 1440;
}
