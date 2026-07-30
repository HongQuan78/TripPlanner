namespace TripPlanner.Application.DTOs.Responses;

public sealed record LocationSearchResultResponse
{
    public string Name { get; init; } = string.Empty;
    public string CountryCode { get; init; } = string.Empty;
    public string LocationType { get; init; } = string.Empty;
    public double Latitude { get; init; }
    public double Longitude { get; init; }
    public bool IsPartialMatch { get; init; }
}
