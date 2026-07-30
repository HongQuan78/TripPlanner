using TripPlanner.Application.Common;
using TripPlanner.Application.DTOs.Requests;
using TripPlanner.Application.DTOs.Responses;

namespace TripPlanner.Application.UseCases.Trip;

public interface IUpdateTripUseCase
{
    Task<Result<TripResponse>> ExecuteAsync(int id, UpdateTripRequest request, int userId, CancellationToken cancellationToken = default);
}
