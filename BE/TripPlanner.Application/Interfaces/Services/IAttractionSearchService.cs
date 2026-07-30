using TripPlanner.Application.DTOs.Responses;

namespace TripPlanner.Application.Interfaces.Services;

public interface IAttractionSearchService
{
    Task<List<AttractionResponse>> GetNearbyAsync(double latitude, double longitude, int radiusMeters, int limit, string? kinds = null, int? minRate = null, int offset = 0, CancellationToken cancellationToken = default);
}
