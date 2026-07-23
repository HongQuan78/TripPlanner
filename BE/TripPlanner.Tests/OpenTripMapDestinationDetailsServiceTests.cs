using System.Net;
using Microsoft.Extensions.Options;
using NSubstitute;
using Xunit;
using TripPlanner.Application.Interfaces.Services;
using TripPlanner.Infrastructure.ExternalServices.OpenTripMap;
using TripPlanner.Infrastructure.Settings;

namespace TripPlanner.Tests;

public class OpenTripMapDestinationDetailsServiceTests
{
    private sealed class FakeHttpMessageHandler(Func<HttpRequestMessage, HttpResponseMessage> respond) : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            return Task.FromResult(respond(request));
        }
    }

    private const string XidJsonWithPreviewAndImage = """
        {
            "xid":"W123",
            "name":"Eiffel Tower",
            "kinds":"towers,architecture",
            "rate":"7",
            "preview":{"source":"https://dev.opentripmap.org/broken-preview.jpg"},
            "image":"https://dev.opentripmap.org/broken-image.jpg",
            "wikipedia":"https://en.wikipedia.org/wiki/Eiffel_Tower"
        }
        """;

    private static OpenTripMapDestinationDetailsService CreateService(IDestinationImageProvider imageProvider, string xidJson = XidJsonWithPreviewAndImage)
    {
        var handler = new FakeHttpMessageHandler(_ => new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent(xidJson)
        });
        var httpClient = new HttpClient(handler)
        {
            BaseAddress = new Uri("https://api.opentripmap.com/0.1/en/places/")
        };
        var placeClient = new OpenTripMapPlaceClient(httpClient, Options.Create(new OpenTripMapSettings()), TestCache.Create());
        return new OpenTripMapDestinationDetailsService(placeClient, imageProvider);
    }

    [Fact]
    public async Task GetDetailsAsync_XidResponseHasPreviewAndImage_ImageUrlsComeOnlyFromProvider()
    {
        var imageProvider = Substitute.For<IDestinationImageProvider>();
        imageProvider.GetImageUrlAsync(Arg.Any<DestinationImageContext>(), Arg.Any<CancellationToken>())
            .Returns("https://upload.wikimedia.org/eiffel.jpg");
        var service = CreateService(imageProvider);

        var result = await service.GetDetailsAsync("W123");

        Assert.NotNull(result);
        Assert.Equal(["https://upload.wikimedia.org/eiffel.jpg"], result.ImageUrls);
        await imageProvider.Received(1).GetImageUrlAsync(
            Arg.Is<DestinationImageContext>(context =>
                context.Name == "Eiffel Tower" &&
                context.WikipediaUrl == "https://en.wikipedia.org/wiki/Eiffel_Tower"),
            Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task GetDetailsAsync_ProviderReturnsNull_ImageUrlsIsEmpty()
    {
        var imageProvider = Substitute.For<IDestinationImageProvider>();
        imageProvider.GetImageUrlAsync(Arg.Any<DestinationImageContext>(), Arg.Any<CancellationToken>())
            .Returns((string?)null);
        var service = CreateService(imageProvider);

        var result = await service.GetDetailsAsync("W123");

        Assert.NotNull(result);
        Assert.Empty(result.ImageUrls);
    }
}
