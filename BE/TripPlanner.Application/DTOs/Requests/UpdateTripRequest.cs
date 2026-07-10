namespace TripPlanner.Application.DTOs.Requests;

public sealed record UpdateTripRequest
{
    public string? Name { get; init; }
    public DateOnly? StartDate { get; init; }
    public DateOnly? EndDate { get; init; }
    public bool Confirmed { get; init; }
}
