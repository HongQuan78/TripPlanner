using TripPlanner.Application.Common;

namespace TripPlanner.Application.UseCases.SavedPlaces;

public interface IRemoveDestinationFromSavedPlacesUseCase
{
    Task<Result> ExecuteAsync(int tripId, int destinationId, int userId, CancellationToken cancellationToken = default);
}
