using Microsoft.AspNetCore.Mvc;
using TripPlanner.Application.DTOs.Requests;

namespace TripPlanner.API.Parameters;

public sealed record ScheduleSavedPlaceParameter
{
    [FromRoute(Name = "id")]
    public int Id { get; init; }
    [FromRoute(Name = "date")]
    public string? Date { get; init; }
    [FromBody]
    public ScheduleSavedPlaceRequest? ScheduleSavedPlaceRequest { get; init; }
}
