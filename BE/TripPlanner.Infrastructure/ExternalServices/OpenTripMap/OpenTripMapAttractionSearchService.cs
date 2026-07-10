using System.Globalization;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.Options;
using TripPlanner.Application.DTOs.Responses;
using TripPlanner.Application.Interfaces.Services;
using TripPlanner.Infrastructure.Settings;

namespace TripPlanner.Infrastructure.ExternalServices.OpenTripMap;

public class OpenTripMapAttractionSearchService(HttpClient httpClient, IOptions<OpenTripMapSettings> options) : IAttractionSearchService
{
    private const string DefaultKinds = "interesting_places";
    private const string MinimumRate = "2";

    public async Task<List<AttractionResponse>> GetNearbyAsync(double latitude, double longitude, int radiusMeters, int limit, CancellationToken cancellationToken = default)
    {
        var lat = latitude.ToString(CultureInfo.InvariantCulture);
        var lon = longitude.ToString(CultureInfo.InvariantCulture);
        var url = $"radius?radius={radiusMeters}&lat={lat}&lon={lon}&kinds={DefaultKinds}&rate={MinimumRate}&format=json&limit={limit}&apikey={options.Value.ApiKey}";
        var features = await httpClient.GetFromJsonAsync<List<OpenTripMapFeatureModel>>(url, cancellationToken) ?? [];

        var named = features
            .Where(feature => !string.IsNullOrWhiteSpace(feature.Xid) && !string.IsNullOrWhiteSpace(feature.Name))
            .Take(limit)
            .ToList();

        var enriched = await Task.WhenAll(named.Select(feature => EnrichAsync(feature, cancellationToken)));
        return [.. enriched];
    }

    private async Task<AttractionResponse> EnrichAsync(OpenTripMapFeatureModel feature, CancellationToken cancellationToken)
    {
        var attraction = new AttractionResponse
        {
            Xid = feature.Xid!,
            Name = feature.Name!,
            Kinds = SplitKinds(feature.Kinds),
            DistanceMeters = feature.Dist
        };

        try
        {
            var url = $"xid/{Uri.EscapeDataString(feature.Xid!)}?apikey={options.Value.ApiKey}";
            var detail = await httpClient.GetFromJsonAsync<OpenTripMapPlaceModel>(url, cancellationToken);
            if (detail is null)
            {
                return attraction;
            }

            return attraction with
            {
                Rating = detail.Rate,
                ImageUrl = detail.Preview?.Source,
                Kinds = string.IsNullOrWhiteSpace(detail.Kinds) ? attraction.Kinds : SplitKinds(detail.Kinds)
            };
        }
        catch (Exception exception) when (exception is HttpRequestException or TaskCanceledException or JsonException)
        {
            return attraction;
        }
    }

    private static List<string> SplitKinds(string? kinds)
    {
        if (string.IsNullOrWhiteSpace(kinds))
        {
            return [];
        }

        return [.. kinds.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)];
    }
}
