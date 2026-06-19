using TripPlanner.Application.Common;

namespace TripPlanner.Application.UseCases.TripDay;

public interface IRemoveDestinationFromTripDayUseCase
{
    Task<Result> ExecuteAsync(int tripId, DateOnly date, int destinationId, CancellationToken cancellationToken = default);
}
