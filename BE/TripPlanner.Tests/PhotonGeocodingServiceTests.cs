using System.Net;
using Microsoft.Extensions.Options;
using Xunit;
using TripPlanner.Infrastructure.ExternalServices.Photon;
using TripPlanner.Infrastructure.Settings;

namespace TripPlanner.Tests;

public class PhotonGeocodingServiceTests
{
    private sealed class FakeHttpMessageHandler(Func<HttpRequestMessage, HttpResponseMessage> respond) : HttpMessageHandler
    {
        public HttpRequestMessage? LastRequest { get; private set; }
        public int RequestCount { get; private set; }

        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            LastRequest = request;
            RequestCount++;
            return Task.FromResult(respond(request));
        }
    }

    private static PhotonGeocodingService CreateService(FakeHttpMessageHandler handler)
    {
        var httpClient = new HttpClient(handler)
        {
            BaseAddress = new Uri("https://photon.komoot.io/api/")
        };
        return new PhotonGeocodingService(httpClient, TestCache.Create(), Options.Create(new PhotonSettings()));
    }

    private const string MultiResultPayload = """
        {
          "type": "FeatureCollection",
          "features": [
            {
              "type": "Feature",
              "properties": { "name": "Ho Chi Minh City", "country": "Vietnam", "countrycode": "VN", "type": "city" },
              "geometry": { "type": "Point", "coordinates": [106.7166008, 10.7737261] }
            },
            {
              "type": "Feature",
              "properties": { "name": "Hong Kong", "country": "China", "countrycode": "CN", "type": "city" },
              "geometry": { "type": "Point", "coordinates": [114.1582831, 22.2818333] }
            },
            {
              "type": "Feature",
              "properties": { "name": "Honolulu", "country": "United States", "countrycode": "US", "type": "city" },
              "geometry": { "type": "Point", "coordinates": [-157.855676, 21.304547] }
            }
          ]
        }
        """;

    [Fact]
    public async Task SearchAsync_MultiResultPayload_ReturnsDistinctClassifiedResults()
    {
        var handler = new FakeHttpMessageHandler(_ => new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent(MultiResultPayload)
        });
        var service = CreateService(handler);

        var result = await service.SearchAsync("Ho");

        Assert.Equal(3, result.Count);
        Assert.Contains(result, location => location.Name == "Ho Chi Minh City" && location.CountryCode == "VN");
        Assert.Contains(result, location => location.Name == "Hong Kong" && location.CountryCode == "CN");
        Assert.Contains(result, location => location.Name == "Honolulu" && location.CountryCode == "US");
        Assert.Contains("q=Ho", handler.LastRequest!.RequestUri!.Query);
        Assert.Contains("layer=city", handler.LastRequest.RequestUri.Query);
        Assert.Contains("layer=country", handler.LastRequest.RequestUri.Query);
    }

    [Fact]
    public async Task SearchAsync_CalledTwiceForSameQuery_FetchesOnceAndServesFromCache()
    {
        var handler = new FakeHttpMessageHandler(_ => new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent(MultiResultPayload)
        });
        var service = CreateService(handler);

        var first = await service.SearchAsync("Ho");
        var second = await service.SearchAsync("  ho  ");

        Assert.Equal(3, first.Count);
        Assert.Equal(3, second.Count);
        Assert.Equal(1, handler.RequestCount);
    }

    [Fact]
    public async Task SearchAsync_DifferentQuery_IssuesSeparateRequest()
    {
        var handler = new FakeHttpMessageHandler(_ => new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent(MultiResultPayload)
        });
        var service = CreateService(handler);

        await service.SearchAsync("Ho");
        await service.SearchAsync("Paris");

        Assert.Equal(2, handler.RequestCount);
    }

    [Fact]
    public async Task SearchAsync_ResultCoordinates_MapsLatitudeAndLongitudeFromGeoJsonOrder()
    {
        var handler = new FakeHttpMessageHandler(_ => new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent(MultiResultPayload)
        });
        var service = CreateService(handler);

        var result = await service.SearchAsync("Ho");

        var hoChiMinh = result.Single(location => location.Name == "Ho Chi Minh City");
        Assert.Equal(10.7737261, hoChiMinh.Latitude);
        Assert.Equal(106.7166008, hoChiMinh.Longitude);
    }

    [Fact]
    public async Task SearchAsync_EmptyFeaturesResponse_ReturnsEmptyList()
    {
        var handler = new FakeHttpMessageHandler(_ => new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent("""{"type":"FeatureCollection","features":[]}""")
        });
        var service = CreateService(handler);

        var result = await service.SearchAsync("Zzzzqqqq");

        Assert.Empty(result);
    }

    [Fact]
    public async Task SearchAsync_NonSuccessStatusCode_ThrowsHttpRequestException()
    {
        var handler = new FakeHttpMessageHandler(_ => new HttpResponseMessage(HttpStatusCode.InternalServerError));
        var service = CreateService(handler);

        await Assert.ThrowsAsync<HttpRequestException>(() => service.SearchAsync("Ho"));
    }

    [Fact]
    public async Task SearchAsync_MalformedJsonResponse_ThrowsHttpRequestException()
    {
        var handler = new FakeHttpMessageHandler(_ => new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent("not-json")
        });
        var service = CreateService(handler);

        await Assert.ThrowsAsync<HttpRequestException>(() => service.SearchAsync("Ho"));
    }

    [Fact]
    public async Task SearchAsync_Timeout_ThrowsTaskCanceledException()
    {
        var handler = new FakeHttpMessageHandler(_ => throw new TaskCanceledException());
        var service = CreateService(handler);

        await Assert.ThrowsAsync<TaskCanceledException>(() => service.SearchAsync("Ho"));
    }

    [Fact]
    public async Task SearchAsync_FeatureMissingCountryCode_IsSkipped()
    {
        var handler = new FakeHttpMessageHandler(_ => new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent("""
                {
                  "type": "FeatureCollection",
                  "features": [
                    { "type": "Feature", "properties": { "name": "Somewhere" }, "geometry": { "type": "Point", "coordinates": [1.0, 2.0] } }
                  ]
                }
                """)
        });
        var service = CreateService(handler);

        var result = await service.SearchAsync("Somewhere");

        Assert.Empty(result);
    }
}
