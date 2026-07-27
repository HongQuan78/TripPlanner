using System.Net;
using Microsoft.Extensions.Options;
using Xunit;
using TripPlanner.Application.Interfaces.Services;
using TripPlanner.Infrastructure.Caching;
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

    private sealed class RecordingResponseCache : IResponseCache
    {
        private readonly Dictionary<string, object?> _entries = [];

        public List<(string Key, TimeSpan Ttl)> Writes { get; } = [];

        public Task<T?> GetAsync<T>(string key, CancellationToken cancellationToken = default)
        {
            if (_entries.TryGetValue(key, out var value))
            {
                return Task.FromResult((T?)value);
            }

            return Task.FromResult<T?>(default);
        }

        public Task SetAsync<T>(string key, T value, TimeSpan ttl, CancellationToken cancellationToken = default)
        {
            _entries[key] = value;
            Writes.Add((key, ttl));
            return Task.CompletedTask;
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

    private static (OverpassOpeningHoursProvider Provider, RecordingResponseCache Cache) CreateProviderWithRecordingCache(FakeHttpMessageHandler handler)
    {
        var httpClient = new HttpClient(handler)
        {
            BaseAddress = new Uri("https://overpass-api.de/api/")
        };
        var cache = new RecordingResponseCache();
        var provider = new OverpassOpeningHoursProvider(httpClient, Options.Create(new OverpassSettings()), cache);
        return (provider, cache);
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

    [Fact]
    public async Task GetOpeningHoursAsync_Timeout_ReturnsNull()
    {
        var handler = new FakeHttpMessageHandler(new TaskCanceledException("timed out"));
        var (provider, _) = CreateProvider(handler);

        var result = await provider.GetOpeningHoursAsync(new OpeningHoursContext { Xid = "N1" });

        Assert.Null(result);
    }

    [Fact]
    public async Task GetOpeningHoursAsync_NonJsonContentType_ReturnsNull()
    {
        var handler = new FakeHttpMessageHandler(_ => new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent("<html>runtime error</html>", System.Text.Encoding.UTF8, "text/html")
        });
        var (provider, _) = CreateProvider(handler);

        var result = await provider.GetOpeningHoursAsync(new OpeningHoursContext { Xid = "N1" });

        Assert.Null(result);
    }

    [Fact]
    public async Task GetOpeningHoursAsync_SecondCall_ServedFromCacheWithoutHttpCall()
    {
        var handler = JsonHandler("""{"elements":[{"tags":{"opening_hours":"Mo-Fr 09:00-17:00"}}]}""");
        var (provider, _) = CreateProvider(handler);

        var first = await provider.GetOpeningHoursAsync(new OpeningHoursContext { Xid = "N1" });
        var second = await provider.GetOpeningHoursAsync(new OpeningHoursContext { Xid = "N1" });

        Assert.Equal("Mo-Fr 09:00-17:00", first);
        Assert.Equal("Mo-Fr 09:00-17:00", second);
        Assert.Equal(1, handler.CallCount);
    }

    [Fact]
    public async Task GetOpeningHoursAsync_AbsentTag_SecondCallServedFromCacheWithoutHttpCall()
    {
        var handler = JsonHandler("""{"elements":[{"tags":{"name":"Somewhere"}}]}""");
        var (provider, _) = CreateProvider(handler);

        await provider.GetOpeningHoursAsync(new OpeningHoursContext { Xid = "N1" });
        var second = await provider.GetOpeningHoursAsync(new OpeningHoursContext { Xid = "N1" });

        Assert.Null(second);
        Assert.Equal(1, handler.CallCount);
    }

    [Fact]
    public async Task GetOpeningHoursAsync_FoundHours_CachedWithFullTtl()
    {
        var handler = JsonHandler("""{"elements":[{"tags":{"opening_hours":"24/7"}}]}""");
        var (provider, cache) = CreateProviderWithRecordingCache(handler);

        await provider.GetOpeningHoursAsync(new OpeningHoursContext { Xid = "N1" });

        var write = Assert.Single(cache.Writes);
        Assert.Equal(TimeSpan.FromMinutes(1440), write.Ttl);
    }

    [Fact]
    public async Task GetOpeningHoursAsync_AbsentTag_CachedWithFullTtl()
    {
        var handler = JsonHandler("""{"elements":[{"tags":{"name":"Somewhere"}}]}""");
        var (provider, cache) = CreateProviderWithRecordingCache(handler);

        await provider.GetOpeningHoursAsync(new OpeningHoursContext { Xid = "N1" });

        var write = Assert.Single(cache.Writes);
        Assert.Equal(TimeSpan.FromMinutes(1440), write.Ttl);
    }

    [Fact]
    public async Task GetOpeningHoursAsync_EmptyElements_CachedWithFullTtl()
    {
        var handler = JsonHandler("""{"elements":[]}""");
        var (provider, cache) = CreateProviderWithRecordingCache(handler);

        await provider.GetOpeningHoursAsync(new OpeningHoursContext { Xid = "N1" });

        var write = Assert.Single(cache.Writes);
        Assert.Equal(TimeSpan.FromMinutes(1440), write.Ttl);
    }

    [Fact]
    public async Task GetOpeningHoursAsync_NonSuccessStatus_CachedWithShortTtlOnly()
    {
        var handler = new FakeHttpMessageHandler(_ => new HttpResponseMessage(HttpStatusCode.TooManyRequests));
        var (provider, cache) = CreateProviderWithRecordingCache(handler);

        await provider.GetOpeningHoursAsync(new OpeningHoursContext { Xid = "N1" });

        var write = Assert.Single(cache.Writes);
        Assert.Equal(TimeSpan.FromMinutes(5), write.Ttl);
    }

    [Fact]
    public async Task GetOpeningHoursAsync_TransportFailure_CachedWithShortTtlOnly()
    {
        var handler = new FakeHttpMessageHandler(new HttpRequestException("boom"));
        var (provider, cache) = CreateProviderWithRecordingCache(handler);

        await provider.GetOpeningHoursAsync(new OpeningHoursContext { Xid = "N1" });

        var write = Assert.Single(cache.Writes);
        Assert.Equal(TimeSpan.FromMinutes(5), write.Ttl);
    }

    [Fact]
    public async Task GetOpeningHoursAsync_Timeout_CachedWithShortTtlOnly()
    {
        var handler = new FakeHttpMessageHandler(new TaskCanceledException("timed out"));
        var (provider, cache) = CreateProviderWithRecordingCache(handler);

        await provider.GetOpeningHoursAsync(new OpeningHoursContext { Xid = "N1" });

        var write = Assert.Single(cache.Writes);
        Assert.Equal(TimeSpan.FromMinutes(5), write.Ttl);
    }

    [Fact]
    public async Task GetOpeningHoursAsync_MalformedJson_CachedWithShortTtlOnly()
    {
        var handler = JsonHandler("not json");
        var (provider, cache) = CreateProviderWithRecordingCache(handler);

        await provider.GetOpeningHoursAsync(new OpeningHoursContext { Xid = "N1" });

        var write = Assert.Single(cache.Writes);
        Assert.Equal(TimeSpan.FromMinutes(5), write.Ttl);
    }

    [Fact]
    public async Task GetOpeningHoursAsync_CancelledToken_DoesNotWriteToCache()
    {
        var handler = new FakeHttpMessageHandler(new TaskCanceledException("cancelled"));
        var (provider, cache) = CreateProviderWithRecordingCache(handler);
        using var cts = new CancellationTokenSource();
        await cts.CancelAsync();

        var result = await provider.GetOpeningHoursAsync(new OpeningHoursContext { Xid = "N1" }, cts.Token);

        Assert.Null(result);
        Assert.Empty(cache.Writes);
    }

    [Fact]
    public async Task GetOpeningHoursAsync_CaseVariantXid_SharesOneCacheEntry()
    {
        var handler = JsonHandler("""{"elements":[{"tags":{"opening_hours":"24/7"}}]}""");
        var (provider, _) = CreateProvider(handler);

        var upper = await provider.GetOpeningHoursAsync(new OpeningHoursContext { Xid = "N1" });
        var lower = await provider.GetOpeningHoursAsync(new OpeningHoursContext { Xid = "n1" });

        Assert.Equal("24/7", upper);
        Assert.Equal("24/7", lower);
        Assert.Equal(1, handler.CallCount);
    }
}
