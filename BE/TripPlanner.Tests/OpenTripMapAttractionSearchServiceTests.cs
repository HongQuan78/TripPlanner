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

    private static OpenTripMapPlaceClient CreatePlaceClient(HttpMessageHandler handler)
    {
        var httpClient = new HttpClient(handler)
        {
            BaseAddress = new Uri("https://api.opentripmap.com/0.1/en/places/")
        };
        return new OpenTripMapPlaceClient(httpClient, Options.Create(new OpenTripMapSettings()), TestCache.Create());
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
        return new OpenTripMapAttractionSearchService(httpClient, Options.Create(new OpenTripMapSettings()), imageProvider, CreatePlaceClient(handler));
    }

    private static (OpenTripMapAttractionSearchService Service, Func<string?> GetRadiusUrl) CreateCapturingService(IDestinationImageProvider imageProvider)
    {
        string? radiusUrl = null;
        var handler = new FakeHttpMessageHandler(request =>
        {
            var uri = request.RequestUri!;
            if (uri.AbsolutePath.Contains("radius"))
            {
                radiusUrl = uri.PathAndQuery;
                return new HttpResponseMessage(HttpStatusCode.OK) { Content = new StringContent(RadiusJson) };
            }

            return new HttpResponseMessage(HttpStatusCode.OK) { Content = new StringContent(XidJsonWithPreviewAndImage) };
        });
        var httpClient = new HttpClient(handler)
        {
            BaseAddress = new Uri("https://api.opentripmap.com/0.1/en/places/")
        };
        var service = new OpenTripMapAttractionSearchService(httpClient, Options.Create(new OpenTripMapSettings()), imageProvider, CreatePlaceClient(handler));
        return (service, () => radiusUrl);
    }

    [Fact]
    public async Task GetNearbyAsync_KindsAndMinRateProvided_ForwardedToRadiusQuery()
    {
        var imageProvider = Substitute.For<IDestinationImageProvider>();
        var (service, getRadiusUrl) = CreateCapturingService(imageProvider);

        await service.GetNearbyAsync(48.85, 2.29, 1000, 5, "cultural,historic", 3);

        var url = getRadiusUrl();
        Assert.NotNull(url);
        Assert.Contains("kinds=cultural,historic", url);
        Assert.Contains("rate=3", url);
    }

    [Fact]
    public async Task GetNearbyAsync_KindsAndMinRateOmitted_UsesDefaultKindsAndRate()
    {
        var imageProvider = Substitute.For<IDestinationImageProvider>();
        var (service, getRadiusUrl) = CreateCapturingService(imageProvider);

        await service.GetNearbyAsync(48.85, 2.29, 1000, 5);

        var url = getRadiusUrl();
        Assert.NotNull(url);
        Assert.Contains("kinds=interesting_places", url);
        Assert.Contains("rate=2", url);
    }

    private const string MultiRadiusJson = """
        [
            {"xid":"W1","name":"Alpha","kinds":"towers","dist":1.0},
            {"xid":"W2","name":"Beta","kinds":"museums","dist":2.0},
            {"xid":"W3","name":"Gamma","kinds":"parks","dist":3.0}
        ]
        """;

    private static (OpenTripMapAttractionSearchService Service, Func<string?> GetRadiusUrl) CreatePagingService(IDestinationImageProvider imageProvider)
    {
        string? radiusUrl = null;
        var handler = new FakeHttpMessageHandler(request =>
        {
            var uri = request.RequestUri!;
            if (uri.AbsolutePath.Contains("radius"))
            {
                radiusUrl = uri.PathAndQuery;
                return new HttpResponseMessage(HttpStatusCode.OK) { Content = new StringContent(MultiRadiusJson) };
            }

            return new HttpResponseMessage(HttpStatusCode.OK) { Content = new StringContent(XidJsonWithPreviewAndImage) };
        });
        var httpClient = new HttpClient(handler)
        {
            BaseAddress = new Uri("https://api.opentripmap.com/0.1/en/places/")
        };
        var service = new OpenTripMapAttractionSearchService(httpClient, Options.Create(new OpenTripMapSettings()), imageProvider, CreatePlaceClient(handler));
        return (service, () => radiusUrl);
    }

    [Fact]
    public async Task GetNearbyAsync_OffsetProvided_ExpandsProviderLimitAndReturnsOnlyPageWindow()
    {
        var imageProvider = Substitute.For<IDestinationImageProvider>();
        imageProvider.GetImageUrlAsync(Arg.Any<DestinationImageContext>(), Arg.Any<CancellationToken>())
            .Returns("https://upload.wikimedia.org/img.jpg");
        var (service, getRadiusUrl) = CreatePagingService(imageProvider);

        var results = await service.GetNearbyAsync(48.85, 2.29, 1000, 1, offset: 1);

        Assert.Contains("limit=2", getRadiusUrl());
        var attraction = Assert.Single(results);
        Assert.Equal("W2", attraction.Xid);
    }

    [Fact]
    public async Task GetNearbyAsync_OffsetProvided_EnrichesOnlyThePageWindow()
    {
        var imageProvider = Substitute.For<IDestinationImageProvider>();
        imageProvider.GetImageUrlAsync(Arg.Any<DestinationImageContext>(), Arg.Any<CancellationToken>())
            .Returns("https://upload.wikimedia.org/img.jpg");
        var (service, getRadiusUrl) = CreatePagingService(imageProvider);

        var results = await service.GetNearbyAsync(48.85, 2.29, 1000, 2, offset: 1);

        Assert.Contains("limit=3", getRadiusUrl());
        Assert.Equal(["W2", "W3"], results.Select(attraction => attraction.Xid).ToList());
        await imageProvider.Received(2).GetImageUrlAsync(Arg.Any<DestinationImageContext>(), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task GetNearbyAsync_NoOffset_RequestsUnexpandedLimitAndEnrichesWholePage()
    {
        var imageProvider = Substitute.For<IDestinationImageProvider>();
        imageProvider.GetImageUrlAsync(Arg.Any<DestinationImageContext>(), Arg.Any<CancellationToken>())
            .Returns("https://upload.wikimedia.org/img.jpg");
        var (service, getRadiusUrl) = CreatePagingService(imageProvider);

        var results = await service.GetNearbyAsync(48.85, 2.29, 1000, 3);

        Assert.Contains("limit=3", getRadiusUrl());
        Assert.Equal(["W1", "W2", "W3"], results.Select(attraction => attraction.Xid).ToList());
        await imageProvider.Received(3).GetImageUrlAsync(Arg.Any<DestinationImageContext>(), Arg.Any<CancellationToken>());
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
    public async Task GetNearbyAsync_XidDetailFetchThrows_ReturnsBareAttraction()
    {
        var handler = new FakeHttpMessageHandler(request =>
        {
            var path = request.RequestUri!.AbsolutePath;
            if (path.Contains("radius"))
            {
                return new HttpResponseMessage(HttpStatusCode.OK) { Content = new StringContent(RadiusJson) };
            }

            return new HttpResponseMessage(HttpStatusCode.InternalServerError);
        });
        var httpClient = new HttpClient(handler)
        {
            BaseAddress = new Uri("https://api.opentripmap.com/0.1/en/places/")
        };
        var imageProvider = Substitute.For<IDestinationImageProvider>();
        var service = new OpenTripMapAttractionSearchService(httpClient, Options.Create(new OpenTripMapSettings()), imageProvider, CreatePlaceClient(handler));

        var results = await service.GetNearbyAsync(48.85, 2.29, 1000, 5);

        var attraction = Assert.Single(results);
        Assert.Equal("W123", attraction.Xid);
        Assert.Equal("Eiffel Tower", attraction.Name);
        Assert.Equal(["towers"], attraction.Kinds);
        Assert.Null(attraction.Rating);
        Assert.Null(attraction.ImageUrl);
        await imageProvider.DidNotReceive().GetImageUrlAsync(Arg.Any<DestinationImageContext>(), Arg.Any<CancellationToken>());
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
        var service = new OpenTripMapAttractionSearchService(httpClient, Options.Create(new OpenTripMapSettings()), imageProvider, CreatePlaceClient(handler));

        var results = await service.GetNearbyAsync(48.85, 2.29, 1000, 5);

        var attraction = Assert.Single(results);
        Assert.Equal(2, xidAttempts);
        Assert.Equal("https://upload.wikimedia.org/eiffel.jpg", attraction.ImageUrl);
        Assert.Equal("7", attraction.Rating);
    }
}
