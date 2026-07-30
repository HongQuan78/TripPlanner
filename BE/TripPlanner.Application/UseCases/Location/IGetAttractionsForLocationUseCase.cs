using TripPlanner.Application.Common;
using TripPlanner.Application.DTOs.Responses;
using TripPlanner.Application.Parameters;

namespace TripPlanner.Application.UseCases.Location;

public interface IGetAttractionsForLocationUseCase
{
    Task<Result<List<AttractionResponse>>> ExecuteAsync(AttractionSearchParameter parameter, CancellationToken cancellationToken = default);
}
