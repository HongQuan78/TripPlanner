using TripPlanner.Application.DTOs.Requests;
using TripPlanner.Application.Helpers;
using TripPlanner.Application.UseCases.SavedPlaces;
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
        group.MapPut("/{id:int}", UpdateTrip);
        group.MapPost("/{id:int}/days/{date}/destinations", AddDestinationToTripDay);
        group.MapDelete("/{id:int}/days/{date}/destinations/{destinationId:int}", RemoveDestinationFromTripDay);
        group.MapPost("/{id:int}/saved-places", AddDestinationToSavedPlaces);
        group.MapDelete("/{id:int}/saved-places/{destinationId:int}", RemoveDestinationFromSavedPlaces);
        group.MapPost("/{id:int}/days/{date}/schedule", ScheduleSavedPlace);
        group.MapPut("/{id:int}/days/{date}/destinations/order", ReorderDayDestinations);
        group.MapPut("/{id:int}/days/{date}/destinations/{destinationId:int}/move", MoveDestination);
        return group;
    }

    private static async Task<IResult> GetTrip(int id, HttpContext httpContext, IGetTripUseCase useCase, CancellationToken cancellationToken)
    {
        var result = await useCase.ExecuteAsync(id, httpContext.User.GetUserId(), cancellationToken);
        return result.ToResponse(onSuccess => Results.Ok(result.Data));
    }

    private static async Task<IResult> GetAllTrips(HttpContext httpContext, IGetAllTripsUseCase useCase, CancellationToken cancellationToken)
    {
        var result = await useCase.ExecuteAsync(httpContext.User.GetUserId(), cancellationToken);
        return result.ToResponse(onSuccess => Results.Ok(result.Data));
    }

    private static async Task<IResult> CreateTrip(CreateTripRequest dto, HttpContext httpContext, ICreateTripUseCase useCase, CancellationToken cancellationToken)
    {
        var result = await useCase.ExecuteAsync(dto, httpContext.User.GetUserId(), cancellationToken);
        return result.ToResponse(onSuccess => Results.Created($"/api/trips/{result.Data!.Id}", result.Data));
    }

    private static async Task<IResult> UpdateTrip(int id, UpdateTripRequest dto, HttpContext httpContext, IUpdateTripUseCase useCase, CancellationToken cancellationToken)
    {
        var result = await useCase.ExecuteAsync(id, dto, httpContext.User.GetUserId(), cancellationToken);
        return result.ToResponse(onSuccess => Results.Ok(result.Data));
    }

    private static async Task<IResult> AddDestinationToTripDay(
        [AsParameters] AddDestinationToDayParameter parameter,
        HttpContext httpContext,
        IAddDestinationToTripDayUseCase useCase,
        CancellationToken cancellationToken)
    {
        var date = DateOnly.ParseExact(parameter.Date!, DateHelper.DateFormat, null);
        var result = await useCase.ExecuteAsync(parameter.Id, date, parameter.AddDestinationToDayRequest!, httpContext.User.GetUserId(), cancellationToken);
        return result.ToResponse(onSuccess => Results.Ok(result.Data));
    }

    private static async Task<IResult> RemoveDestinationFromTripDay(
        [AsParameters] RemoveDestinationFromDayParameter parameter,
        HttpContext httpContext,
        IRemoveDestinationFromTripDayUseCase useCase,
        CancellationToken cancellationToken)
    {
        var date = DateOnly.ParseExact(parameter.Date!, DateHelper.DateFormat, null);
        var result = await useCase.ExecuteAsync(parameter.Id, date, parameter.DestinationId, httpContext.User.GetUserId(), cancellationToken);
        return result.ToResponse(Results.NoContent);
    }

    private static async Task<IResult> AddDestinationToSavedPlaces(
        [AsParameters] AddSavedPlaceParameter parameter,
        HttpContext httpContext,
        IAddDestinationToSavedPlacesUseCase useCase,
        CancellationToken cancellationToken)
    {
        var result = await useCase.ExecuteAsync(parameter.Id, parameter.AddSavedPlaceRequest!, httpContext.User.GetUserId(), cancellationToken);
        return result.ToResponse(onSuccess => Results.Ok(result.Data));
    }

    private static async Task<IResult> RemoveDestinationFromSavedPlaces(
        [AsParameters] RemoveSavedPlaceParameter parameter,
        HttpContext httpContext,
        IRemoveDestinationFromSavedPlacesUseCase useCase,
        CancellationToken cancellationToken)
    {
        var result = await useCase.ExecuteAsync(parameter.Id, parameter.DestinationId, httpContext.User.GetUserId(), cancellationToken);
        return result.ToResponse(Results.NoContent);
    }

    private static async Task<IResult> ScheduleSavedPlace(
        [AsParameters] ScheduleSavedPlaceParameter parameter,
        HttpContext httpContext,
        IScheduleSavedPlaceUseCase useCase,
        CancellationToken cancellationToken)
    {
        var date = DateOnly.ParseExact(parameter.Date!, DateHelper.DateFormat, null);
        var result = await useCase.ExecuteAsync(parameter.Id, date, parameter.ScheduleSavedPlaceRequest!.DestinationId!.Value, httpContext.User.GetUserId(), cancellationToken);
        return result.ToResponse(onSuccess => Results.Ok(result.Data));
    }

    private static async Task<IResult> ReorderDayDestinations(
        [AsParameters] ReorderDayDestinationsParameter parameter,
        HttpContext httpContext,
        IReorderDayDestinationsUseCase useCase,
        CancellationToken cancellationToken)
    {
        var date = DateOnly.ParseExact(parameter.Date!, DateHelper.DateFormat, null);
        var result = await useCase.ExecuteAsync(parameter.Id, date, parameter.ReorderDayDestinationsRequest!.DestinationIds!, httpContext.User.GetUserId(), cancellationToken);
        return result.ToResponse(onSuccess => Results.Ok(result.Data));
    }

    private static async Task<IResult> MoveDestination(
        [AsParameters] MoveDestinationParameter parameter,
        HttpContext httpContext,
        IMoveDestinationBetweenDaysUseCase useCase,
        CancellationToken cancellationToken)
    {
        var fromDate = DateOnly.ParseExact(parameter.Date!, DateHelper.DateFormat, null);
        var toDate = DateOnly.ParseExact(parameter.MoveDestinationRequest!.ToDate!, DateHelper.DateFormat, null);
        var result = await useCase.ExecuteAsync(parameter.Id, fromDate, parameter.DestinationId, toDate, httpContext.User.GetUserId(), cancellationToken);
        return result.ToResponse(onSuccess => Results.Ok(result.Data));
    }
}
