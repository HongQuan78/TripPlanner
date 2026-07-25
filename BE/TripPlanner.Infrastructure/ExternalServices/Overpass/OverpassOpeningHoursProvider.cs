using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Text.RegularExpressions;
using Microsoft.Extensions.Options;
using TripPlanner.Application.Interfaces.Services;
using TripPlanner.Infrastructure.Caching;
using TripPlanner.Infrastructure.Settings;

namespace TripPlanner.Infrastructure.ExternalServices.Overpass;

internal partial class OverpassOpeningHoursProvider(
    HttpClient httpClient,
    IOptions<OverpassSettings> options,
    IResponseCache cache) : IOpeningHoursProvider
{
    private const int DefaultCacheMinutes = 1440;

    public async Task<string?> GetOpeningHoursAsync(OpeningHoursContext context, CancellationToken cancellationToken = default)
    {
        var element = ParseElement(context.Xid);
        if (element is null)
        {
            return null;
        }

        var cacheKey = $"osm:hours:{context.Xid.Trim()}";
        var cached = await cache.GetAsync<OpeningHoursCacheEntry>(cacheKey, cancellationToken);
        if (cached is not null)
        {
            return cached.Value;
        }

        var hours = await FetchAsync(element.Value.Type, element.Value.Id, cancellationToken);

        var minutes = options.Value.CacheMinutes > 0 ? options.Value.CacheMinutes : DefaultCacheMinutes;
        await cache.SetAsync(cacheKey, new OpeningHoursCacheEntry { Value = hours }, TimeSpan.FromMinutes(minutes), cancellationToken);

        return hours;
    }

    private async Task<string?> FetchAsync(string elementType, string osmId, CancellationToken cancellationToken)
    {
        try
        {
            var query = $"[out:json];{elementType}({osmId});out tags;";
            using var content = new FormUrlEncodedContent(new[] { new KeyValuePair<string, string>("data", query) });
            using var response = await httpClient.PostAsync("interpreter", content, cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                return null;
            }

            var payload = await response.Content.ReadFromJsonAsync<OverpassResponseModel>(cancellationToken);
            var tags = payload?.Elements?.FirstOrDefault()?.Tags;
            if (tags is null || !tags.TryGetValue("opening_hours", out var openingHours))
            {
                return null;
            }

            return string.IsNullOrWhiteSpace(openingHours) ? null : openingHours.Trim();
        }
        catch (Exception exception) when (exception is HttpRequestException or TaskCanceledException or JsonException)
        {
            return null;
        }
    }

    private static (string Type, string Id)? ParseElement(string? xid)
    {
        if (string.IsNullOrWhiteSpace(xid))
        {
            return null;
        }

        var trimmed = xid.Trim();
        if (!OsmXidRegex().IsMatch(trimmed))
        {
            return null;
        }

        var type = char.ToUpperInvariant(trimmed[0]) switch
        {
            'N' => "node",
            'W' => "way",
            'R' => "rel",
            _ => null
        };

        if (type is null)
        {
            return null;
        }

        return (type, trimmed[1..]);
    }

    [GeneratedRegex(@"^[NWRnwr]\d+$")]
    private static partial Regex OsmXidRegex();
}

internal sealed record OpeningHoursCacheEntry
{
    public string? Value { get; init; }
}

internal sealed record OverpassResponseModel
{
    [JsonPropertyName("elements")]
    public List<OverpassElementModel>? Elements { get; init; }
}

internal sealed record OverpassElementModel
{
    [JsonPropertyName("tags")]
    public Dictionary<string, string>? Tags { get; init; }
}
