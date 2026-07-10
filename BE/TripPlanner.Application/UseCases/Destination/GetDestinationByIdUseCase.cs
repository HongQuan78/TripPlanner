using TripPlanner.Application.Common;
using TripPlanner.Application.DTOs.Responses;
using TripPlanner.Application.Interfaces.Mapping;
using TripPlanner.Application.Interfaces.Repositories;

namespace TripPlanner.Application.UseCases.Destination;

public class GetDestinationByIdUseCase(IDestinationRepository destinationRepository, IApplicationMapper mapper) : IGetDestinationByIdUseCase
{
    public async Task<Result<DestinationResponse>> ExecuteAsync(int id, CancellationToken cancellationToken = default)
    {
        var destination = await destinationRepository.GetByIdAsync(id, cancellationToken);

        if (destination is null)
        {
            return Result<DestinationResponse>.Failure(ErrorType.NotFound, "Destination Id does not exist.");
        }

        return Result<DestinationResponse>.Success(mapper.MapToDestinationResponse(destination));
    }
}
