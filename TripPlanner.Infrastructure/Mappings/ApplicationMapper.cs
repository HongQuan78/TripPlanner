using AutoMapper;
using TripPlanner.Application.DTOs.Responses;
using TripPlanner.Application.Interfaces.Mapping;
using TripPlanner.Domain.Models;

namespace TripPlanner.Infrastructure.Mappings;

public class ApplicationMapper(IMapper mapper) : IApplicationMapper
{
    public TripResponse MapToTripResponse(Trip trip) => mapper.Map<TripResponse>(trip);
    public List<TripResponse> MapToTripResponseList(List<Trip> trips) => mapper.Map<List<TripResponse>>(trips);
    public TripDayResponse MapToTripDayResponse(TripDay tripDay) => mapper.Map<TripDayResponse>(tripDay);
    public DestinationResponse MapToDestinationResponse(Destination destination) => mapper.Map<DestinationResponse>(destination);
    public List<DestinationResponse> MapToDestinationResponseList(List<Destination> destinations) => mapper.Map<List<DestinationResponse>>(destinations);
}
