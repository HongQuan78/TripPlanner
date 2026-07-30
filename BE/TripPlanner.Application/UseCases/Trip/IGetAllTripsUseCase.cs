using TripPlanner.Application.Common;
using TripPlanner.Application.DTOs.Responses;

namespace TripPlanner.Application.UseCases.Trip;

public interface IGetAllTripsUseCase
{
    Task<Result<List<TripResponse>>> ExecuteAsync(int userId, CancellationToken cancellationToken = default);
}
