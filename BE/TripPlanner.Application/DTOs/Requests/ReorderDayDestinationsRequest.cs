namespace TripPlanner.Application.DTOs.Requests;

public sealed record ReorderDayDestinationsRequest
{
    public List<int>? DestinationIds { get; init; }
}
