using Microsoft.AspNetCore.Mvc;
using TripPlanner.Application.DTOs.Requests;

namespace TripPlanner.API.Parameters;

public sealed record AddSavedPlaceParameter
{
    [FromRoute(Name = "id")]
    public int Id { get; init; }
    [FromBody]
    public AddSavedPlaceRequest? AddSavedPlaceRequest { get; init; }
}
