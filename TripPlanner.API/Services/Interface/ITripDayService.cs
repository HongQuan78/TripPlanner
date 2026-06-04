using TripPlanner.API.Common;
using TripPlanner.API.DTOs.Requests;
using TripPlanner.API.DTOs.Responses;

namespace TripPlanner.API.Services.Interface;

public interface ITripDayService
{
    public Result<TripDayResponse> AddDestinationToTripDay(int tripId, string date, AddDestinationToDayRequest dto);
    public Result RemoveDestinationFromTripDay(int id, string date, int destinationId);
}