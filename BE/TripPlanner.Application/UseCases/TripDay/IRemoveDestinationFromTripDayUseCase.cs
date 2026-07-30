using TripPlanner.Application.Common;

namespace TripPlanner.Application.UseCases.TripDay;

public interface IRemoveDestinationFromTripDayUseCase
{
    Task<Result> ExecuteAsync(int tripId, DateOnly date, int destinationId, int userId, CancellationToken cancellationToken = default);
}
