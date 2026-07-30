using Microsoft.AspNetCore.Mvc;

namespace TripPlanner.API.Parameters;

public sealed record RemoveDestinationFromDayParameter
{   
    [FromRoute(Name = "id")]
    public int Id {get; init;}
    [FromRoute(Name = "date")]
    public string? Date {get; init;}
    [FromRoute(Name = "destinationId")]
    public int DestinationId { get; init; }
}   