namespace TripPlanner.Application.DTOs.Requests;

public sealed record AddSavedPlaceRequest
{
    public int? DestinationId { get; init; }
    public string? Xid { get; init; }
}
