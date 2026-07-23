using System.Globalization;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.Options;
using TripPlanner.Application.DTOs.Responses;
using TripPlanner.Application.Interfaces.Services;
using TripPlanner.Infrastructure.Settings;

namespace TripPlanner.Infrastructure.ExternalServices.OpenTripMap;

internal class OpenTripMapAttractionSearchService(
    HttpClient httpClient,
    IOptions<OpenTripMapSettings> options,
    IDestinationImageProvider imageProvider,
    IOpenTripMapPlaceClient placeClient) : IAttractionSearchService
{
    private const string DefaultKinds = "interesting_places";
    private const string MinimumRate = "2";
    private const int MaxEnrichmentConcurrency = 5;

    public async Task<List<AttractionResponse>> GetNearbyAsync(double latitude, double longitude, int radiusMeters, int limit, string? kinds = null, int? minRate = null, int offset = 0, CancellationToken cancellationToken = default)
    {
        var lat = latitude.ToString(CultureInfo.InvariantCulture);
        var lon = longitude.ToString(CultureInfo.InvariantCulture);
        var kindsValue = NormalizeKinds(kinds);
        var rateValue = minRate?.ToString(CultureInfo.InvariantCulture) ?? MinimumRate;
        var skip = Math.Max(offset, 0);
        var providerLimit = skip + limit;
        var url = $"radius?radius={radiusMeters}&lat={lat}&lon={lon}&kinds={kindsValue}&rate={rateValue}&format=json&limit={providerLimit}&apikey={options.Value.ApiKey}";
        var features = await httpClient.GetFromJsonAsync<List<OpenTripMapFeatureModel>>(url, cancellationToken) ?? [];

        var named = features
            .Where(feature => !string.IsNullOrWhiteSpace(feature.Xid) && !string.IsNullOrWhiteSpace(feature.Name))
            .Skip(skip)
            .Take(limit)
            .ToList();

        using var throttle = new SemaphoreSlim(MaxEnrichmentConcurrency);
        var enriched = await Task.WhenAll(named.Select(async feature =>
        {
            await throttle.WaitAsync(cancellationToken);
            try
            {
                return await EnrichAsync(feature, cancellationToken);
            }
            finally
            {
                throttle.Release();
            }
        }));
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
            var detail = await placeClient.GetPlaceAsync(feature.Xid!, cancellationToken);
            if (detail is null)
            {
                return attraction;
            }

            var imageUrl = await imageProvider.GetImageUrlAsync(
                new DestinationImageContext { Name = feature.Name!, WikipediaUrl = detail.Wikipedia, WikidataId = detail.Wikidata },
                cancellationToken);

            return attraction with
            {
                Rating = detail.Rate,
                ImageUrl = imageUrl,
                Kinds = string.IsNullOrWhiteSpace(detail.Kinds) ? attraction.Kinds : SplitKinds(detail.Kinds)
            };
        }
        catch (Exception exception) when (exception is HttpRequestException or TaskCanceledException or JsonException)
        {
            return attraction;
        }
    }

    private static string NormalizeKinds(string? kinds)
    {
        if (string.IsNullOrWhiteSpace(kinds))
        {
            return DefaultKinds;
        }

        var tokens = kinds.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        if (tokens.Length == 0)
        {
            return DefaultKinds;
        }

        return string.Join(',', tokens.Select(Uri.EscapeDataString));
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
