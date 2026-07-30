using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using Xunit;
using TripPlanner.Infrastructure.Extensions;

namespace TripPlanner.Tests;

public class PhotonSettingsValidationTests
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
            ["PhotonSettings:TimeoutMilliseconds"] = "5000"
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
    public void StartupValidation_ValidSettings_Passes()
    {
        using var provider = BuildProvider(new Dictionary<string, string?>());

        var validator = provider.GetRequiredService<IStartupValidator>();

        validator.Validate();
    }

    [Theory]
    [InlineData("PhotonSettings:BaseUrl", "")]
    [InlineData("PhotonSettings:TimeoutMilliseconds", "0")]
    public void StartupValidation_InvalidPhotonSettings_Throws(string key, string value)
    {
        using var provider = BuildProvider(new Dictionary<string, string?> { [key] = value });

        var validator = provider.GetRequiredService<IStartupValidator>();

        Assert.Throws<OptionsValidationException>(() => validator.Validate());
    }
}
