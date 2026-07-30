using TripPlanner.Application.Common;
using TripPlanner.Application.DTOs.Requests;
using TripPlanner.Application.DTOs.Responses;

namespace TripPlanner.Application.UseCases.SavedPlaces;

public interface IAddDestinationToSavedPlacesUseCase
{
    Task<Result<TripResponse>> ExecuteAsync(int tripId, AddSavedPlaceRequest request, int userId, CancellationToken cancellationToken = default);
}
