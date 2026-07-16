using System.Net;
using Xunit;
using TripPlanner.Application.Interfaces.Services;
using TripPlanner.Infrastructure.ExternalServices.Wikipedia;

namespace TripPlanner.Tests;

public class WikipediaImageProviderTests
{
    private sealed class FakeHttpMessageHandler(Func<HttpRequestMessage, HttpResponseMessage> respond) : HttpMessageHandler
    {
        public HttpRequestMessage? LastRequest { get; private set; }

        public List<HttpRequestMessage> Requests { get; } = [];

        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            LastRequest = request;
            Requests.Add(request);
            return Task.FromResult(respond(request));
        }
    }

    private static WikipediaImageProvider CreateProvider(FakeHttpMessageHandler handler)
    {
        var httpClient = new HttpClient(handler)
        {
            BaseAddress = new Uri("https://en.wikipedia.org/api/rest_v1/")
        };
        return new WikipediaImageProvider(httpClient);
    }

    private static DestinationImageContext CreateContext(string? wikipediaUrl, string? wikidataId = null)
    {
        return new DestinationImageContext { Name = "Eiffel Tower", WikipediaUrl = wikipediaUrl, WikidataId = wikidataId };
    }

    [Fact]
    public async Task GetImageUrlAsync_ResponseHasThumbnail_ReturnsThumbnailSource()
    {
        var handler = new FakeHttpMessageHandler(_ => new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent("""{"thumbnail":{"source":"https://upload.wikimedia.org/eiffel.jpg"}}""")
        });
        var provider = CreateProvider(handler);

        var result = await provider.GetImageUrlAsync(CreateContext("https://en.wikipedia.org/wiki/Eiffel_Tower"));

        Assert.Equal("https://upload.wikimedia.org/eiffel.jpg", result);
        Assert.EndsWith("page/summary/Eiffel_Tower", handler.LastRequest!.RequestUri!.AbsoluteUri);
    }

    [Fact]
    public async Task GetImageUrlAsync_ResponseHasNoThumbnail_ReturnsNull()
    {
        var handler = new FakeHttpMessageHandler(_ => new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent("""{"title":"Eiffel Tower"}""")
        });
        var provider = CreateProvider(handler);

        var result = await provider.GetImageUrlAsync(CreateContext("https://en.wikipedia.org/wiki/Eiffel_Tower"));

        Assert.Null(result);
    }

    [Fact]
    public async Task GetImageUrlAsync_NonSuccessStatusCode_ReturnsNull()
    {
        var handler = new FakeHttpMessageHandler(_ => new HttpResponseMessage(HttpStatusCode.NotFound));
        var provider = CreateProvider(handler);

        var result = await provider.GetImageUrlAsync(CreateContext("https://en.wikipedia.org/wiki/Nonexistent_Page"));

        Assert.Null(result);
    }

    [Theory]
    [InlineData("not-a-url")]
    [InlineData("https://en.wikipedia.org/")]
    public async Task GetImageUrlAsync_MalformedUrl_ReturnsNullWithoutHttpCall(string wikipediaUrl)
    {
        var handler = new FakeHttpMessageHandler(_ => throw new InvalidOperationException("HTTP call should not be made"));
        var provider = CreateProvider(handler);

        var result = await provider.GetImageUrlAsync(CreateContext(wikipediaUrl));

        Assert.Null(result);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public async Task GetImageUrlAsync_MissingWikipediaUrl_ReturnsNullWithoutHttpCall(string? wikipediaUrl)
    {
        var handler = new FakeHttpMessageHandler(_ => throw new InvalidOperationException("HTTP call should not be made"));
        var provider = CreateProvider(handler);

        var result = await provider.GetImageUrlAsync(CreateContext(wikipediaUrl));

        Assert.Null(result);
        Assert.Null(handler.LastRequest);
    }

    [Fact]
    public async Task GetImageUrlAsync_NonEnglishWikipediaUrl_QueriesThatLanguageHost()
    {
        var handler = new FakeHttpMessageHandler(_ => new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent("""{"thumbnail":{"source":"https://upload.wikimedia.org/thap.jpg"}}""")
        });
        var provider = CreateProvider(handler);

        var result = await provider.GetImageUrlAsync(CreateContext("https://vi.wikipedia.org/wiki/Th%C3%A1p%20H%C3%B2a%20Phong"));

        Assert.Equal("https://upload.wikimedia.org/thap.jpg", result);
        Assert.Equal("vi.wikipedia.org", handler.LastRequest!.RequestUri!.Host);
        Assert.StartsWith("https://vi.wikipedia.org/api/rest_v1/page/summary/", handler.LastRequest.RequestUri.AbsoluteUri);
    }

    [Fact]
    public async Task GetImageUrlAsync_NonWikipediaHost_FallsBackToConfiguredBase()
    {
        var handler = new FakeHttpMessageHandler(_ => new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent("""{"thumbnail":{"source":"https://upload.wikimedia.org/eiffel.jpg"}}""")
        });
        var provider = CreateProvider(handler);

        var result = await provider.GetImageUrlAsync(CreateContext("https://example.com/wiki/Eiffel_Tower"));

        Assert.Equal("https://upload.wikimedia.org/eiffel.jpg", result);
        Assert.Equal("en.wikipedia.org", handler.LastRequest!.RequestUri!.Host);
    }

    [Fact]
    public async Task GetImageUrlAsync_TitleWithReservedCharacters_EscapesTitleInRequestPath()
    {
        var handler = new FakeHttpMessageHandler(_ => new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent("""{"thumbnail":{"source":"https://upload.wikimedia.org/acdc.jpg"}}""")
        });
        var provider = CreateProvider(handler);

        var result = await provider.GetImageUrlAsync(CreateContext("https://en.wikipedia.org/wiki/AC%2FDC"));

        Assert.Equal("https://upload.wikimedia.org/acdc.jpg", result);
        Assert.EndsWith("page/summary/AC%2FDC", handler.LastRequest!.RequestUri!.AbsoluteUri);
    }

    [Fact]
    public async Task GetImageUrlAsync_WikipediaMissWithWikidataClaim_ReturnsCommonsFilePathUrl()
    {
        var handler = new FakeHttpMessageHandler(request =>
        {
            if (request.RequestUri!.Host == "www.wikidata.org")
            {
                return new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new StringContent("""{"claims":{"P18":[{"mainsnak":{"datavalue":{"value":"Turtle Tower c2006.jpg","type":"string"}}}]}}""")
                };
            }

            return new HttpResponseMessage(HttpStatusCode.NotFound);
        });
        var provider = CreateProvider(handler);

        var result = await provider.GetImageUrlAsync(CreateContext("https://en.wikipedia.org/wiki/Turtle_Tower", "Q1134533"));

        Assert.Equal("https://commons.wikimedia.org/wiki/Special:FilePath/Turtle%20Tower%20c2006.jpg?width=640", result);
    }

    [Fact]
    public async Task GetImageUrlAsync_NoWikipediaUrlWithWikidataClaim_ReturnsCommonsFilePathUrl()
    {
        var handler = new FakeHttpMessageHandler(_ => new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent("""{"claims":{"P18":[{"mainsnak":{"datavalue":{"value":"Photo.jpg","type":"string"}}}]}}""")
        });
        var provider = CreateProvider(handler);

        var result = await provider.GetImageUrlAsync(CreateContext(null, "Q42"));

        Assert.Equal("https://commons.wikimedia.org/wiki/Special:FilePath/Photo.jpg?width=640", result);
        Assert.Single(handler.Requests);
        Assert.Equal("www.wikidata.org", handler.LastRequest!.RequestUri!.Host);
    }

    [Fact]
    public async Task GetImageUrlAsync_WikidataEmptyClaims_ReturnsNull()
    {
        var handler = new FakeHttpMessageHandler(_ => new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent("""{"claims":{}}""")
        });
        var provider = CreateProvider(handler);

        var result = await provider.GetImageUrlAsync(CreateContext(null, "Q10825843"));

        Assert.Null(result);
    }

    [Theory]
    [InlineData("Q12; DROP TABLE")]
    [InlineData("not-an-id")]
    [InlineData("Q")]
    public async Task GetImageUrlAsync_MalformedWikidataId_ReturnsNullWithoutHttpCall(string wikidataId)
    {
        var handler = new FakeHttpMessageHandler(_ => throw new InvalidOperationException("HTTP call should not be made"));
        var provider = CreateProvider(handler);

        var result = await provider.GetImageUrlAsync(CreateContext(null, wikidataId));

        Assert.Null(result);
        Assert.Null(handler.LastRequest);
    }

    [Fact]
    public async Task GetImageUrlAsync_WikipediaHit_DoesNotCallWikidata()
    {
        var handler = new FakeHttpMessageHandler(_ => new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent("""{"thumbnail":{"source":"https://upload.wikimedia.org/eiffel.jpg"}}""")
        });
        var provider = CreateProvider(handler);

        var result = await provider.GetImageUrlAsync(CreateContext("https://en.wikipedia.org/wiki/Eiffel_Tower", "Q243"));

        Assert.Equal("https://upload.wikimedia.org/eiffel.jpg", result);
        Assert.Single(handler.Requests);
        Assert.Equal("en.wikipedia.org", handler.LastRequest!.RequestUri!.Host);
    }
}
