namespace TripPlanner.Application.Parameters;

public sealed record AttractionSearchParameter
{
    public double Latitude { get; init; }
    public double Longitude { get; init; }
    public int? Radius { get; init; }
    public int? Limit { get; init; }
}
