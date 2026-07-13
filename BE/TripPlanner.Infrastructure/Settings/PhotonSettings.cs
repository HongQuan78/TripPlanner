namespace TripPlanner.Infrastructure.Settings;

public sealed class PhotonSettings
{
    public const string SectionName = "PhotonSettings";
    public string BaseUrl { get; init; } = "https://photon.komoot.io/api/";
    public int TimeoutMilliseconds { get; init; } = 5000;
}
