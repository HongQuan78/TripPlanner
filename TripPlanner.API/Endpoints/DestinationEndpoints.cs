using Microsoft.AspNetCore.Mvc;
using TripPlanner.API.Extensions;
using TripPlanner.API.Parameters;
using TripPlanner.API.Services.Interface;

namespace TripPlanner.API.Endpoints;
public static class DestinationEndpoints
{
    public static RouteGroupBuilder MapDestinationEndpoints(this RouteGroupBuilder group)
    {   
        group.MapGet("/", GetAllDestinations);
        group.MapGet("/{id:int}", GetDestination);
        return group;
    }

    private static IResult GetAllDestinations([AsParameters] DestinationFilterParameter parameter, IDestinationService destinationService)
    {
        var result = destinationService.GetAllDestinations(parameter);
        return result.ToResponse(onSuccess => Results.Ok(result.Data));
    }

    private static IResult GetDestination(int id, IDestinationService destinationService)
    {
        var result = destinationService.GetDestinationById(id);
        return result.ToResponse(onSuccess => Results.Ok(result.Data));
    }
}