using TripPlanner.Application.Common;
using TripPlanner.Application.DTOs.Responses;
using TripPlanner.Application.Interfaces.Mapping;
using TripPlanner.Application.Interfaces.Repositories;

namespace TripPlanner.Application.UseCases.SavedPlaces;

public class ScheduleSavedPlaceUseCase(
    ITripRepository tripRepository,
    IUnitOfWork unitOfWork,
    IApplicationMapper mapper) : IScheduleSavedPlaceUseCase
{
    public async Task<Result<TripResponse>> ExecuteAsync(
        int tripId,
        DateOnly date,
        int destinationId,
        int userId,
        CancellationToken cancellationToken = default)
    {
        var trip = await tripRepository.GetWithDaysAndDestinationsAsync(tripId, userId, cancellationToken);

        if (trip is null)
        {
            return Result<TripResponse>.Failure(ErrorType.NotFound, "Trip Not Found");
        }

        var tripDay = trip.Days.FirstOrDefault(x => x.Day == date);

        if (tripDay is null)
        {
            return Result<TripResponse>.Failure(ErrorType.NotFound, "Day Not Found");
        }

        var destination = trip.SavedPlaces.FirstOrDefault(x => x.Id == destinationId);

        if (destination is null)
        {
            return Result<TripResponse>.Failure(ErrorType.NotFound, "Destination is not in Saved Places.");
        }

        if (tripDay.Destinations.Any(x => x.Id == destination.Id))
        {
            return Result<TripResponse>.Failure(ErrorType.BadRequest, "Destination already exists in this day.");
        }

        trip.ScheduleFromSavedPlaces(destination, tripDay);
        await unitOfWork.SaveChangesAsync(cancellationToken);

        return Result<TripResponse>.Success(mapper.MapToTripResponse(trip));
    }
}
