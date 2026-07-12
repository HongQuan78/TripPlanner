using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using Xunit;
using TripPlanner.Infrastructure.Extensions;
using TripPlanner.Infrastructure.Settings;

namespace TripPlanner.Tests;

public class EmailSettingsValidationTests
{
    private static ServiceProvider BuildProvider(Dictionary<string, string?> emailOverrides)
    {
        var settings = new Dictionary<string, string?>
        {
            ["ConnectionStrings:DefaultConnection"] = "Host=localhost;Database=test;Username=test;Password=test",
            ["EmailSettings:SmtpHost"] = "localhost",
            ["EmailSettings:SmtpPort"] = "1025",
            ["EmailSettings:FromAddress"] = "no-reply@tripplanner.local",
            ["EmailSettings:VerificationUrlBase"] = "http://localhost:5000/api/auth/verify-email",
            ["EmailSettings:TokenExpiryHours"] = "24",
            ["EmailSettings:TimeoutSeconds"] = "10"
        };
        foreach (var (key, value) in emailOverrides)
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
    [InlineData("EmailSettings:SmtpHost", "")]
    [InlineData("EmailSettings:FromAddress", "")]
    [InlineData("EmailSettings:VerificationUrlBase", "")]
    [InlineData("EmailSettings:TokenExpiryHours", "0")]
    [InlineData("EmailSettings:TimeoutSeconds", "0")]
    public void StartupValidation_InvalidSettings_Throws(string key, string value)
    {
        using var provider = BuildProvider(new Dictionary<string, string?> { [key] = value });

        var validator = provider.GetRequiredService<IStartupValidator>();

        Assert.Throws<OptionsValidationException>(() => validator.Validate());
    }
}
