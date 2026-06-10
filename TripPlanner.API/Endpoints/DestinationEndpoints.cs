using Microsoft.AspNetCore.Mvc;
using TripPlanner.Application.Parameters;
using TripPlanner.Application.UseCases;
using TripPlanner.API.Extensions;

namespace TripPlanner.API.Endpoints;

public static class DestinationEndpoints
{
    public static RouteGroupBuilder MapDestinationEndpoints(this RouteGroupBuilder group)
    {
        group.MapGet("/", GetAllDestinations);
        group.MapGet("/{id:int}", GetDestination);
        return group;
    }

    private static async Task<IResult> GetAllDestinations(
        [AsParameters] DestinationFilterParameter parameter,
        IDestinationService destinationService,
        CancellationToken cancellationToken)
    {
        var result = await destinationService.GetAllDestinationsAsync(parameter, cancellationToken);
        return result.ToResponse(onSuccess => Results.Ok(result.Data));
    }

    private static async Task<IResult> GetDestination(int id, IDestinationService destinationService, CancellationToken cancellationToken)
    {
        var result = await destinationService.GetDestinationByIdAsync(id, cancellationToken);
        return result.ToResponse(onSuccess => Results.Ok(result.Data));
    }
}
