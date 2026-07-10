using TripPlanner.Application.Common;
using TripPlanner.Application.DTOs.Responses;
using TripPlanner.Application.Parameters;

namespace TripPlanner.Application.UseCases.Destination;

public interface IGetAllDestinationsUseCase
{
    Task<Result<List<DestinationResponse>>> ExecuteAsync(DestinationFilterParameter filter, CancellationToken cancellationToken = default);
}
