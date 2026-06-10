using TripPlanner.Application.Common;
using TripPlanner.Application.DTOs.Requests;
using TripPlanner.Application.DTOs.Responses;

namespace TripPlanner.Application.UseCases;

public interface ITripDayService
{
    Task<Result<TripDayResponse>> AddDestinationToTripDayAsync(
        int tripId,
        string date,
        AddDestinationToDayRequest dto,
        CancellationToken cancellationToken = default);

    Task<Result> RemoveDestinationFromTripDayAsync(
        int id,
        string date,
        int destinationId,
        CancellationToken cancellationToken = default);
}
