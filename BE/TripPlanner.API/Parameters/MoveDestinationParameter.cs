using Microsoft.AspNetCore.Mvc;
using TripPlanner.Application.DTOs.Requests;

namespace TripPlanner.API.Parameters;

public sealed record MoveDestinationParameter
{
    [FromRoute(Name = "id")]
    public int Id { get; init; }
    [FromRoute(Name = "date")]
    public string? Date { get; init; }
    [FromRoute(Name = "destinationId")]
    public int DestinationId { get; init; }
    [FromBody]
    public MoveDestinationRequest? MoveDestinationRequest { get; init; }
}
