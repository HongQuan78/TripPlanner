namespace TripPlanner.Application.DTOs.Requests;

public sealed record ScheduleSavedPlaceRequest
{
    public int? DestinationId { get; init; }
}
