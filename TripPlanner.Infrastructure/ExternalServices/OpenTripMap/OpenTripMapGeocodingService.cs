using System.Net;
using System.Net.Http.Json;
using Microsoft.Extensions.Options;
using TripPlanner.Application.DTOs.Responses;
using TripPlanner.Application.Interfaces.Services;
using TripPlanner.Infrastructure.Settings;

namespace TripPlanner.Infrastructure.ExternalServices.OpenTripMap;

public class OpenTripMapGeocodingService(HttpClient httpClient, IOptions<OpenTripMapSettings> options) : IGeocodingService
{
    public async Task<List<LocationSearchResultResponse>> SearchAsync(string query, string? countryCode = null, CancellationToken cancellationToken = default)
    {
        var url = $"geoname?name={Uri.EscapeDataString(query)}&apikey={options.Value.ApiKey}";
        if (!string.IsNullOrWhiteSpace(countryCode))
        {
            url += $"&country={Uri.EscapeDataString(countryCode)}";
        }
        using var response = await httpClient.GetAsync(url, cancellationToken);
        if (response.StatusCode == HttpStatusCode.NotFound)
        {
            return [];
        }

        response.EnsureSuccessStatusCode();
        var geoname = await response.Content.ReadFromJsonAsync<OpenTripMapGeonameModel>(cancellationToken);
        if (geoname is null || string.IsNullOrWhiteSpace(geoname.Name))
        {
            return [];
        }

        return
        [
            new LocationSearchResultResponse
            {
                Name = geoname.Name,
                CountryCode = geoname.Country ?? string.Empty,
                Latitude = geoname.Lat,
                Longitude = geoname.Lon,
                IsPartialMatch = geoname.PartialMatch ?? false
            }
        ];
    }
}
