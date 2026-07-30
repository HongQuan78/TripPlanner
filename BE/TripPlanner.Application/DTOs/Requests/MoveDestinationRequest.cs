namespace TripPlanner.Application.DTOs.Requests;

public sealed record MoveDestinationRequest
{
    public string? ToDate { get; init; }
}
