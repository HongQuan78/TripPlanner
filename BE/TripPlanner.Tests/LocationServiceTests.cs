using NSubstitute;
using NSubstitute.ExceptionExtensions;
using Xunit;
using TripPlanner.Application.Common;
using TripPlanner.Application.DTOs.Responses;
using TripPlanner.Application.Interfaces.Services;
using TripPlanner.Application.Parameters;
using TripPlanner.Application.UseCases.Location;

namespace TripPlanner.Tests;

public class LocationServiceTests
{
    private readonly IGeocodingService _geocodingService = Substitute.For<IGeocodingService>();
    private readonly IAttractionSearchService _attractionSearchService = Substitute.For<IAttractionSearchService>();

    private SearchLocationsUseCase SearchUseCase() => new(_geocodingService);
    private GetAttractionsForLocationUseCase AttractionsUseCase() => new(_attractionSearchService);

    [Fact]
    public async Task SearchLocations_CityMatch_ReturnsSuccessWithCityType()
    {
        var parameter = new LocationSearchParameter { Query = "London" };
        var locations = new List<LocationSearchResultResponse>
        {
            new() { Name = "London", CountryCode = "GB", Latitude = 51.5, Longitude = -0.12 }
        };
        _geocodingService.SearchAsync("London", null, Arg.Any<CancellationToken>()).Returns(locations);

        var result = await SearchUseCase().ExecuteAsync(parameter);

        Assert.True(result.IsSuccess);
        var location = Assert.Single(result.Data!);
        Assert.Equal("London", location.Name);
        Assert.Equal("City", location.LocationType);
    }

