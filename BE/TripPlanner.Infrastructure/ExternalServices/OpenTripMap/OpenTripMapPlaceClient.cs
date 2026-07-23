using System.Net;
using System.Net.Http.Json;
using Microsoft.Extensions.Options;
using TripPlanner.Infrastructure.Caching;
using TripPlanner.Infrastructure.Settings;

namespace TripPlanner.Infrastructure.ExternalServices.OpenTripMap;

internal class OpenTripMapPlaceClient(
    HttpClient httpClient,
    IOptions<OpenTripMapSettings> options,
    IResponseCache cache) : IOpenTripMapPlaceClient
{
    private const int RateLimitRetryCount = 2;
    private const int DefaultCacheMinutes = 1440;
    private static readonly TimeSpan RateLimitRetryDelay = TimeSpan.FromMilliseconds(600);

    public async Task<OpenTripMapPlaceModel?> GetPlaceAsync(string xid, CancellationToken cancellationToken = default)
    {
        var cacheKey = $"otm:place:{xid}";
        var cached = await cache.GetAsync<OpenTripMapPlaceModel>(cacheKey, cancellationToken);
        if (cached is not null)
        {
            return cached;
        }

        var place = await FetchAsync(xid, cancellationToken);
        if (place is not null)
        {
            var minutes = options.Value.DetailCacheMinutes > 0 ? options.Value.DetailCacheMinutes : DefaultCacheMinutes;
            await cache.SetAsync(cacheKey, place, TimeSpan.FromMinutes(minutes), cancellationToken);
        }

        return place;
    }

    private async Task<OpenTripMapPlaceModel?> FetchAsync(string xid, CancellationToken cancellationToken)
    {
        var url = $"xid/{Uri.EscapeDataString(xid)}?apikey={options.Value.ApiKey}";
        for (var attempt = 0; ; attempt++)
        {
            using var response = await httpClient.GetAsync(url, cancellationToken);
            if (response.StatusCode == HttpStatusCode.NotFound)
            {
                return null;
            }

            if (response.StatusCode == HttpStatusCode.TooManyRequests && attempt < RateLimitRetryCount)
            {
                await Task.Delay(RateLimitRetryDelay, cancellationToken);
                continue;
            }

            response.EnsureSuccessStatusCode();
            return await response.Content.ReadFromJsonAsync<OpenTripMapPlaceModel>(cancellationToken);
        }
    }
}
