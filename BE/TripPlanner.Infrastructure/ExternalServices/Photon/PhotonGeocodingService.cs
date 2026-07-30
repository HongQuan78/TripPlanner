using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.Options;
using TripPlanner.Application.DTOs.Responses;
using TripPlanner.Application.Interfaces.Services;
using TripPlanner.Infrastructure.Caching;
using TripPlanner.Infrastructure.Settings;

namespace TripPlanner.Infrastructure.ExternalServices.Photon;

internal class PhotonGeocodingService(
    HttpClient httpClient,
    IResponseCache cache,
    IOptions<PhotonSettings> options) : IGeocodingService
{
    private const int Limit = 5;
    private const int DefaultCacheMinutes = 1440;

    public async Task<List<LocationSearchResultResponse>> SearchAsync(string query, string? countryCode = null, CancellationToken cancellationToken = default)
    {
        var cacheKey = $"geo:search:{query.Trim().ToLowerInvariant()}:{(string.IsNullOrWhiteSpace(countryCode) ? "any" : countryCode.Trim().ToLowerInvariant())}";
        var cached = await cache.GetAsync<List<LocationSearchResultResponse>>(cacheKey, cancellationToken);
        if (cached is not null)
        {
            return cached;
        }

        var results = await FetchAsync(query, cancellationToken);

        var minutes = options.Value.SearchCacheMinutes > 0 ? options.Value.SearchCacheMinutes : DefaultCacheMinutes;
        await cache.SetAsync(cacheKey, results, TimeSpan.FromMinutes(minutes), cancellationToken);

        return results;
    }

    private async Task<List<LocationSearchResultResponse>> FetchAsync(string query, CancellationToken cancellationToken)
    {
        var url = $"?q={Uri.EscapeDataString(query)}&limit={Limit}&lang=en&layer=city&layer=country";
        using var response = await httpClient.GetAsync(url, cancellationToken);
        response.EnsureSuccessStatusCode();

        PhotonFeatureCollectionModel? collection;
        try
        {
            collection = await response.Content.ReadFromJsonAsync<PhotonFeatureCollectionModel>(cancellationToken: cancellationToken);
        }
        catch (JsonException exception)
        {
            throw new HttpRequestException("Malformed response from Photon geocoding service.", exception);
        }

        if (collection?.Features is null)
        {
            return [];
        }

        return collection.Features
            .Where(feature => !string.IsNullOrWhiteSpace(feature.Properties?.Name) && !string.IsNullOrWhiteSpace(feature.Properties?.CountryCode))
            .Select(feature => MapToResult(feature, query))
            .ToList();
    }

    private static LocationSearchResultResponse MapToResult(PhotonFeatureModel feature, string query)
    {
        var coordinates = feature.Geometry?.Coordinates;
        return new LocationSearchResultResponse
        {
            Name = feature.Properties!.Name!,
            CountryCode = feature.Properties.CountryCode!,
            Latitude = coordinates is { Length: 2 } ? coordinates[1] : 0,
            Longitude = coordinates is { Length: 2 } ? coordinates[0] : 0,
            IsPartialMatch = !string.Equals(feature.Properties.Name, query, StringComparison.OrdinalIgnoreCase)
        };
    }
}
