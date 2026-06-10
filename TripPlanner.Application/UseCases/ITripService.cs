using TripPlanner.Application.Common;
using TripPlanner.Application.DTOs.Requests;
using TripPlanner.Application.DTOs.Responses;

namespace TripPlanner.Application.UseCases;

public interface ITripService
{
    Task<Result<TripResponse>> GetTripAsync(int id, CancellationToken cancellationToken = default);
    Task<Result<List<TripResponse>>> GetAllTripsAsync(CancellationToken cancellationToken = default);
    Task<Result<TripResponse>> CreateTripAsync(CreateTripRequest dto, CancellationToken cancellationToken = default);
}
