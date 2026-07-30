using TripPlanner.Application.Common;
using TripPlanner.Application.DTOs.Responses;

namespace TripPlanner.Application.UseCases.SavedPlaces;

public interface IScheduleSavedPlaceUseCase
{
    Task<Result<TripResponse>> ExecuteAsync(int tripId, DateOnly date, int destinationId, int userId, CancellationToken cancellationToken = default);
}
