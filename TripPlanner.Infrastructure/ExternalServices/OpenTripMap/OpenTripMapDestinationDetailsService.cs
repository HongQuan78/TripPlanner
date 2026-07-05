using System.Net;
using System.Net.Http.Json;
using Microsoft.Extensions.Options;
using TripPlanner.Application.DTOs.Responses;
using TripPlanner.Application.Interfaces.Services;
using TripPlanner.Infrastructure.Settings;

namespace TripPlanner.Infrastructure.ExternalServices.OpenTripMap;

public class OpenTripMapDestinationDetailsService(HttpClient httpClient, IOptions<OpenTripMapSettings> options) : IDestinationDetailsService
{
    public async Task<DestinationDetailsResponse?> GetDetailsAsync(string xid, CancellationToken cancellationToken = default)
    {
        var url = $"xid/{Uri.EscapeDataString(xid)}?apikey={options.Value.ApiKey}";
        using var response = await httpClient.GetAsync(url, cancellationToken);
        if (response.StatusCode == HttpStatusCode.NotFound)
        {
            return null;
        }

        response.EnsureSuccessStatusCode();
        var place = await response.Content.ReadFromJsonAsync<OpenTripMapPlaceModel>(cancellationToken);
        if (place is null || string.IsNullOrWhiteSpace(place.Xid) || string.IsNullOrWhiteSpace(place.Name))
        {
            return null;
        }

        return new DestinationDetailsResponse
        {
            Xid = place.Xid,
            Name = place.Name,
            Category = PrimaryKind(place.Kinds),
            Description = NormalizeOptional(place.WikipediaExtracts?.Text),
            ImageUrls = ComposeImageUrls(place),
            Address = ComposeAddress(place.Address),
            Website = NormalizeOptional(place.Url),
            Latitude = place.Point?.Lat,
            Longitude = place.Point?.Lon
        };
    }

    private static string? PrimaryKind(string? kinds)
    {
        if (string.IsNullOrWhiteSpace(kinds))
        {
            return null;
        }

        return kinds.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries).FirstOrDefault();
    }

    private static List<string> ComposeImageUrls(OpenTripMapPlaceModel place)
    {
        var urls = new List<string>();
        foreach (var candidate in new[] { place.Preview?.Source, place.Image })
        {
            if (!string.IsNullOrWhiteSpace(candidate) && !urls.Contains(candidate))
            {
                urls.Add(candidate);
            }
        }

        return urls;
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
