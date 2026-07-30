namespace TripPlanner.Application.DTOs.Responses;

public sealed record DestinationResponse
{
    public int Id { get; init; }
    public string Name { get; init; } = string.Empty;
    public double Rating { get; init; }
    public string Category { get; init; } = string.Empty;
    public string? Xid { get; init; }
    public string? OpeningHours { get; init; }
}
