namespace TripPlanner.Application.DTOs.Requests;

public sealed record CreateTripRequest
{
    public string? Name { get; init; }
    public string? StartDate { get; init; }
    public string? EndDate { get; init; }
}
