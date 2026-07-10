using TripPlanner.Application.Common;
using TripPlanner.Application.DTOs.Responses;
using TripPlanner.Application.Interfaces.Mapping;
using TripPlanner.Application.Interfaces.Repositories;

namespace TripPlanner.Application.UseCases.Trip;

public class GetTripUseCase(ITripRepository tripRepository, IApplicationMapper mapper) : IGetTripUseCase
{
    public async Task<Result<TripResponse>> ExecuteAsync(int id, int userId, CancellationToken cancellationToken = default)
    {
        var trip = await tripRepository.GetWithDaysAndDestinationsAsync(id, userId, cancellationToken);

        if (trip is null)
        {
            return Result<TripResponse>.Failure(ErrorType.NotFound, "Trip Not Found.");
        }

        return Result<TripResponse>.Success(mapper.MapToTripResponse(trip));
    }
}
