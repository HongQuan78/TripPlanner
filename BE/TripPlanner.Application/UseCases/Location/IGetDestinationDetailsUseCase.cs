using TripPlanner.Application.Common;
using TripPlanner.Application.DTOs.Responses;

namespace TripPlanner.Application.UseCases.Location;

public interface IGetDestinationDetailsUseCase
{
    Task<Result<DestinationDetailsResponse>> ExecuteAsync(string xid, CancellationToken cancellationToken = default);
}
