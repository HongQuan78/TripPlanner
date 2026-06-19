using TripPlanner.Application.Common;
using TripPlanner.Application.DTOs.Responses;
using TripPlanner.Application.Interfaces.Mapping;
using TripPlanner.Application.Interfaces.Repositories;

namespace TripPlanner.Application.UseCases.Trip;

public class GetAllTripsUseCase(ITripRepository tripRepository, IApplicationMapper mapper) : IGetAllTripsUseCase
{
    public async Task<Result<List<TripResponse>>> ExecuteAsync(CancellationToken cancellationToken = default)
    {
        var trips = await tripRepository.GetAllWithDaysAndDestinationsAsync(cancellationToken);
        return Result<List<TripResponse>>.Success(mapper.MapToTripResponseList(trips));
    }
}
