namespace TripPlanner.Application.DTOs.Responses;

public sealed record DestinationDetailsResponse
{
    public string Xid { get; init; } = string.Empty;
    public string Name { get; init; } = string.Empty;
    public string? Category { get; init; }
    public double? Rating { get; init; }
    public string? Description { get; init; }
    public List<string> ImageUrls { get; init; } = [];
    public string? Address { get; init; }
    public string? OpeningHours { get; init; }
    public OpeningHoursAvailability OpeningHoursAvailability { get; init; } = OpeningHoursAvailability.Unavailable;
    public string? TimeZone { get; init; }
    public string? CountryCode { get; init; }
    public string? Website { get; init; }
    public double? Latitude { get; init; }
    public double? Longitude { get; init; }
}
