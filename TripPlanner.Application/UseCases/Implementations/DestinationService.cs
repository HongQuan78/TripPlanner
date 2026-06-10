using AutoMapper;
using TripPlanner.Application.Interfaces;
using TripPlanner.Application.Common;
using TripPlanner.Application.DTOs.Responses;
using TripPlanner.Application.Parameters;
using TripPlanner.Domain.Models;

namespace TripPlanner.Application.UseCases.Implementations;

public class DestinationService(IDestinationRepository destinationRepository, IMapper mapper) : IDestinationService
{
    public async Task<Result<List<DestinationResponse>>> GetAllDestinationsAsync(
        DestinationFilterParameter filter,
        CancellationToken cancellationToken = default)
    {
        List<Destination> destinations = await destinationRepository.GetFilteredAsync(filter, cancellationToken);
        return Result<List<DestinationResponse>>.Success(mapper.Map<List<DestinationResponse>>(destinations));
    }

    public async Task<Result<DestinationResponse>> GetDestinationByIdAsync(int id, CancellationToken cancellationToken = default)
    {
        Destination? destination = await destinationRepository.GetByIdAsync(id, cancellationToken);

        if (destination is null)
        {
            return Result<DestinationResponse>.Failure(ErrorType.NotFound, "Destination Id does not exist.");
        }

        return Result<DestinationResponse>.Success(mapper.Map<DestinationResponse>(destination));
    }
}
