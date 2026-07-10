using TripPlanner.Application.Common;
using TripPlanner.Application.DTOs.Requests;
using TripPlanner.Application.DTOs.Responses;

namespace TripPlanner.Application.UseCases.Trip;

public interface ICreateTripUseCase
{
    Task<Result<TripResponse>> ExecuteAsync(CreateTripRequest request, int userId, CancellationToken cancellationToken = default);
}