    [Fact]
    public async Task SearchLocations_CountryNameQuery_PassesCountryCodeHint()
    {
        var parameter = new LocationSearchParameter { Query = "France" };
        _geocodingService.SearchAsync("France", "FR", Arg.Any<CancellationToken>()).Returns([]);

        var result = await SearchUseCase().ExecuteAsync(parameter);

        Assert.True(result.IsSuccess);
        await _geocodingService.Received(1).SearchAsync("France", "FR", Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task SearchLocations_PlaceNamedAfterCountryInOtherCountry_ClassifiedAsCity()
    {
        var parameter = new LocationSearchParameter { Query = "France" };
        var locations = new List<LocationSearchResultResponse>
        {
            new() { Name = "France", CountryCode = "MZ", Latitude = -21.68, Longitude = 34.7 }
        };
        _geocodingService.SearchAsync("France", "FR", Arg.Any<CancellationToken>()).Returns(locations);

        var result = await SearchUseCase().ExecuteAsync(parameter);

        Assert.True(result.IsSuccess);
        Assert.Equal("City", result.Data!.Single().LocationType);
    }

    [Fact]
    public async Task SearchLocations_LowercaseCityName_IsTitleCased()
    {
        var parameter = new LocationSearchParameter { Query = "ho chi minh" };
        var locations = new List<LocationSearchResultResponse>
        {
            new() { Name = "ho chi minh", CountryCode = "VN", Latitude = 10.82, Longitude = 106.63 }
        };
        _geocodingService.SearchAsync("ho chi minh", null, Arg.Any<CancellationToken>()).Returns(locations);

        var result = await SearchUseCase().ExecuteAsync(parameter);

        Assert.True(result.IsSuccess);
        Assert.Equal("Ho Chi Minh", result.Data!.Single().Name);
    }

    [Fact]
    public async Task SearchLocations_LowercaseCountryName_UsesCanonicalName()
    {
        var parameter = new LocationSearchParameter { Query = "japan" };
        var locations = new List<LocationSearchResultResponse>
        {
            new() { Name = "japan", CountryCode = "JP", Latitude = 35.69, Longitude = 139.75 }
        };
        _geocodingService.SearchAsync("japan", "JP", Arg.Any<CancellationToken>()).Returns(locations);

        var result = await SearchUseCase().ExecuteAsync(parameter);

        Assert.True(result.IsSuccess);
        var location = result.Data!.Single();
        Assert.Equal("Japan", location.Name);
        Assert.Equal("Country", location.LocationType);
    }

    [Fact]
    public async Task SearchLocations_CountryMatch_ReturnsCountryType()
    {
        var parameter = new LocationSearchParameter { Query = "France" };
        var locations = new List<LocationSearchResultResponse>
        {
            new() { Name = "France", CountryCode = "FR", Latitude = 46.2, Longitude = 2.2 }
        };
        _geocodingService.SearchAsync("France", "FR", Arg.Any<CancellationToken>()).Returns(locations);

        var result = await SearchUseCase().ExecuteAsync(parameter);

        Assert.True(result.IsSuccess);
        Assert.Equal("Country", result.Data!.Single().LocationType);
    }

    [Fact]
    public async Task SearchLocations_DuplicateAndExcessResults_DeduplicatesAndCapsAtFive()
    {
        var parameter = new LocationSearchParameter { Query = "Spring" };
        var locations = new List<LocationSearchResultResponse>();
        for (var i = 0; i < 4; i++)
        {
            locations.Add(new LocationSearchResultResponse { Name = "Springfield", CountryCode = "US" });
        }
        for (var i = 0; i < 6; i++)
        {
            locations.Add(new LocationSearchResultResponse { Name = $"Spring Town {i}", CountryCode = "US" });
        }
        _geocodingService.SearchAsync("Spring", null, Arg.Any<CancellationToken>()).Returns(locations);

        var result = await SearchUseCase().ExecuteAsync(parameter);

        Assert.True(result.IsSuccess);
        Assert.Equal(5, result.Data!.Count);
        Assert.Single(result.Data, location => location.Name == "Springfield");
    }

    [Fact]
    public async Task SearchLocations_MultiResultProviderPayload_ReturnsAllDistinctClassifiedResults()
    {
        var parameter = new LocationSearchParameter { Query = "Ho" };
        var locations = new List<LocationSearchResultResponse>
        {
            new() { Name = "Ho Chi Minh City", CountryCode = "VN", Latitude = 10.77, Longitude = 106.72 },
            new() { Name = "Hong Kong", CountryCode = "CN", Latitude = 22.28, Longitude = 114.16 },
            new() { Name = "Honolulu", CountryCode = "US", Latitude = 21.3, Longitude = -157.86 }
        };
        _geocodingService.SearchAsync("Ho", null, Arg.Any<CancellationToken>()).Returns(locations);

        var result = await SearchUseCase().ExecuteAsync(parameter);

        Assert.True(result.IsSuccess);
        Assert.Equal(3, result.Data!.Count);
        Assert.Contains(result.Data, location => location.Name == "Ho Chi Minh City" && location.LocationType == "City");
        Assert.Contains(result.Data, location => location.Name == "Hong Kong" && location.LocationType == "City");
        Assert.Contains(result.Data, location => location.Name == "Honolulu" && location.LocationType == "City");
    }

    [Fact]
    public async Task SearchLocations_MultiResultProviderPayloadWithDuplicatesAndExcess_DeduplicatesAndCapsAtFive()
    {
        var parameter = new LocationSearchParameter { Query = "Ho" };
        var locations = new List<LocationSearchResultResponse>
        {
            new() { Name = "Ho Chi Minh City", CountryCode = "VN", Latitude = 10.77, Longitude = 106.72 },
            new() { Name = "ho chi minh city", CountryCode = "VN", Latitude = 10.77, Longitude = 106.72 },
            new() { Name = "Hong Kong", CountryCode = "CN", Latitude = 22.28, Longitude = 114.16 },
            new() { Name = "Honolulu", CountryCode = "US", Latitude = 21.3, Longitude = -157.86 },
            new() { Name = "Houston", CountryCode = "US", Latitude = 29.76, Longitude = -95.37 },
            new() { Name = "Hobart", CountryCode = "AU", Latitude = -42.88, Longitude = 147.33 },
            new() { Name = "Homel", CountryCode = "BY", Latitude = 52.44, Longitude = 30.98 }
        };
        _geocodingService.SearchAsync("Ho", null, Arg.Any<CancellationToken>()).Returns(locations);

        var result = await SearchUseCase().ExecuteAsync(parameter);

        Assert.True(result.IsSuccess);
        Assert.Equal(5, result.Data!.Count);
        Assert.Single(result.Data, location => location.Name == "Ho Chi Minh City");
    }

    [Fact]
    public async Task SearchLocations_TrimsQueryBeforeSearching()
    {
        var parameter = new LocationSearchParameter { Query = "  Paris  " };
        _geocodingService.SearchAsync("Paris", null, Arg.Any<CancellationToken>()).Returns([]);

        var result = await SearchUseCase().ExecuteAsync(parameter);

        Assert.True(result.IsSuccess);
        await _geocodingService.Received(1).SearchAsync("Paris", null, Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task SearchLocations_NoMatches_ReturnsSuccessWithEmptyList()
    {
        var parameter = new LocationSearchParameter { Query = "Xyzzy" };
        _geocodingService.SearchAsync("Xyzzy", null, Arg.Any<CancellationToken>()).Returns([]);

        var result = await SearchUseCase().ExecuteAsync(parameter);

        Assert.True(result.IsSuccess);
        Assert.Empty(result.Data!);
    }

    [Fact]
    public async Task SearchLocations_ProviderUnavailable_ReturnsServiceUnavailableFailure()
    {
        var parameter = new LocationSearchParameter { Query = "London" };
        _geocodingService.SearchAsync("London", null, Arg.Any<CancellationToken>())
            .ThrowsAsync(new HttpRequestException("boom"));

        var result = await SearchUseCase().ExecuteAsync(parameter);

        Assert.False(result.IsSuccess);
        Assert.Equal(ErrorType.ServiceUnavailable, result.Error!.ErrorType);
        Assert.Equal("Location search is currently unavailable.", result.Error.Description);
    }

    [Fact]
    public async Task SearchLocations_ProviderTimeout_ReturnsServiceUnavailableFailure()
    {
        var parameter = new LocationSearchParameter { Query = "London" };
        _geocodingService.SearchAsync("London", null, Arg.Any<CancellationToken>())
            .ThrowsAsync(new TaskCanceledException());

        var result = await SearchUseCase().ExecuteAsync(parameter);

        Assert.False(result.IsSuccess);
        Assert.Equal(ErrorType.ServiceUnavailable, result.Error!.ErrorType);
    }

    [Fact]
    public async Task GetAttractions_NoRadiusProvided_AppliesDefaultTwentyKilometers()
    {
        var parameter = new AttractionSearchParameter { Latitude = 48.85, Longitude = 2.35 };
        _attractionSearchService.GetNearbyAsync(48.85, 2.35, 20000, 20, Arg.Any<CancellationToken>()).Returns([]);

        var result = await AttractionsUseCase().ExecuteAsync(parameter);

        Assert.True(result.IsSuccess);
        await _attractionSearchService.Received(1).GetNearbyAsync(48.85, 2.35, 20000, 20, Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task GetAttractions_LimitAboveMaximum_CapsAtTwenty()
    {
        var parameter = new AttractionSearchParameter { Latitude = 48.85, Longitude = 2.35, Limit = 50 };
        _attractionSearchService.GetNearbyAsync(48.85, 2.35, 20000, 20, Arg.Any<CancellationToken>()).Returns([]);

        var result = await AttractionsUseCase().ExecuteAsync(parameter);

        Assert.True(result.IsSuccess);
        await _attractionSearchService.Received(1).GetNearbyAsync(48.85, 2.35, 20000, 20, Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task GetAttractions_CustomRadiusAndLimit_ArePassedThrough()
    {
        var parameter = new AttractionSearchParameter { Latitude = 48.85, Longitude = 2.35, Radius = 5000, Limit = 10 };
        _attractionSearchService.GetNearbyAsync(48.85, 2.35, 5000, 10, Arg.Any<CancellationToken>()).Returns([]);

        var result = await AttractionsUseCase().ExecuteAsync(parameter);

        Assert.True(result.IsSuccess);
        await _attractionSearchService.Received(1).GetNearbyAsync(48.85, 2.35, 5000, 10, Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task GetAttractions_ReturnsAttractionsFromService()
    {
        var parameter = new AttractionSearchParameter { Latitude = 48.85, Longitude = 2.35 };
        var attractions = new List<AttractionResponse>
        {
            new() { Xid = "W1", Name = "Eiffel Tower", Kinds = ["architecture"], Rating = "3h" }
        };
        _attractionSearchService.GetNearbyAsync(48.85, 2.35, 20000, 20, Arg.Any<CancellationToken>()).Returns(attractions);

        var result = await AttractionsUseCase().ExecuteAsync(parameter);

        Assert.True(result.IsSuccess);
        Assert.Equal(attractions, result.Data);
    }

    [Fact]
    public async Task GetAttractions_NoResults_ReturnsSuccessWithEmptyList()
    {
        var parameter = new AttractionSearchParameter { Latitude = 0, Longitude = 0 };
        _attractionSearchService.GetNearbyAsync(0, 0, 20000, 20, Arg.Any<CancellationToken>()).Returns([]);

        var result = await AttractionsUseCase().ExecuteAsync(parameter);

        Assert.True(result.IsSuccess);
        Assert.Empty(result.Data!);
    }

    [Fact]
    public async Task GetAttractions_ProviderUnavailable_ReturnsServiceUnavailableFailure()
    {
        var parameter = new AttractionSearchParameter { Latitude = 48.85, Longitude = 2.35 };
        _attractionSearchService.GetNearbyAsync(48.85, 2.35, 20000, 20, Arg.Any<CancellationToken>())
            .ThrowsAsync(new HttpRequestException("boom"));

        var result = await AttractionsUseCase().ExecuteAsync(parameter);

        Assert.False(result.IsSuccess);
        Assert.Equal(ErrorType.ServiceUnavailable, result.Error!.ErrorType);
        Assert.Equal("Attraction suggestions are currently unavailable.", result.Error.Description);
    }
}
