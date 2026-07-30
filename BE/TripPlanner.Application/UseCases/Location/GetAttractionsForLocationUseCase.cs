using TripPlanner.Application.Common;
using TripPlanner.Application.DTOs.Responses;
using TripPlanner.Application.Interfaces.Services;
using TripPlanner.Application.Parameters;

namespace TripPlanner.Application.UseCases.Location;

public class GetAttractionsForLocationUseCase(IAttractionSearchService attractionSearchService) : IGetAttractionsForLocationUseCase
{
    private const int DefaultRadiusMeters = 20000;
    private const int MaxPageSize = 20;

    public async Task<Result<List<AttractionResponse>>> ExecuteAsync(AttractionSearchParameter parameter, CancellationToken cancellationToken = default)
    {
        var radius = parameter.Radius ?? DefaultRadiusMeters;
        var limit = Math.Min(parameter.Limit ?? MaxPageSize, MaxPageSize);
        var offset = Math.Max(parameter.Offset ?? 0, 0);

        try
        {
            var attractions = await attractionSearchService.GetNearbyAsync(parameter.Latitude, parameter.Longitude, radius, limit, parameter.Kinds, parameter.MinRate, offset, cancellationToken);
            return Result<List<AttractionResponse>>.Success(attractions);
        }
        catch (Exception exception) when (exception is HttpRequestException or TaskCanceledException)
        {
            return Result<List<AttractionResponse>>.Failure(ErrorType.ServiceUnavailable, "Attraction suggestions are currently unavailable.");
        }
    }
}
