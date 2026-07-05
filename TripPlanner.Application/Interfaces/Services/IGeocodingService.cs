using TripPlanner.Application.DTOs.Responses;

namespace TripPlanner.Application.Interfaces.Services;

public interface IGeocodingService
{
    Task<List<LocationSearchResultResponse>> SearchAsync(string query, string? countryCode = null, CancellationToken cancellationToken = default);
}
