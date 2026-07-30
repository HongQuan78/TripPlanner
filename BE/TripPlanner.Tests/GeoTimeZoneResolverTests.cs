using Xunit;
using TripPlanner.Application.Interfaces.Services;
using TripPlanner.Infrastructure.Extensions;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace TripPlanner.Tests;

public class GeoTimeZoneResolverTests
{
    private static ITimeZoneResolver CreateResolver()
    {
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["ConnectionStrings:DefaultConnection"] = "Host=localhost;Database=test;Username=test;Password=test",
                ["EmailSettings:FromAddress"] = "no-reply@tripplanner.local",
                ["EmailSettings:VerificationUrlBase"] = "http://localhost:5000/api/auth/verify-email"
            })
            .Build();

        var services = new ServiceCollection();
        services.AddInfrastructureServices(configuration);
        return services.BuildServiceProvider().GetRequiredService<ITimeZoneResolver>();
    }

    [Theory]
    [InlineData(48.8584, 2.2945, "Europe/Paris")]
    [InlineData(10.7769, 106.7009, "Asia/Ho_Chi_Minh")]
    [InlineData(40.7484, -73.9857, "America/New_York")]
    [InlineData(-33.8568, 151.2153, "Australia/Sydney")]
    public void Resolve_KnownCoordinates_ReturnsIanaZone(double latitude, double longitude, string expected)
    {
        var resolver = CreateResolver();

        var result = resolver.Resolve(latitude, longitude);

        Assert.Equal(expected, result);
    }

    [Theory]
    [InlineData(null, null)]
    [InlineData(48.8584, null)]
    [InlineData(null, 2.2945)]
    [InlineData(91.0, 2.2945)]
    [InlineData(48.8584, 181.0)]
    [InlineData(double.NaN, 2.2945)]
    public void Resolve_MissingOrOutOfRangeCoordinates_ReturnsNull(double? latitude, double? longitude)
    {
        var resolver = CreateResolver();

        var result = resolver.Resolve(latitude, longitude);

        Assert.Null(result);
    }
}
