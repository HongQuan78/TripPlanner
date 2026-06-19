using TripPlanner.Application.Common;
using TripPlanner.Application.Interfaces.Repositories;

namespace TripPlanner.Application.UseCases.TripDay;

public class RemoveDestinationFromTripDayUseCase(
    ITripRepository tripRepository,
    IUnitOfWork unitOfWork) : IRemoveDestinationFromTripDayUseCase
{
    public async Task<Result> ExecuteAsync(int tripId, DateOnly date, int destinationId, CancellationToken cancellationToken = default)
    {
        var trip = await tripRepository.GetWithDaysAndDestinationsAsync(tripId, cancellationToken);

        if (trip is null)
        {
            return Result.Failure(ErrorType.NotFound, "Trip Not Found");
        }

        var tripDay = trip.Days.FirstOrDefault(x => x.Day == date);

        if (tripDay is null)
        {
            return Result.Failure(ErrorType.NotFound, "Day Not Found");
        }

        var destination = tripDay.Destinations.FirstOrDefault(x => x.Id == destinationId);

        if (destination is null)
        {
            return Result.Failure(ErrorType.NotFound, "Destination is not scheduled on this day.");
        }

        tripDay.RemoveDestination(destination);
        await unitOfWork.SaveChangesAsync(cancellationToken);

        return Result.Success();
    }
}
