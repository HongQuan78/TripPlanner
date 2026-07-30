namespace TripPlanner.Application.Parameters;

public sealed record LocationSearchParameter
{
    public string? Query { get; init; }
}
