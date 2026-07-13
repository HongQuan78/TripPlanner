using System.Net.Http.Json;
using System.Text.Json;
using TripPlanner.Application.DTOs.Responses;
using TripPlanner.Application.Interfaces.Services;

namespace TripPlanner.Infrastructure.ExternalServices.Photon;

public class PhotonGeocodingService(HttpClient httpClient) : IGeocodingService
{
    private const int Limit = 5;

    public async Task<List<LocationSearchResultResponse>> SearchAsync(string query, string? countryCode = null, CancellationToken cancellationToken = default)
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
