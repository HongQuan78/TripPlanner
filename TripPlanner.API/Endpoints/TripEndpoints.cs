using TripPlanner.API.DTOs.Requests;
using TripPlanner.API.Extensions;
using TripPlanner.API.Parameters;
using TripPlanner.API.Services.Interface;

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

    private static IResult GetTrip(int id, ITripService tripService)
    {
        var result = tripService.GetTrip(id);
        return result.ToResponse(onSuccess => Results.Ok(result.Data));
    }

    private static IResult GetAllTrips(ITripService tripService)
    {   
        var result = tripService.GetAllTrips();
        return result.ToResponse(onSuccess => Results.Ok(result.Data));
    }

    private static IResult CreateTrip(CreateTripRequest dto, ITripService tripService)
    {   
        var result = tripService.CreateTrip(dto);
        return result.ToResponse(onSuccess => Results.Created($"/api/trips/{result.Data!.Id}", result.Data));
    }
    private static IResult AddDestinationToTripDay([AsParameters] AddDestinationToDayParameter parameter, ITripDayService tripDayService)
    {
        var result = tripDayService.AddDestinationToTripDay(parameter.Id, parameter.Date!, parameter.AddDestinationToDayRequest!);
        return result.ToResponse(onSuccess => Results.Ok(result.Data));
    }
    private static IResult RemoveDestinationFromTripDay([AsParameters] RemoveDestinationFromDayParameter parameter, ITripDayService tripDayService)
    {
        var result = tripDayService.RemoveDestinationFromTripDay(parameter.Id, parameter.Date!, parameter.DestinationId);
        return result.ToResponse(Results.NoContent);
    }
}