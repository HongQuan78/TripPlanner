using System.Net;
using Microsoft.Extensions.Options;
using Xunit;
using TripPlanner.Application.Interfaces.Services;
using TripPlanner.Infrastructure.ExternalServices.Overpass;
using TripPlanner.Infrastructure.Settings;

namespace TripPlanner.Tests;

public class OverpassOpeningHoursProviderTests
{
    private sealed class FakeHttpMessageHandler : HttpMessageHandler
    {
        private readonly Func<HttpRequestMessage, HttpResponseMessage>? _respond;
        private readonly Exception? _throw;

        public FakeHttpMessageHandler(Func<HttpRequestMessage, HttpResponseMessage> respond)
        {
            _respond = respond;
        }

        public FakeHttpMessageHandler(Exception exception)
        {
            _throw = exception;
        }

        public int CallCount { get; private set; }

        public string? LastDecodedBody { get; private set; }

        protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            CallCount++;
            if (request.Content is not null)
            {
                var raw = await request.Content.ReadAsStringAsync(cancellationToken);
                var value = raw.StartsWith("data=") ? raw[5..] : raw;
                LastDecodedBody = Uri.UnescapeDataString(value.Replace("+", " "));
            }

            if (_throw is not null)
            {
                throw _throw;
            }

            return _respond!(request);
        }
    }

    private static (OverpassOpeningHoursProvider Provider, FakeHttpMessageHandler Handler) CreateProvider(FakeHttpMessageHandler handler)
    {
        var httpClient = new HttpClient(handler)
        {
            BaseAddress = new Uri("https://overpass-api.de/api/")
        };
        var provider = new OverpassOpeningHoursProvider(httpClient, Options.Create(new OverpassSettings()), TestCache.Create());
        return (provider, handler);
    }

    private static FakeHttpMessageHandler JsonHandler(string json)
    {
        return new FakeHttpMessageHandler(_ => new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent(json)
        });
    }

    [Fact]
    public async Task GetOpeningHoursAsync_NodeXidWithOpeningHours_ReturnsHoursAndQueriesNode()
    {
        var handler = JsonHandler("""{"elements":[{"tags":{"opening_hours":"Mo-Fr 09:00-17:00"}}]}""");
        var (provider, _) = CreateProvider(handler);

        var result = await provider.GetOpeningHoursAsync(new OpeningHoursContext { Xid = "N191031796" });

        Assert.Equal("Mo-Fr 09:00-17:00", result);
        Assert.Equal("[out:json];node(191031796);out tags;", handler.LastDecodedBody);
    }

    [Fact]
    public async Task GetOpeningHoursAsync_WayXid_QueriesWay()
    {
        var handler = JsonHandler("""{"elements":[{"tags":{"opening_hours":"24/7"}}]}""");
        var (provider, _) = CreateProvider(handler);

        var result = await provider.GetOpeningHoursAsync(new OpeningHoursContext { Xid = "W123" });

        Assert.Equal("24/7", result);
        Assert.Equal("[out:json];way(123);out tags;", handler.LastDecodedBody);
    }

    [Fact]
    public async Task GetOpeningHoursAsync_RelationXid_QueriesRel()
    {
        var handler = JsonHandler("""{"elements":[{"tags":{"opening_hours":"Mo-Su 08:00-20:00"}}]}""");
        var (provider, _) = CreateProvider(handler);

        var result = await provider.GetOpeningHoursAsync(new OpeningHoursContext { Xid = "R456" });

        Assert.Equal("Mo-Su 08:00-20:00", result);
        Assert.Equal("[out:json];rel(456);out tags;", handler.LastDecodedBody);
    }

    [Fact]
    public async Task GetOpeningHoursAsync_EmptyElements_ReturnsNull()
    {
        var handler = JsonHandler("""{"elements":[]}""");
        var (provider, _) = CreateProvider(handler);

        var result = await provider.GetOpeningHoursAsync(new OpeningHoursContext { Xid = "N1" });

        Assert.Null(result);
    }

    [Fact]
    public async Task GetOpeningHoursAsync_ElementWithoutOpeningHoursTag_ReturnsNull()
    {
        var handler = JsonHandler("""{"elements":[{"tags":{"name":"Somewhere"}}]}""");
        var (provider, _) = CreateProvider(handler);

        var result = await provider.GetOpeningHoursAsync(new OpeningHoursContext { Xid = "N1" });

        Assert.Null(result);
    }

    [Fact]
    public async Task GetOpeningHoursAsync_NonOsmXid_ReturnsNullWithoutHttpCall()
    {
        var handler = JsonHandler("""{"elements":[{"tags":{"opening_hours":"Mo-Fr 09:00-17:00"}}]}""");
        var (provider, capturedHandler) = CreateProvider(handler);

        var result = await provider.GetOpeningHoursAsync(new OpeningHoursContext { Xid = "Q42" });

        Assert.Null(result);
        Assert.Equal(0, capturedHandler.CallCount);
    }

    [Fact]
    public async Task GetOpeningHoursAsync_HttpRequestException_ReturnsNull()
    {
        var handler = new FakeHttpMessageHandler(new HttpRequestException("boom"));
        var (provider, _) = CreateProvider(handler);

        var result = await provider.GetOpeningHoursAsync(new OpeningHoursContext { Xid = "N1" });

        Assert.Null(result);
    }

    [Fact]
    public async Task GetOpeningHoursAsync_NonSuccessStatus_ReturnsNull()
    {
        var handler = new FakeHttpMessageHandler(_ => new HttpResponseMessage(HttpStatusCode.InternalServerError));
        var (provider, _) = CreateProvider(handler);

        var result = await provider.GetOpeningHoursAsync(new OpeningHoursContext { Xid = "N1" });

        Assert.Null(result);
    }

    [Fact]
    public async Task GetOpeningHoursAsync_MalformedJson_ReturnsNull()
    {
        var handler = JsonHandler("not json");
        var (provider, _) = CreateProvider(handler);

        var result = await provider.GetOpeningHoursAsync(new OpeningHoursContext { Xid = "N1" });

        Assert.Null(result);
    }
}
