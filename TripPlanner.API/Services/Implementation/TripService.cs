using AutoMapper;
using TripPlanner.API.Common;
using TripPlanner.API.Data;
using TripPlanner.API.DTOs.Requests;
using TripPlanner.API.DTOs.Responses;
using TripPlanner.API.Models;
using TripPlanner.API.Services.Interface;

namespace TripPlanner.API.Services.Implementation;

public class TripService(MemoryDbContext dbContext, IMapper mapper): ITripService
{
    public Result<TripResponse> CreateTrip(CreateTripRequest dto)
    {
        int id = dbContext.Trips.Count + 1; 
        Trip trip = mapper.Map<Trip>(dto);
        trip.Id = id;
        dbContext.Trips.Add(trip);

        return Result<TripResponse>.Success(mapper.Map<TripResponse>(trip));
    }

    public Result<List<TripResponse>> GetAllTrips() => Result<List<TripResponse>>.Success(mapper.Map<List<TripResponse>>(dbContext.Trips));

    public Result<TripResponse> GetTrip(int id)
    {
        Trip? trip = dbContext.Trips.FirstOrDefault(x => x.Id == id);
        if (trip is null)
        {
            return Result<TripResponse>.Failure(ErrorType.NotFound, "Trip Not Found.");
        }
        return Result<TripResponse>.Success(mapper.Map<TripResponse>(trip));
    } 
}