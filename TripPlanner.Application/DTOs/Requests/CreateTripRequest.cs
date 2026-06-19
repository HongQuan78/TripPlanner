namespace TripPlanner.Application.DTOs.Requests;

public sealed record CreateTripRequest
{
    public string? Name { get; init; }
    public DateOnly? StartDate { get; init; }
    public DateOnly? EndDate { get; init; }
}
