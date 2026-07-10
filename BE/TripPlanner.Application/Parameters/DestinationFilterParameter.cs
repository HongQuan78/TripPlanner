namespace TripPlanner.Application.Parameters;

public sealed record DestinationFilterParameter
{
    public string? Category { get; init; }
    public string? Search { get; init; }
}
