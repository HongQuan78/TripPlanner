using System.Globalization;
using TripPlanner.Application.Common;
using TripPlanner.Application.DTOs.Responses;
using TripPlanner.Application.Helpers;
using TripPlanner.Application.Interfaces.Services;
using TripPlanner.Application.Parameters;

namespace TripPlanner.Application.UseCases.Location;

public class SearchLocationsUseCase(IGeocodingService geocodingService) : ISearchLocationsUseCase
{
    private const int MaxResults = 5;

    public async Task<Result<List<LocationSearchResultResponse>>> ExecuteAsync(LocationSearchParameter parameter, CancellationToken cancellationToken = default)
    {
        try
        {
            var query = parameter.Query!.Trim();
            var countryCodeHint = CountryNameHelper.GetCountryCode(query);
            var locations = await geocodingService.SearchAsync(query, countryCodeHint, cancellationToken);
            var results = locations
                .Where(location => !string.IsNullOrWhiteSpace(location.Name))
                .DistinctBy(location => (location.Name.ToLowerInvariant(), location.CountryCode))
                .Take(MaxResults)
                .Select(Classify)
                .ToList();
            return Result<List<LocationSearchResultResponse>>.Success(results);
        }
        catch (Exception exception) when (exception is HttpRequestException or TaskCanceledException)
        {
            return Result<List<LocationSearchResultResponse>>.Failure(ErrorType.ServiceUnavailable, "Location search is currently unavailable.");
        }
    }

    private static LocationSearchResultResponse Classify(LocationSearchResultResponse location)
    {
        var isCountry = string.Equals(CountryNameHelper.GetCountryCode(location.Name), location.CountryCode, StringComparison.OrdinalIgnoreCase);
        return location with
        {
            Name = isCountry
                ? CountryNameHelper.GetCanonicalName(location.Name)!
                : CultureInfo.InvariantCulture.TextInfo.ToTitleCase(location.Name.ToLowerInvariant()),
            LocationType = isCountry ? "Country" : "City"
        };
    }
}
