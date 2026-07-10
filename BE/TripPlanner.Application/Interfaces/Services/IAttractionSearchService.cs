using TripPlanner.Application.DTOs.Responses;

namespace TripPlanner.Application.Interfaces.Services;

public interface IAttractionSearchService
{
    Task<List<AttractionResponse>> GetNearbyAsync(double latitude, double longitude, int radiusMeters, int limit, CancellationToken cancellationToken = default);
}
