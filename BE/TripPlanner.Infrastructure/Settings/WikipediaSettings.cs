namespace TripPlanner.Infrastructure.Settings;

public sealed class WikipediaSettings
{
    public const string SectionName = "WikipediaSettings";
    public string BaseUrl { get; init; } = "https://en.wikipedia.org/api/rest_v1/";
    public int TimeoutMilliseconds { get; init; } = 5000;
    public int CacheMinutes { get; init; } = 1440;
}
