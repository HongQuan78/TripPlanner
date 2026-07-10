namespace TripPlanner.Application.DTOs.Responses;

public sealed record AttractionResponse
{
    public string Xid { get; init; } = string.Empty;
    public string Name { get; init; } = string.Empty;
    public List<string> Kinds { get; init; } = [];
    public string? Rating { get; init; }
    public string? ImageUrl { get; init; }
    public double? DistanceMeters { get; init; }
}
