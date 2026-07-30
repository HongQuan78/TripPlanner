using TripPlanner.Application.Common;
using TripPlanner.Application.DTOs.Responses;
using TripPlanner.Application.Interfaces.Mapping;
using TripPlanner.Application.Interfaces.Repositories;

namespace TripPlanner.Application.UseCases.TripDay;

public class ReorderDayDestinationsUseCase(
    ITripRepository tripRepository,
    IUnitOfWork unitOfWork,
    IApplicationMapper mapper) : IReorderDayDestinationsUseCase
{
    public async Task<Result<TripResponse>> ExecuteAsync(
        int tripId,
        DateOnly date,
        IReadOnlyList<int> orderedDestinationIds,
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

        var currentIds = tripDay.Destinations.Select(x => x.Id).ToList();

        if (!IsPermutation(currentIds, orderedDestinationIds))
        {
            return Result<TripResponse>.Failure(ErrorType.BadRequest, "Destination order must list exactly the destinations currently in this day.");
        }

        tripDay.ReorderDestinations(orderedDestinationIds);
        await unitOfWork.SaveChangesAsync(cancellationToken);

        return Result<TripResponse>.Success(mapper.MapToTripResponse(trip));
    }

    private static bool IsPermutation(IReadOnlyList<int> current, IReadOnlyList<int> submitted)
    {
        if (current.Count != submitted.Count)
        {
            return false;
        }

        if (submitted.Distinct().Count() != submitted.Count)
        {
            return false;
        }

        return current.OrderBy(id => id).SequenceEqual(submitted.OrderBy(id => id));
    }
}
