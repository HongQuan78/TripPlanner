using System.Net;
using Microsoft.Extensions.Options;
using NSubstitute;
using Xunit;
using TripPlanner.Application.Interfaces.Services;
using TripPlanner.Infrastructure.ExternalServices.OpenTripMap;
using TripPlanner.Infrastructure.Settings;

namespace TripPlanner.Tests;

public class OpenTripMapAttractionSearchServiceTests
{
    private sealed class FakeHttpMessageHandler(Func<HttpRequestMessage, HttpResponseMessage> respond) : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            return Task.FromResult(respond(request));
        }
    }

    private const string RadiusJson = """[{"xid":"W123","name":"Eiffel Tower","kinds":"towers","dist":42.5}]""";

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

    private static OpenTripMapAttractionSearchService CreateService(IDestinationImageProvider imageProvider, string xidJson = XidJsonWithPreviewAndImage)
    {
        var handler = new FakeHttpMessageHandler(request =>
        {
            var path = request.RequestUri!.AbsolutePath;
            if (path.Contains("radius"))
            {
                return new HttpResponseMessage(HttpStatusCode.OK) { Content = new StringContent(RadiusJson) };
            }

            return new HttpResponseMessage(HttpStatusCode.OK) { Content = new StringContent(xidJson) };
        });
        var httpClient = new HttpClient(handler)
        {
            BaseAddress = new Uri("https://api.opentripmap.com/0.1/en/places/")
        };
        return new OpenTripMapAttractionSearchService(httpClient, Options.Create(new OpenTripMapSettings()), imageProvider);
    }

    [Fact]
    public async Task GetNearbyAsync_XidResponseHasPreviewAndImage_ImageUrlComesOnlyFromProvider()
    {
        var imageProvider = Substitute.For<IDestinationImageProvider>();
        imageProvider.GetImageUrlAsync(Arg.Any<DestinationImageContext>(), Arg.Any<CancellationToken>())
            .Returns("https://upload.wikimedia.org/eiffel.jpg");
        var service = CreateService(imageProvider);

        var results = await service.GetNearbyAsync(48.85, 2.29, 1000, 5);

        var attraction = Assert.Single(results);
        Assert.Equal("https://upload.wikimedia.org/eiffel.jpg", attraction.ImageUrl);
        await imageProvider.Received(1).GetImageUrlAsync(
            Arg.Is<DestinationImageContext>(context =>
                context.Name == "Eiffel Tower" &&
                context.WikipediaUrl == "https://en.wikipedia.org/wiki/Eiffel_Tower"),
            Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task GetNearbyAsync_ProviderReturnsNull_ImageUrlIsNull()
    {
        var imageProvider = Substitute.For<IDestinationImageProvider>();
        imageProvider.GetImageUrlAsync(Arg.Any<DestinationImageContext>(), Arg.Any<CancellationToken>())
            .Returns((string?)null);
        var service = CreateService(imageProvider);

        var results = await service.GetNearbyAsync(48.85, 2.29, 1000, 5);

        var attraction = Assert.Single(results);
        Assert.Null(attraction.ImageUrl);
    }

    [Fact]
    public async Task GetNearbyAsync_XidCallRateLimited_RetriesAndStillEnriches()
    {
        var xidAttempts = 0;
        var handler = new FakeHttpMessageHandler(request =>
        {
            var path = request.RequestUri!.AbsolutePath;
            if (path.Contains("radius"))
            {
                return new HttpResponseMessage(HttpStatusCode.OK) { Content = new StringContent(RadiusJson) };
            }

            xidAttempts++;
            if (xidAttempts == 1)
            {
                return new HttpResponseMessage(HttpStatusCode.TooManyRequests);
            }

            return new HttpResponseMessage(HttpStatusCode.OK) { Content = new StringContent(XidJsonWithPreviewAndImage) };
        });
        var httpClient = new HttpClient(handler)
        {
            BaseAddress = new Uri("https://api.opentripmap.com/0.1/en/places/")
        };
        var imageProvider = Substitute.For<IDestinationImageProvider>();
        imageProvider.GetImageUrlAsync(Arg.Any<DestinationImageContext>(), Arg.Any<CancellationToken>())
            .Returns("https://upload.wikimedia.org/eiffel.jpg");
        var service = new OpenTripMapAttractionSearchService(httpClient, Options.Create(new OpenTripMapSettings()), imageProvider);

        var results = await service.GetNearbyAsync(48.85, 2.29, 1000, 5);

        var attraction = Assert.Single(results);
        Assert.Equal(2, xidAttempts);
        Assert.Equal("https://upload.wikimedia.org/eiffel.jpg", attraction.ImageUrl);
        Assert.Equal("7", attraction.Rating);
    }
}
