using TripPlanner.Application.DTOs.Requests;
using TripPlanner.Application.Helpers;
using TripPlanner.Application.UseCases.Trip;
using TripPlanner.Application.UseCases.TripDay;
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

    private static async Task<IResult> GetTrip(int id, IGetTripUseCase useCase, CancellationToken cancellationToken)
    {
        var result = await useCase.ExecuteAsync(id, cancellationToken);
        return result.ToResponse(onSuccess => Results.Ok(result.Data));
    }

    private static async Task<IResult> GetAllTrips(IGetAllTripsUseCase useCase, CancellationToken cancellationToken)
    {
        var result = await useCase.ExecuteAsync(cancellationToken);
        return result.ToResponse(onSuccess => Results.Ok(result.Data));
    }

    private static async Task<IResult> CreateTrip(CreateTripRequest dto, ICreateTripUseCase useCase, CancellationToken cancellationToken)
    {
        var result = await useCase.ExecuteAsync(dto, cancellationToken);
        return result.ToResponse(onSuccess => Results.Created($"/api/trips/{result.Data!.Id}", result.Data));
    }

    private static async Task<IResult> AddDestinationToTripDay(
        [AsParameters] AddDestinationToDayParameter parameter,
        IAddDestinationToTripDayUseCase useCase,
        CancellationToken cancellationToken)
    {
        var date = DateOnly.ParseExact(parameter.Date!, DateHelper.DateFormat, null);
        var result = await useCase.ExecuteAsync(parameter.Id, date, parameter.AddDestinationToDayRequest!, cancellationToken);
        return result.ToResponse(onSuccess => Results.Ok(result.Data));
    }

    private static async Task<IResult> RemoveDestinationFromTripDay(
        [AsParameters] RemoveDestinationFromDayParameter parameter,
        IRemoveDestinationFromTripDayUseCase useCase,
        CancellationToken cancellationToken)
    {
        var date = DateOnly.ParseExact(parameter.Date!, DateHelper.DateFormat, null);
        var result = await useCase.ExecuteAsync(parameter.Id, date, parameter.DestinationId, cancellationToken);
        return result.ToResponse(Results.NoContent);
    }
}
