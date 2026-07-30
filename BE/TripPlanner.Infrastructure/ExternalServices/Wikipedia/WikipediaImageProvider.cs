using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Text.RegularExpressions;
using Microsoft.Extensions.Options;
using TripPlanner.Application.Interfaces.Services;
using TripPlanner.Infrastructure.Caching;
using TripPlanner.Infrastructure.Settings;

namespace TripPlanner.Infrastructure.ExternalServices.Wikipedia;

internal partial class WikipediaImageProvider(
    HttpClient httpClient,
    IOptions<WikipediaSettings> options,
    IResponseCache cache) : IDestinationImageProvider
{
    private const string WikipediaHostSuffix = ".wikipedia.org";
    private const string WikidataClaimsUrlFormat = "https://www.wikidata.org/w/api.php?action=wbgetclaims&property=P18&format=json&entity={0}";
    private const string CommonsFilePathUrlFormat = "https://commons.wikimedia.org/wiki/Special:FilePath/{0}?width=640";
    private const int DefaultCacheMinutes = 1440;

    public async Task<string?> GetImageUrlAsync(DestinationImageContext context, CancellationToken cancellationToken = default)
    {
        var cacheKey = BuildCacheKey(context);
        if (cacheKey is not null)
        {
            var cached = await cache.GetAsync<ImageCacheEntry>(cacheKey, cancellationToken);
            if (cached is not null)
            {
                return cached.Value;
            }
        }

        var thumbnail = await GetWikipediaThumbnailAsync(context.WikipediaUrl, cancellationToken);
        var imageUrl = string.IsNullOrWhiteSpace(thumbnail)
            ? await GetWikidataImageAsync(context.WikidataId, cancellationToken)
            : thumbnail;

        if (cacheKey is not null)
        {
            var minutes = options.Value.CacheMinutes > 0 ? options.Value.CacheMinutes : DefaultCacheMinutes;
            await cache.SetAsync(cacheKey, new ImageCacheEntry { Value = imageUrl }, TimeSpan.FromMinutes(minutes), cancellationToken);
        }

        return imageUrl;
    }

    private static string? BuildCacheKey(DestinationImageContext context)
    {
        var wikipedia = context.WikipediaUrl?.Trim();
        var wikidata = context.WikidataId?.Trim();
        if (string.IsNullOrWhiteSpace(wikipedia) && string.IsNullOrWhiteSpace(wikidata))
        {
            return null;
        }

        return $"wiki:image:{wikipedia}|{wikidata}";
    }

    private async Task<string?> GetWikipediaThumbnailAsync(string? wikipediaUrl, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(wikipediaUrl))
        {
            return null;
        }

        if (!Uri.TryCreate(wikipediaUrl, UriKind.Absolute, out var uri))
        {
            return null;
        }

        var title = ExtractTitle(uri);
        if (title is null)
        {
            return null;
        }

        try
        {
            var url = BuildSummaryUrl(uri, title);
            using var response = await httpClient.GetAsync(url, cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                return null;
            }

            var summary = await response.Content.ReadFromJsonAsync<WikipediaSummaryModel>(cancellationToken: cancellationToken);
            return summary?.Thumbnail?.Source;
        }
        catch (Exception exception) when (exception is HttpRequestException or TaskCanceledException or JsonException)
        {
            return null;
        }
    }

    private async Task<string?> GetWikidataImageAsync(string? wikidataId, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(wikidataId) || !WikidataIdRegex().IsMatch(wikidataId))
        {
            return null;
        }

        try
        {
            var url = string.Format(WikidataClaimsUrlFormat, wikidataId);
            using var response = await httpClient.GetAsync(url, cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                return null;
            }

            var claims = await response.Content.ReadFromJsonAsync<WikidataClaimsModel>(cancellationToken: cancellationToken);
            var fileName = claims?.Claims?.Images?.FirstOrDefault()?.MainSnak?.DataValue?.Value;
            if (string.IsNullOrWhiteSpace(fileName))
            {
                return null;
            }

            return string.Format(CommonsFilePathUrlFormat, Uri.EscapeDataString(fileName));
        }
        catch (Exception exception) when (exception is HttpRequestException or TaskCanceledException or JsonException)
        {
            return null;
        }
    }

    private static string BuildSummaryUrl(Uri wikipediaUri, string title)
    {
        var escapedTitle = Uri.EscapeDataString(title);
        if (wikipediaUri.Host.EndsWith(WikipediaHostSuffix, StringComparison.OrdinalIgnoreCase))
        {
            return $"https://{wikipediaUri.Host}/api/rest_v1/page/summary/{escapedTitle}";
        }

        return $"page/summary/{escapedTitle}";
    }

    private static string? ExtractTitle(Uri uri)
    {
        var lastSegment = uri.Segments.LastOrDefault()?.TrimEnd('/');
        if (string.IsNullOrWhiteSpace(lastSegment))
        {
            return null;
        }

        return Uri.UnescapeDataString(lastSegment);
    }

    [GeneratedRegex(@"^Q\d+$")]
    private static partial Regex WikidataIdRegex();
}

internal sealed record ImageCacheEntry
{
    public string? Value { get; init; }
}

internal sealed record WikipediaSummaryModel
{
    [JsonPropertyName("thumbnail")]
    public WikipediaThumbnailModel? Thumbnail { get; init; }
}

internal sealed record WikipediaThumbnailModel
{
    [JsonPropertyName("source")]
    public string? Source { get; init; }
}

internal sealed record WikidataClaimsModel
{
    [JsonPropertyName("claims")]
    public WikidataClaimListModel? Claims { get; init; }
}

internal sealed record WikidataClaimListModel
{
    [JsonPropertyName("P18")]
    public List<WikidataClaimModel>? Images { get; init; }
}

internal sealed record WikidataClaimModel
{
    [JsonPropertyName("mainsnak")]
    public WikidataMainSnakModel? MainSnak { get; init; }
}

internal sealed record WikidataMainSnakModel
{
    [JsonPropertyName("datavalue")]
    public WikidataDataValueModel? DataValue { get; init; }
}

internal sealed record WikidataDataValueModel
{
    [JsonPropertyName("value")]
    public string? Value { get; init; }
}
