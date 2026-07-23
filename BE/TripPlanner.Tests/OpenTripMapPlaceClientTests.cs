using System.Net;
using Microsoft.Extensions.Options;
using Xunit;
using TripPlanner.Infrastructure.ExternalServices.OpenTripMap;
using TripPlanner.Infrastructure.Settings;

namespace TripPlanner.Tests;

public class OpenTripMapPlaceClientTests
{
    private sealed class FakeHttpMessageHandler(Func<HttpRequestMessage, HttpResponseMessage> respond) : HttpMessageHandler
    {
        public int RequestCount { get; private set; }

        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            RequestCount++;
            return Task.FromResult(respond(request));
        }
    }

    private const string PlaceJson = """{"xid":"W123","name":"Eiffel Tower","kinds":"towers","rate":"7"}""";

    private static OpenTripMapPlaceClient CreateClient(FakeHttpMessageHandler handler)
    {
        var httpClient = new HttpClient(handler)
        {
            BaseAddress = new Uri("https://api.opentripmap.com/0.1/en/places/")
        };
        return new OpenTripMapPlaceClient(httpClient, Options.Create(new OpenTripMapSettings()), TestCache.Create());
    }

    [Fact]
    public async Task GetPlaceAsync_CalledTwiceForSameXid_FetchesOnceAndServesFromCache()
    {
        var handler = new FakeHttpMessageHandler(_ => new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent(PlaceJson)
        });
        var client = CreateClient(handler);

        var first = await client.GetPlaceAsync("W123");
        var second = await client.GetPlaceAsync("W123");

        Assert.NotNull(first);
        Assert.NotNull(second);
        Assert.Equal("Eiffel Tower", second.Name);
        Assert.Equal(1, handler.RequestCount);
    }

    [Fact]
    public async Task GetPlaceAsync_NotFound_ReturnsNullAndDoesNotCache()
    {
        var returnNotFound = true;
        var handler = new FakeHttpMessageHandler(_ => returnNotFound
            ? new HttpResponseMessage(HttpStatusCode.NotFound)
            : new HttpResponseMessage(HttpStatusCode.OK) { Content = new StringContent(PlaceJson) });
        var client = CreateClient(handler);

        var missing = await client.GetPlaceAsync("W123");
        returnNotFound = false;
        var found = await client.GetPlaceAsync("W123");

        Assert.Null(missing);
        Assert.NotNull(found);
        Assert.Equal(2, handler.RequestCount);
    }

    [Fact]
    public async Task GetPlaceAsync_RateLimited_RetriesThenSucceeds()
    {
        var attempts = 0;
        var handler = new FakeHttpMessageHandler(_ =>
        {
            attempts++;
            if (attempts == 1)
            {
                return new HttpResponseMessage(HttpStatusCode.TooManyRequests);
            }

            return new HttpResponseMessage(HttpStatusCode.OK) { Content = new StringContent(PlaceJson) };
        });
        var client = CreateClient(handler);

        var place = await client.GetPlaceAsync("W123");

        Assert.NotNull(place);
        Assert.Equal(2, attempts);
    }
}
