using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using TripPlanner.Application.Interfaces.Services;

namespace TripPlanner.Infrastructure.ExternalServices.Wikipedia;

public class WikipediaImageProvider(HttpClient httpClient) : IDestinationImageProvider
{
    public async Task<string?> GetImageUrlAsync(DestinationImageContext context, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(context.WikipediaUrl))
        {
            return null;
        }

        var title = ExtractTitle(context.WikipediaUrl);
        if (title is null)
        {
            return null;
        }

        try
        {
            var url = $"page/summary/{title}";
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

    private static string? ExtractTitle(string wikipediaUrl)
    {
        if (!Uri.TryCreate(wikipediaUrl, UriKind.Absolute, out var uri))
        {
            return null;
        }

        var lastSegment = uri.Segments.LastOrDefault()?.TrimEnd('/');
        if (string.IsNullOrWhiteSpace(lastSegment))
        {
            return null;
        }

        return Uri.UnescapeDataString(lastSegment);
    }
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
