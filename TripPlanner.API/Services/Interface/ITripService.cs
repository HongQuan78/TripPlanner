using TripPlanner.API.Common;
using TripPlanner.API.DTOs.Requests;
using TripPlanner.API.DTOs.Responses;

namespace TripPlanner.API.Services.Interface;

public interface ITripService
{
    public Result<TripResponse> GetTrip(int id);
    public Result<List<TripResponse>> GetAllTrips();
    public Result<TripResponse> CreateTrip(CreateTripRequest dto);
}