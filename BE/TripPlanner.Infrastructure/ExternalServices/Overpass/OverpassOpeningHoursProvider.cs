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
    private const int FailureCacheMinutes = 5;

    public async Task<string?> GetOpeningHoursAsync(OpeningHoursContext context, CancellationToken cancellationToken = default)
    {
        var element = ParseElement(context.Xid);
        if (element is null)
        {
            return null;
        }

        var cacheKey = $"osm:hours:{element.Value.Type}:{element.Value.Id}";
        var cached = await cache.GetAsync<OpeningHoursCacheEntry>(cacheKey, cancellationToken);
        if (cached is not null)
        {
            return cached.Value;
        }

        var lookup = await FetchAsync(element.Value.Type, element.Value.Id, cancellationToken);

        if (!cancellationToken.IsCancellationRequested)
        {
            var minutes = lookup.IsDefinitive ? ResolveCacheMinutes() : FailureCacheMinutes;
            await cache.SetAsync(cacheKey, new OpeningHoursCacheEntry { Value = lookup.Value }, TimeSpan.FromMinutes(minutes), cancellationToken);
        }

        return lookup.Value;
    }

    private int ResolveCacheMinutes()
    {
        return options.Value.CacheMinutes > 0 ? options.Value.CacheMinutes : DefaultCacheMinutes;
    }

    private async Task<OpeningHoursLookup> FetchAsync(string elementType, string osmId, CancellationToken cancellationToken)
    {
        try
        {
            var query = $"[out:json];{elementType}({osmId});out tags;";
            using var content = new FormUrlEncodedContent(new[] { new KeyValuePair<string, string>("data", query) });
            using var response = await httpClient.PostAsync("interpreter", content, cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                return OpeningHoursLookup.Failed;
            }

            var payload = await response.Content.ReadFromJsonAsync<OverpassResponseModel>(cancellationToken);
            var tags = payload?.Elements?.FirstOrDefault()?.Tags;
            if (tags is null || !tags.TryGetValue("opening_hours", out var openingHours))
            {
                return OpeningHoursLookup.Absent;
            }

            return string.IsNullOrWhiteSpace(openingHours)
                ? OpeningHoursLookup.Absent
                : new OpeningHoursLookup(true, openingHours.Trim());
        }
        catch (Exception exception) when (exception is HttpRequestException or TaskCanceledException or JsonException or NotSupportedException)
        {
            return OpeningHoursLookup.Failed;
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

internal sealed record OpeningHoursLookup(bool IsDefinitive, string? Value)
{
    public static readonly OpeningHoursLookup Absent = new(true, null);
    public static readonly OpeningHoursLookup Failed = new(false, null);
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
