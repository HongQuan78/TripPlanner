using GeoTimeZone;
using TripPlanner.Application.Interfaces.Services;

namespace TripPlanner.Infrastructure.ExternalServices.TimeZones;

internal sealed class GeoTimeZoneResolver : ITimeZoneResolver
{
    public string? Resolve(double? latitude, double? longitude)
    {
        if (latitude is null || longitude is null)
        {
            return null;
        }

        if (double.IsNaN(latitude.Value) || double.IsNaN(longitude.Value))
        {
            return null;
        }

        if (latitude.Value is < -90 or > 90 || longitude.Value is < -180 or > 180)
        {
            return null;
        }

        var result = TimeZoneLookup.GetTimeZone(latitude.Value, longitude.Value);
        return string.IsNullOrWhiteSpace(result.Result) ? null : result.Result;
    }
}
