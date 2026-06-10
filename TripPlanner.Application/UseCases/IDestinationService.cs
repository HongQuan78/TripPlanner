using TripPlanner.Application.Common;
using TripPlanner.Application.DTOs.Responses;
using TripPlanner.Application.Parameters;

namespace TripPlanner.Application.UseCases;

public interface IDestinationService
{
    Task<Result<List<DestinationResponse>>> GetAllDestinationsAsync(DestinationFilterParameter filter, CancellationToken cancellationToken = default);
    Task<Result<DestinationResponse>> GetDestinationByIdAsync(int id, CancellationToken cancellationToken = default);
}
