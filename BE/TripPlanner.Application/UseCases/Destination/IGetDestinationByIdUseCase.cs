using TripPlanner.Application.Common;
using TripPlanner.Application.DTOs.Responses;

namespace TripPlanner.Application.UseCases.Destination;

public interface IGetDestinationByIdUseCase
{
    Task<Result<DestinationResponse>> ExecuteAsync(int id, CancellationToken cancellationToken = default);
}
