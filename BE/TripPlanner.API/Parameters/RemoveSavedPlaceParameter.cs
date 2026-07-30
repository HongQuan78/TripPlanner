using Microsoft.AspNetCore.Mvc;

namespace TripPlanner.API.Parameters;

public sealed record RemoveSavedPlaceParameter
{
    [FromRoute(Name = "id")]
    public int Id { get; init; }
    [FromRoute(Name = "destinationId")]
    public int DestinationId { get; init; }
}
