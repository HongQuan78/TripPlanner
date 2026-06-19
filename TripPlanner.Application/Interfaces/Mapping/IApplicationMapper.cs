using TripPlanner.Application.DTOs.Responses;
using TripPlanner.Domain.Models;

namespace TripPlanner.Application.Interfaces.Mapping;

public interface IApplicationMapper
{
    TripResponse MapToTripResponse(Trip trip);
    List<TripResponse> MapToTripResponseList(List<Trip> trips);
    TripDayResponse MapToTripDayResponse(TripDay tripDay);
    DestinationResponse MapToDestinationResponse(Destination destination);
    List<DestinationResponse> MapToDestinationResponseList(List<Destination> destinations);
}
