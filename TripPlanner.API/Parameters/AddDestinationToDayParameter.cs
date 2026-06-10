using Microsoft.AspNetCore.Mvc;
using TripPlanner.Application.DTOs.Requests;

namespace TripPlanner.API.Parameters;

public sealed record AddDestinationToDayParameter
{   
    [FromRoute(Name = "id")]
    public int Id {get; init;}
    [FromRoute(Name = "date")]
    public string? Date {get; init;}
    [FromBody]
    public AddDestinationToDayRequest? AddDestinationToDayRequest {get; init;}
}   