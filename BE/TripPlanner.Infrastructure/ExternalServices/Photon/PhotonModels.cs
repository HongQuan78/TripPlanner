using System.Text.Json.Serialization;

namespace TripPlanner.Infrastructure.ExternalServices.Photon;

internal sealed record PhotonFeatureCollectionModel
{
    [JsonPropertyName("features")]
    public List<PhotonFeatureModel>? Features { get; init; }
}

internal sealed record PhotonFeatureModel
{
    [JsonPropertyName("properties")]
    public PhotonPropertiesModel? Properties { get; init; }

    [JsonPropertyName("geometry")]
    public PhotonGeometryModel? Geometry { get; init; }
}

internal sealed record PhotonPropertiesModel
{
    [JsonPropertyName("name")]
    public string? Name { get; init; }

    [JsonPropertyName("countrycode")]
    public string? CountryCode { get; init; }
}

internal sealed record PhotonGeometryModel
{
    [JsonPropertyName("coordinates")]
    public double[]? Coordinates { get; init; }
}
