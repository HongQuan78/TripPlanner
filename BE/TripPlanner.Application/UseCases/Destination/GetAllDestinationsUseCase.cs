using TripPlanner.Application.Common;
using TripPlanner.Application.DTOs.Responses;
using TripPlanner.Application.Interfaces.Mapping;
using TripPlanner.Application.Interfaces.Repositories;
using TripPlanner.Application.Parameters;

namespace TripPlanner.Application.UseCases.Destination;

public class GetAllDestinationsUseCase(IDestinationRepository destinationRepository, IApplicationMapper mapper) : IGetAllDestinationsUseCase
{
    public async Task<Result<List<DestinationResponse>>> ExecuteAsync(DestinationFilterParameter filter, CancellationToken cancellationToken = default)
    {
        var destinations = await destinationRepository.GetFilteredAsync(filter, cancellationToken);
        return Result<List<DestinationResponse>>.Success(mapper.MapToDestinationResponseList(destinations));
    }
}
