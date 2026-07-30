namespace TripPlanner.Infrastructure.Settings;

public sealed class RedisSettings
{
    public const string SectionName = "Redis";
    public string InstanceName { get; init; } = "tripplanner:";
}
