namespace TripPlanner.Application.Interfaces.Services;

public interface ITimeZoneResolver
{
    string? Resolve(double? latitude, double? longitude);
}
