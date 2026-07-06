using TripPlanner.Application.Common;
using TripPlanner.Application.DTOs.Requests;
using TripPlanner.Application.DTOs.Responses;

namespace TripPlanner.Application.UseCases.TripDay;

public interface IAddDestinationToTripDayUseCase
{
    Task<Result<TripDayResponse>> ExecuteAsync(int tripId, DateOnly date, AddDestinationToDayRequest request, int userId, CancellationToken cancellationToken = default);
}
