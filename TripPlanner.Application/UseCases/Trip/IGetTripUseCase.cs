using TripPlanner.Application.Common;
using TripPlanner.Application.DTOs.Responses;

namespace TripPlanner.Application.UseCases.Trip;

public interface IGetTripUseCase
{
    Task<Result<TripResponse>> ExecuteAsync(int id, CancellationToken cancellationToken = default);
}
