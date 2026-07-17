using TripPlanner.Application.Common;
using TripPlanner.Application.Interfaces.Repositories;

namespace TripPlanner.Application.UseCases.SavedPlaces;

public class RemoveDestinationFromSavedPlacesUseCase(
    ITripRepository tripRepository,
    IUnitOfWork unitOfWork) : IRemoveDestinationFromSavedPlacesUseCase
{
    public async Task<Result> ExecuteAsync(int tripId, int destinationId, int userId, CancellationToken cancellationToken = default)
    {
        var trip = await tripRepository.GetWithDaysAndDestinationsAsync(tripId, userId, cancellationToken);

        if (trip is null)
        {
            return Result.Failure(ErrorType.NotFound, "Trip Not Found");
        }

        var destination = trip.SavedPlaces.FirstOrDefault(x => x.Id == destinationId);

        if (destination is null)
        {
            return Result.Failure(ErrorType.NotFound, "Destination is not in Saved Places.");
        }

        trip.RemoveSavedPlace(destination);
        await unitOfWork.SaveChangesAsync(cancellationToken);

        return Result.Success();
    }
}
