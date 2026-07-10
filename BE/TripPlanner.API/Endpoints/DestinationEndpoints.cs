using TripPlanner.Application.Parameters;
using TripPlanner.Application.UseCases.Destination;
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
        IGetAllDestinationsUseCase useCase,
        CancellationToken cancellationToken)
    {
        var result = await useCase.ExecuteAsync(parameter, cancellationToken);
        return result.ToResponse(onSuccess => Results.Ok(result.Data));
    }

    private static async Task<IResult> GetDestination(int id, IGetDestinationByIdUseCase useCase, CancellationToken cancellationToken)
    {
        var result = await useCase.ExecuteAsync(id, cancellationToken);
        return result.ToResponse(onSuccess => Results.Ok(result.Data));
    }
}
