using TripPlanner.API.Extensions;
using TripPlanner.Application.Parameters;
using TripPlanner.Application.UseCases.Location;

namespace TripPlanner.API.Endpoints;

public static class LocationEndpoints
{
    public static RouteGroupBuilder MapLocationEndpoints(this RouteGroupBuilder group)
    {
        group.MapGet("/search", SearchLocations);
        group.MapGet("/attractions", GetAttractions);
        group.MapGet("/{xid}/details", GetDestinationDetails);
        return group;
    }

    private static async Task<IResult> SearchLocations(
        [AsParameters] LocationSearchParameter parameter,
        ISearchLocationsUseCase useCase,
        CancellationToken cancellationToken)
    {
        var result = await useCase.ExecuteAsync(parameter, cancellationToken);
        return result.ToResponse(onSuccess => Results.Ok(result.Data));
    }

    private static async Task<IResult> GetAttractions(
        [AsParameters] AttractionSearchParameter parameter,
        IGetAttractionsForLocationUseCase useCase,
        CancellationToken cancellationToken)
    {
        var result = await useCase.ExecuteAsync(parameter, cancellationToken);
        return result.ToResponse(onSuccess => Results.Ok(result.Data));
    }

    private static async Task<IResult> GetDestinationDetails(
        string xid,
        IGetDestinationDetailsUseCase useCase,
        CancellationToken cancellationToken)
    {
        var result = await useCase.ExecuteAsync(xid, cancellationToken);
        return result.ToResponse(onSuccess => Results.Ok(result.Data));
    }
}
