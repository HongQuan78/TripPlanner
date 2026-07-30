using TripPlanner.Application.Common;
using TripPlanner.Application.DTOs.Responses;
using TripPlanner.Application.Parameters;

namespace TripPlanner.Application.UseCases.Location;

public interface ISearchLocationsUseCase
{
    Task<Result<List<LocationSearchResultResponse>>> ExecuteAsync(LocationSearchParameter parameter, CancellationToken cancellationToken = default);
}
