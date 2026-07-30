using TripPlanner.Application.Common;
using TripPlanner.Application.DTOs.Responses;

namespace TripPlanner.Application.UseCases.TripDay;

public interface IReorderDayDestinationsUseCase
{
    Task<Result<TripResponse>> ExecuteAsync(int tripId, DateOnly date, IReadOnlyList<int> orderedDestinationIds, int userId, CancellationToken cancellationToken = default);
}
