using TripPlanner.Application.Common;
using TripPlanner.Application.DTOs.Responses;

namespace TripPlanner.Application.UseCases.TripDay;

public interface IMoveDestinationBetweenDaysUseCase
{
    Task<Result<TripResponse>> ExecuteAsync(int tripId, DateOnly fromDate, int destinationId, DateOnly toDate, int userId, CancellationToken cancellationToken = default);
}
