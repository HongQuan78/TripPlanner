using Riok.Mapperly.Abstractions;
using TripPlanner.Application.DTOs.Responses;
using TripPlanner.Application.Interfaces.Mapping;
using TripPlanner.Domain.Models;

namespace TripPlanner.Infrastructure.Mappings;

[Mapper]
public partial class ApplicationMapper : IApplicationMapper
{
    [MapperIgnoreSource(nameof(Trip.UserId))]
    [MapProperty(nameof(Trip.Days), nameof(TripResponse.TripDays))]
    public partial TripResponse MapToTripResponse(Trip trip);

    public partial List<TripResponse> MapToTripResponseList(List<Trip> trips);

    [MapperIgnoreSource(nameof(TripDay.Id))]
    [MapperIgnoreSource(nameof(TripDay.TripId))]
    public partial TripDayResponse MapToTripDayResponse(TripDay tripDay);

    [MapProperty(nameof(Destination.ExternalId), nameof(DestinationResponse.Xid))]
    public partial DestinationResponse MapToDestinationResponse(Destination destination);

    public partial List<DestinationResponse> MapToDestinationResponseList(List<Destination> destinations);
}
