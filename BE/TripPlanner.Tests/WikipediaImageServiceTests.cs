using System.Net;
using Xunit;
using TripPlanner.Infrastructure.ExternalServices.Wikipedia;

namespace TripPlanner.Tests;

public class WikipediaImageServiceTests
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

    private static WikipediaImageService CreateService(FakeHttpMessageHandler handler)
    {
        var httpClient = new HttpClient(handler)
        {
            BaseAddress = new Uri("https://en.wikipedia.org/api/rest_v1/")
        };
        return new WikipediaImageService(httpClient);
    }

    [Fact]
    public async Task GetThumbnailUrlAsync_ResponseHasThumbnail_ReturnsThumbnailSource()
    {
        var handler = new FakeHttpMessageHandler(_ => new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent("""{"thumbnail":{"source":"https://upload.wikimedia.org/eiffel.jpg"}}""")
        });
        var service = CreateService(handler);

        var result = await service.GetThumbnailUrlAsync("https://en.wikipedia.org/wiki/Eiffel_Tower");

        Assert.Equal("https://upload.wikimedia.org/eiffel.jpg", result);
        Assert.EndsWith("page/summary/Eiffel_Tower", handler.LastRequest!.RequestUri!.AbsoluteUri);
    }

    [Fact]
    public async Task GetThumbnailUrlAsync_ResponseHasNoThumbnail_ReturnsNull()
    {
        var handler = new FakeHttpMessageHandler(_ => new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent("""{"title":"Eiffel Tower"}""")
        });
        var service = CreateService(handler);

        var result = await service.GetThumbnailUrlAsync("https://en.wikipedia.org/wiki/Eiffel_Tower");

        Assert.Null(result);
    }

    [Fact]
    public async Task GetThumbnailUrlAsync_NonSuccessStatusCode_ReturnsNull()
    {
        var handler = new FakeHttpMessageHandler(_ => new HttpResponseMessage(HttpStatusCode.NotFound));
        var service = CreateService(handler);

        var result = await service.GetThumbnailUrlAsync("https://en.wikipedia.org/wiki/Nonexistent_Page");

        Assert.Null(result);
    }

    [Theory]
    [InlineData("")]
    [InlineData("not-a-url")]
    [InlineData("https://en.wikipedia.org/")]
    public async Task GetThumbnailUrlAsync_MalformedUrl_ReturnsNullWithoutHttpCall(string wikipediaUrl)
    {
        var handler = new FakeHttpMessageHandler(_ => throw new InvalidOperationException("HTTP call should not be made"));
        var service = CreateService(handler);

        var result = await service.GetThumbnailUrlAsync(wikipediaUrl);

        Assert.Null(result);
    }
}
