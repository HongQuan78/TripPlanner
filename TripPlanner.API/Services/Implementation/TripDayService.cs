using AutoMapper;
using TripPlanner.API.Common;
using TripPlanner.API.Data;
using TripPlanner.API.DTOs.Requests;
using TripPlanner.API.DTOs.Responses;
using TripPlanner.API.Helpers;
using TripPlanner.API.Models;
using TripPlanner.API.Services.Interface;

namespace TripPlanner.API.Services.Implementation;

public class TripDayService(MemoryDbContext dbContext, IMapper mapper) : ITripDayService
{
    public Result<TripDayResponse> AddDestinationToTripDay(int tripId, string dateString, AddDestinationToDayRequest dto)
    {
        Trip? trip = dbContext.Trips.FirstOrDefault(x => x.Id == tripId);

        if (trip is null)
        {
            return Result<TripDayResponse>.Failure(ErrorType.NotFound, "Trip Not Found");
        }

        DateOnly date = DateHelper.ToDateOnly(dateString);
        TripDay? tripDay = trip.Days.FirstOrDefault(x => x.Day == date);

        if (tripDay is null)
        {
            return Result<TripDayResponse>.Failure(ErrorType.NotFound, "Day Not Found");
        }
        
        Destination? destination = dbContext.Destinations.FirstOrDefault(x => x.Id == dto.DestinationId);

        if (destination is null)
        {
            return Result<TripDayResponse>.Failure(ErrorType.NotFound, "Destination Not Found");
        }

        if (tripDay.Destinations.Contains(destination))
        {
            return Result<TripDayResponse>.Failure(ErrorType.BadRequest, "Destination already exists in this day.");
        }

        tripDay.Destinations.Add(destination);

        return Result<TripDayResponse>.Success(mapper.Map<TripDayResponse>(tripDay));
    }

    public Result RemoveDestinationFromTripDay(int id, string dateString, int destinationId)
    {
        Trip? trip = dbContext.Trips.FirstOrDefault(x => x.Id == id);

        if (trip is null)
        {
            return Result.Failure(ErrorType.NotFound, "Trip Not Found");
        }

        DateOnly date = DateHelper.ToDateOnly(dateString);
        TripDay? tripDay = trip.Days.FirstOrDefault(x => x.Day == date);

        if (tripDay is null)
        {
            return Result.Failure(ErrorType.NotFound, "Day Not Found");
        }
        
        Destination? destination = tripDay.Destinations.FirstOrDefault(x => x.Id == destinationId);

        if (destination is null)
        {
            return Result.Failure(ErrorType.NotFound, "Destination Not Found");
        }
        
        if (!tripDay.Destinations.Any(x => x.Id == destinationId))
        {
            return Result.Failure(ErrorType.NotFound, "Destination is not scheduled on this day.");
        }
        tripDay.Destinations.Remove(destination);

        return Result.Success();
    }
}