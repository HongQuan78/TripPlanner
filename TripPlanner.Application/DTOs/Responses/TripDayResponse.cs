namespace TripPlanner.Application.DTOs.Responses;

public sealed record TripDayResponse
{
    public DateOnly Day { get; init; }
    public List<DestinationResponse> Destinations { get; init; } = [];
}
