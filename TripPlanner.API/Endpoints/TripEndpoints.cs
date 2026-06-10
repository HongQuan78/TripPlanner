using TripPlanner.Application.DTOs.Requests;
using TripPlanner.Application.UseCases;
using TripPlanner.API.Extensions;
using TripPlanner.API.Parameters;

namespace TripPlanner.API.Endpoints;

public static class TripEndpoints
{
    public static RouteGroupBuilder MapTripEndpoints(this RouteGroupBuilder group)
    {
        group.MapGet("/", GetAllTrips);
        group.MapGet("/{id:int}", GetTrip);
        group.MapPost("/", CreateTrip);
        group.MapPost("/{id:int}/days/{date}/destinations", AddDestinationToTripDay);
        group.MapDelete("/{id:int}/days/{date}/destinations/{destinationId:int}", RemoveDestinationFromTripDay);
        return group;
    }

    private static async Task<IResult> GetTrip(int id, ITripService tripService, CancellationToken cancellationToken)
    {
        var result = await tripService.GetTripAsync(id, cancellationToken);
        return result.ToResponse(onSuccess => Results.Ok(result.Data));
    }

    private static async Task<IResult> GetAllTrips(ITripService tripService, CancellationToken cancellationToken)
    {
        var result = await tripService.GetAllTripsAsync(cancellationToken);
        return result.ToResponse(onSuccess => Results.Ok(result.Data));
    }

    private static async Task<IResult> CreateTrip(CreateTripRequest dto, ITripService tripService, CancellationToken cancellationToken)
    {
        var result = await tripService.CreateTripAsync(dto, cancellationToken);
        return result.ToResponse(onSuccess => Results.Created($"/api/trips/{result.Data!.Id}", result.Data));
    }

    private static async Task<IResult> AddDestinationToTripDay(
        [AsParameters] AddDestinationToDayParameter parameter,
        ITripDayService tripDayService,
        CancellationToken cancellationToken)
    {
        var result = await tripDayService.AddDestinationToTripDayAsync(
            parameter.Id, parameter.Date!, parameter.AddDestinationToDayRequest!, cancellationToken);
        return result.ToResponse(onSuccess => Results.Ok(result.Data));
    }

    private static async Task<IResult> RemoveDestinationFromTripDay(
        [AsParameters] RemoveDestinationFromDayParameter parameter,
        ITripDayService tripDayService,
        CancellationToken cancellationToken)
    {
        var result = await tripDayService.RemoveDestinationFromTripDayAsync(
            parameter.Id, parameter.Date!, parameter.DestinationId, cancellationToken);
        return result.ToResponse(Results.NoContent);
    }
}
