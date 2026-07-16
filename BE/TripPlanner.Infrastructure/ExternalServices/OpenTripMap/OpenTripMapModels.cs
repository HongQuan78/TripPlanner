using System.Text.Json.Serialization;

namespace TripPlanner.Infrastructure.ExternalServices.OpenTripMap;

internal sealed record OpenTripMapFeatureModel
{
    [JsonPropertyName("xid")]
    public string? Xid { get; init; }

    [JsonPropertyName("name")]
    public string? Name { get; init; }

    [JsonPropertyName("kinds")]
    public string? Kinds { get; init; }

    [JsonPropertyName("dist")]
    public double? Dist { get; init; }
}

internal sealed record OpenTripMapPlaceModel
{
    [JsonPropertyName("xid")]
    public string? Xid { get; init; }

    [JsonPropertyName("name")]
    public string? Name { get; init; }

    [JsonPropertyName("kinds")]
    public string? Kinds { get; init; }

    [JsonPropertyName("rate")]
    public string? Rate { get; init; }

    [JsonPropertyName("url")]
    public string? Url { get; init; }

    [JsonPropertyName("wikipedia_extracts")]
    public OpenTripMapWikipediaExtractsModel? WikipediaExtracts { get; init; }

    [JsonPropertyName("wikipedia")]
    public string? Wikipedia { get; init; }

    [JsonPropertyName("wikidata")]
    public string? Wikidata { get; init; }

    [JsonPropertyName("address")]
    public OpenTripMapAddressModel? Address { get; init; }

    [JsonPropertyName("point")]
    public OpenTripMapPointModel? Point { get; init; }
}

internal sealed record OpenTripMapWikipediaExtractsModel
{
    [JsonPropertyName("text")]
    public string? Text { get; init; }
}

internal sealed record OpenTripMapAddressModel
{
    [JsonPropertyName("house_number")]
    public string? HouseNumber { get; init; }

    [JsonPropertyName("road")]
    public string? Road { get; init; }

    [JsonPropertyName("suburb")]
    public string? Suburb { get; init; }

    [JsonPropertyName("city")]
    public string? City { get; init; }

    [JsonPropertyName("town")]
    public string? Town { get; init; }

    [JsonPropertyName("village")]
    public string? Village { get; init; }

    [JsonPropertyName("state")]
    public string? State { get; init; }

    [JsonPropertyName("postcode")]
    public string? Postcode { get; init; }

    [JsonPropertyName("country")]
    public string? Country { get; init; }
}

internal sealed record OpenTripMapPointModel
{
    [JsonPropertyName("lat")]
    public double Lat { get; init; }

    [JsonPropertyName("lon")]
    public double Lon { get; init; }
}
