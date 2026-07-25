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

    private static OpenTripMapDestinationDetailsService CreateService(
        IDestinationImageProvider imageProvider,
        string xidJson = XidJsonWithPreviewAndImage,
        IOpeningHoursProvider? openingHoursProvider = null)
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

        if (openingHoursProvider is null)
        {
            openingHoursProvider = Substitute.For<IOpeningHoursProvider>();
            openingHoursProvider.GetOpeningHoursAsync(Arg.Any<OpeningHoursContext>(), Arg.Any<CancellationToken>())
                .Returns((string?)null);
        }

        return new OpenTripMapDestinationDetailsService(placeClient, imageProvider, openingHoursProvider);
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

    [Fact]
    public async Task GetDetailsAsync_OpeningHoursProviderReturnsHours_PopulatesOpeningHours()
    {
        var imageProvider = Substitute.For<IDestinationImageProvider>();
        imageProvider.GetImageUrlAsync(Arg.Any<DestinationImageContext>(), Arg.Any<CancellationToken>())
            .Returns((string?)null);
        var openingHoursProvider = Substitute.For<IOpeningHoursProvider>();
        openingHoursProvider.GetOpeningHoursAsync(Arg.Any<OpeningHoursContext>(), Arg.Any<CancellationToken>())
            .Returns("Mo-Fr 09:00-17:00");
        var service = CreateService(imageProvider, openingHoursProvider: openingHoursProvider);

        var result = await service.GetDetailsAsync("W123");

        Assert.NotNull(result);
        Assert.Equal("Mo-Fr 09:00-17:00", result.OpeningHours);
        await openingHoursProvider.Received(1).GetOpeningHoursAsync(
            Arg.Is<OpeningHoursContext>(context => context.Xid == "W123"),
            Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task GetDetailsAsync_OpeningHoursProviderReturnsNull_OpeningHoursIsNull()
    {
        var imageProvider = Substitute.For<IDestinationImageProvider>();
        imageProvider.GetImageUrlAsync(Arg.Any<DestinationImageContext>(), Arg.Any<CancellationToken>())
            .Returns((string?)null);
        var service = CreateService(imageProvider);

        var result = await service.GetDetailsAsync("W123");

        Assert.NotNull(result);
        Assert.Null(result.OpeningHours);
    }

    [Fact]
    public async Task GetDetailsAsync_ImageAndHours_RunConcurrently()
    {
        var imageStarted = new TaskCompletionSource();
        var hoursStarted = new TaskCompletionSource();

        var imageProvider = Substitute.For<IDestinationImageProvider>();
        imageProvider.GetImageUrlAsync(Arg.Any<DestinationImageContext>(), Arg.Any<CancellationToken>())
            .Returns(async _ =>
            {
                imageStarted.SetResult();
                await hoursStarted.Task;
                return (string?)"https://upload.wikimedia.org/eiffel.jpg";
            });

        var openingHoursProvider = Substitute.For<IOpeningHoursProvider>();
        openingHoursProvider.GetOpeningHoursAsync(Arg.Any<OpeningHoursContext>(), Arg.Any<CancellationToken>())
            .Returns(async _ =>
            {
                hoursStarted.SetResult();
                await imageStarted.Task;
                return (string?)"Mo-Fr 09:00-17:00";
            });

        var service = CreateService(imageProvider, openingHoursProvider: openingHoursProvider);

        var detailsTask = service.GetDetailsAsync("W123");
        var completed = await Task.WhenAny(detailsTask, Task.Delay(TimeSpan.FromSeconds(5)));

        Assert.Same(detailsTask, completed);
        var result = await detailsTask;
        Assert.NotNull(result);
        Assert.Equal(["https://upload.wikimedia.org/eiffel.jpg"], result.ImageUrls);
        Assert.Equal("Mo-Fr 09:00-17:00", result.OpeningHours);
    }

    [Fact]
    public async Task GetDetailsAsync_ImageProviderFaults_OpeningHoursStillPopulatesAndReturns200()
    {
        var imageProvider = Substitute.For<IDestinationImageProvider>();
        imageProvider.GetImageUrlAsync(Arg.Any<DestinationImageContext>(), Arg.Any<CancellationToken>())
            .Returns(_ => Task.FromException<string?>(new InvalidOperationException("image failed")));
        var openingHoursProvider = Substitute.For<IOpeningHoursProvider>();
        openingHoursProvider.GetOpeningHoursAsync(Arg.Any<OpeningHoursContext>(), Arg.Any<CancellationToken>())
            .Returns("Mo-Fr 09:00-17:00");
        var service = CreateService(imageProvider, openingHoursProvider: openingHoursProvider);

        var result = await service.GetDetailsAsync("W123");

        Assert.NotNull(result);
        Assert.Empty(result.ImageUrls);
        Assert.Equal("Mo-Fr 09:00-17:00", result.OpeningHours);
    }

    [Fact]
    public async Task GetDetailsAsync_OpeningHoursProviderFaults_ImageStillPopulatesAndReturns200()
    {
        var imageProvider = Substitute.For<IDestinationImageProvider>();
        imageProvider.GetImageUrlAsync(Arg.Any<DestinationImageContext>(), Arg.Any<CancellationToken>())
            .Returns("https://upload.wikimedia.org/eiffel.jpg");
        var openingHoursProvider = Substitute.For<IOpeningHoursProvider>();
        openingHoursProvider.GetOpeningHoursAsync(Arg.Any<OpeningHoursContext>(), Arg.Any<CancellationToken>())
            .Returns(_ => Task.FromException<string?>(new InvalidOperationException("hours failed")));
        var service = CreateService(imageProvider, openingHoursProvider: openingHoursProvider);

        var result = await service.GetDetailsAsync("W123");

        Assert.NotNull(result);
        Assert.Equal(["https://upload.wikimedia.org/eiffel.jpg"], result.ImageUrls);
        Assert.Null(result.OpeningHours);
    }
}
