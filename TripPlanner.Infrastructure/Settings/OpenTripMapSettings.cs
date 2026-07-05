namespace TripPlanner.Infrastructure.Settings;

public sealed class OpenTripMapSettings
{
    public const string SectionName = "OpenTripMapSettings";
    public string BaseUrl { get; init; } = "https://api.opentripmap.com/0.1/en/places";
    public string ApiKey { get; init; } = string.Empty;
    public int TimeoutMilliseconds { get; init; } = 5000;
}
