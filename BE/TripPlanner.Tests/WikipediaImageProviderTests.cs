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

        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            LastRequest = request;
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

    private static DestinationImageContext CreateContext(string? wikipediaUrl)
    {
        return new DestinationImageContext { Name = "Eiffel Tower", WikipediaUrl = wikipediaUrl };
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
}
