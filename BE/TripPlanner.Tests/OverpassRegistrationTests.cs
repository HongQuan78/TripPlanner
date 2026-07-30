using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using Xunit;
using TripPlanner.Application.Interfaces.Services;
using TripPlanner.Infrastructure.Extensions;

namespace TripPlanner.Tests;

public class OverpassRegistrationTests
{
    private static ServiceProvider BuildProvider(Dictionary<string, string?> overrides)
    {
        var settings = new Dictionary<string, string?>
        {
            ["ConnectionStrings:DefaultConnection"] = "Host=localhost;Database=test;Username=test;Password=test",
            ["EmailSettings:FromAddress"] = "no-reply@tripplanner.local",
            ["EmailSettings:VerificationUrlBase"] = "http://localhost:5000/api/auth/verify-email",
            ["EmailSettings:TokenExpiryHours"] = "24",
            ["ResendSettings:ApiKey"] = "re_test_key",
            ["ResendSettings:SmtpHost"] = "smtp.resend.com",
            ["ResendSettings:SmtpPort"] = "587",
            ["ResendSettings:TimeoutMilliseconds"] = "10000",
            ["WikipediaSettings:BaseUrl"] = "https://en.wikipedia.org/api/rest_v1/",
            ["WikipediaSettings:TimeoutMilliseconds"] = "5000",
            ["PhotonSettings:BaseUrl"] = "https://photon.komoot.io/api/",
            ["PhotonSettings:TimeoutMilliseconds"] = "5000",
            ["OverpassSettings:BaseUrl"] = "https://overpass-api.de/api",
            ["OverpassSettings:TimeoutMilliseconds"] = "5000",
            ["OverpassSettings:CacheMinutes"] = "1440"
        };
        foreach (var (key, value) in overrides)
        {
            settings[key] = value;
        }

        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(settings)
            .Build();

        var services = new ServiceCollection();
        services.AddInfrastructureServices(configuration);
        return services.BuildServiceProvider();
    }

    [Fact]
    public void AddInfrastructureServices_ResolvesOpeningHoursProvider()
    {
        using var provider = BuildProvider([]);

        var resolved = provider.GetRequiredService<IOpeningHoursProvider>();

        Assert.Equal("OverpassOpeningHoursProvider", resolved.GetType().Name);
    }

    [Fact]
    public void AddInfrastructureServices_ResolvesDestinationDetailsService()
    {
        using var provider = BuildProvider([]);
        using var scope = provider.CreateScope();

        var resolved = scope.ServiceProvider.GetRequiredService<IDestinationDetailsService>();

        Assert.Equal("OpenTripMapDestinationDetailsService", resolved.GetType().Name);
    }

    [Fact]
    public void AddInfrastructureServices_ResolvesTimeZoneResolver()
    {
        using var provider = BuildProvider([]);

        var resolved = provider.GetRequiredService<ITimeZoneResolver>();

        Assert.Equal("GeoTimeZoneResolver", resolved.GetType().Name);
    }

    [Fact]
    public void OverpassHttpClient_BaseAddressKeepsTrailingSlashSoRelativePathsResolve()
    {
        using var provider = BuildProvider([]);

        var factory = provider.GetRequiredService<IHttpClientFactory>();
        var client = factory.CreateClient(nameof(IOpeningHoursProvider));

        Assert.NotNull(client.BaseAddress);
        Assert.EndsWith("/", client.BaseAddress.AbsoluteUri);
        Assert.Equal("https://overpass-api.de/api/interpreter", new Uri(client.BaseAddress, "interpreter").AbsoluteUri);
    }

    [Fact]
    public void StartupValidation_ValidOverpassSettings_Passes()
    {
        using var provider = BuildProvider([]);

        var validator = provider.GetRequiredService<IStartupValidator>();

        validator.Validate();
    }

    [Theory]
    [InlineData("OverpassSettings:BaseUrl", "")]
    [InlineData("OverpassSettings:TimeoutMilliseconds", "0")]
    [InlineData("OverpassSettings:CacheMinutes", "0")]
    [InlineData("OverpassSettings:CacheMinutes", "-1")]
    public void StartupValidation_InvalidOverpassSettings_Throws(string key, string value)
    {
        using var provider = BuildProvider(new Dictionary<string, string?> { [key] = value });

        var validator = provider.GetRequiredService<IStartupValidator>();

        Assert.Throws<OptionsValidationException>(() => validator.Validate());
    }
}
