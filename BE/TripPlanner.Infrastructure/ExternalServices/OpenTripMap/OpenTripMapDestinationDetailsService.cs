using TripPlanner.Application.DTOs.Responses;
using TripPlanner.Application.Interfaces.Services;

namespace TripPlanner.Infrastructure.ExternalServices.OpenTripMap;

internal class OpenTripMapDestinationDetailsService(
    IOpenTripMapPlaceClient placeClient,
    IDestinationImageProvider imageProvider,
    IOpeningHoursProvider openingHoursProvider) : IDestinationDetailsService
{
    public async Task<DestinationDetailsResponse?> GetDetailsAsync(string xid, CancellationToken cancellationToken = default)
    {
        var place = await placeClient.GetPlaceAsync(xid, cancellationToken);
        if (place is null || string.IsNullOrWhiteSpace(place.Xid) || string.IsNullOrWhiteSpace(place.Name))
        {
            return null;
        }

        var imageTask = imageProvider.GetImageUrlAsync(
            new DestinationImageContext { Name = place.Name, WikipediaUrl = place.Wikipedia, WikidataId = place.Wikidata },
            cancellationToken);
        var openingHoursTask = openingHoursProvider.GetOpeningHoursAsync(
            new OpeningHoursContext { Xid = place.Xid },
            cancellationToken);

        var imageUrl = await AwaitOrNullAsync(imageTask);
        List<string> imageUrls = string.IsNullOrWhiteSpace(imageUrl) ? [] : [imageUrl];

        var openingHours = await AwaitOrNullAsync(openingHoursTask);

        return new DestinationDetailsResponse
        {
            Xid = place.Xid,
            Name = place.Name,
            Category = PrimaryKind(place.Kinds),
            Rating = ParseRating(place.Rate),
            Description = NormalizeOptional(place.WikipediaExtracts?.Text),
            ImageUrls = imageUrls,
            Address = ComposeAddress(place.Address),
            OpeningHours = NormalizeOptional(openingHours),
            Website = NormalizeOptional(place.Url),
            Latitude = place.Point?.Lat,
            Longitude = place.Point?.Lon
        };
    }

    private static async Task<string?> AwaitOrNullAsync(Task<string?> task)
    {
        try
        {
            return await task;
        }
        catch
        {
            return null;
        }
    }

    private static double? ParseRating(string? rate)
    {
        if (string.IsNullOrWhiteSpace(rate))
        {
            return null;
        }

        var digits = new string([.. rate.TakeWhile(char.IsDigit)]);
        return double.TryParse(digits, out var parsed) ? parsed : null;
    }

    private static string? PrimaryKind(string? kinds)
    {
        if (string.IsNullOrWhiteSpace(kinds))
        {
            return null;
        }

        return kinds.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries).FirstOrDefault();
    }

    private static string? ComposeAddress(OpenTripMapAddressModel? address)
    {
        if (address is null)
        {
            return null;
        }

        var street = string.Join(' ', new[] { address.HouseNumber, address.Road }
            .Where(part => !string.IsNullOrWhiteSpace(part)));
        var locality = address.City ?? address.Town ?? address.Village;

        var parts = new[] { street, address.Suburb, locality, address.State, address.Postcode, address.Country }
            .Where(part => !string.IsNullOrWhiteSpace(part))
            .ToList();

        if (parts.Count == 0)
        {
            return null;
        }

        return string.Join(", ", parts);
    }

    private static string? NormalizeOptional(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        return value;
    }
}
