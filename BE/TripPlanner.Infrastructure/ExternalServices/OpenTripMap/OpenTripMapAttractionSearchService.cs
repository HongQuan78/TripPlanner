using System.Globalization;
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.Options;
using TripPlanner.Application.DTOs.Responses;
using TripPlanner.Application.Interfaces.Services;
using TripPlanner.Infrastructure.Settings;

namespace TripPlanner.Infrastructure.ExternalServices.OpenTripMap;

public class OpenTripMapAttractionSearchService(
    HttpClient httpClient,
    IOptions<OpenTripMapSettings> options,
    IDestinationImageProvider imageProvider) : IAttractionSearchService
{
    private const string DefaultKinds = "interesting_places";
    private const string MinimumRate = "2";
    private const int MaxEnrichmentConcurrency = 5;
    private const int RateLimitRetryCount = 2;
    private static readonly TimeSpan RateLimitRetryDelay = TimeSpan.FromMilliseconds(600);

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
            var detail = await FetchDetailAsync(feature.Xid!, cancellationToken);
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

    private async Task<OpenTripMapPlaceModel?> FetchDetailAsync(string xid, CancellationToken cancellationToken)
    {
        var url = $"xid/{Uri.EscapeDataString(xid)}?apikey={options.Value.ApiKey}";
        for (var attempt = 0; ; attempt++)
        {
            try
            {
                return await httpClient.GetFromJsonAsync<OpenTripMapPlaceModel>(url, cancellationToken);
            }
            catch (HttpRequestException exception) when (exception.StatusCode == HttpStatusCode.TooManyRequests && attempt < RateLimitRetryCount)
            {
                await Task.Delay(RateLimitRetryDelay, cancellationToken);
            }
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
