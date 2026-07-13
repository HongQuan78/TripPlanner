using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using Xunit;
using TripPlanner.Infrastructure.Extensions;
using TripPlanner.Infrastructure.Settings;

namespace TripPlanner.Tests;

public class ResendSettingsValidationTests
{
    private static ServiceProvider BuildProvider(Dictionary<string, string?> resendOverrides)
    {
        var settings = new Dictionary<string, string?>
        {
            ["ConnectionStrings:DefaultConnection"] = "Host=localhost;Database=test;Username=test;Password=test",
            ["ResendSettings:ApiKey"] = "re_test_key",
            ["ResendSettings:FromAddress"] = "no-reply@tripplanner.local",
            ["ResendSettings:VerificationUrlBase"] = "http://localhost:5000/api/auth/verify-email",
            ["ResendSettings:TokenExpiryHours"] = "24",
            ["ResendSettings:SmtpHost"] = "smtp.resend.com",
            ["ResendSettings:SmtpPort"] = "587",
            ["ResendSettings:TimeoutMilliseconds"] = "10000"
        };
        foreach (var (key, value) in resendOverrides)
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
    [InlineData("ResendSettings:ApiKey", "")]
    [InlineData("ResendSettings:FromAddress", "")]
    [InlineData("ResendSettings:VerificationUrlBase", "")]
    [InlineData("ResendSettings:TokenExpiryHours", "0")]
    [InlineData("ResendSettings:SmtpHost", "")]
    [InlineData("ResendSettings:SmtpPort", "0")]
    [InlineData("ResendSettings:TimeoutMilliseconds", "0")]
    public void StartupValidation_InvalidSettings_Throws(string key, string value)
    {
        using var provider = BuildProvider(new Dictionary<string, string?> { [key] = value });

        var validator = provider.GetRequiredService<IStartupValidator>();

        Assert.Throws<OptionsValidationException>(() => validator.Validate());
    }
}
