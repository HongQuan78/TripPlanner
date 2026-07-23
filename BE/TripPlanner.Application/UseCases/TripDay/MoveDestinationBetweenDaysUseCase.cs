using TripPlanner.Application.Common;
using TripPlanner.Application.DTOs.Responses;
using TripPlanner.Application.Interfaces.Mapping;
using TripPlanner.Application.Interfaces.Repositories;

namespace TripPlanner.Application.UseCases.TripDay;

public class MoveDestinationBetweenDaysUseCase(
    ITripRepository tripRepository,
    IUnitOfWork unitOfWork,
    IApplicationMapper mapper) : IMoveDestinationBetweenDaysUseCase
{
    public async Task<Result<TripResponse>> ExecuteAsync(
        int tripId,
        DateOnly fromDate,
        int destinationId,
        DateOnly toDate,
        int userId,
        CancellationToken cancellationToken = default)
    {
        var trip = await tripRepository.GetWithDaysAndDestinationsAsync(tripId, userId, cancellationToken);

        if (trip is null)
        {
            return Result<TripResponse>.Failure(ErrorType.NotFound, "Trip Not Found");
        }

        if (fromDate == toDate)
        {
            return Result<TripResponse>.Failure(ErrorType.BadRequest, "Source and target day must be different.");
        }

        var fromDay = trip.Days.FirstOrDefault(x => x.Day == fromDate);

        if (fromDay is null)
        {
            return Result<TripResponse>.Failure(ErrorType.NotFound, "Day Not Found");
        }

        var toDay = trip.Days.FirstOrDefault(x => x.Day == toDate);

        if (toDay is null)
        {
            return Result<TripResponse>.Failure(ErrorType.NotFound, "Day Not Found");
        }

        var destination = fromDay.Destinations.FirstOrDefault(x => x.Id == destinationId);

        if (destination is null)
        {
            return Result<TripResponse>.Failure(ErrorType.NotFound, "Destination is not in this day.");
        }

        trip.MoveDestinationBetweenDays(destination, fromDay, toDay);
        await unitOfWork.SaveChangesAsync(cancellationToken);

        return Result<TripResponse>.Success(mapper.MapToTripResponse(trip));
    }
}
