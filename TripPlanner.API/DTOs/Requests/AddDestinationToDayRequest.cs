namespace TripPlanner.API.DTOs.Requests;

public sealed record AddDestinationToDayRequest
{   
    public int DestinationId { get; init; }
}