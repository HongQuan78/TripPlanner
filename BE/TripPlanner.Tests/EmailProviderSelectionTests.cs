using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Xunit;
using TripPlanner.Application.Interfaces.Services;
using TripPlanner.Infrastructure.Extensions;
using TripPlanner.Infrastructure.ExternalServices.Google;
using TripPlanner.Infrastructure.ExternalServices.Resend;

namespace TripPlanner.Tests;

public class EmailProviderSelectionTests
{
    private static ServiceProvider BuildProvider(string? provider)
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
            ["GoogleSmtpSettings:Username"] = "sender@gmail.com",
            ["GoogleSmtpSettings:AppPassword"] = "app-password",
            ["GoogleSmtpSettings:SmtpHost"] = "smtp.gmail.com",
            ["GoogleSmtpSettings:SmtpPort"] = "587",
            ["GoogleSmtpSettings:TimeoutMilliseconds"] = "10000"
        };
        if (provider is not null)
        {
            settings["EmailSettings:Provider"] = provider;
        }

        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(settings)
            .Build();

        var services = new ServiceCollection();
        services.AddInfrastructureServices(configuration);
        return services.BuildServiceProvider();
    }

    [Theory]
    [InlineData(null)]
    [InlineData("Resend")]
    [InlineData("resend")]
    public void ProviderAbsentOrResend_ResolvesResendEmailSender(string? provider)
    {
        using var root = BuildProvider(provider);
        using var scope = root.CreateScope();

        var sender = scope.ServiceProvider.GetRequiredService<IEmailSender>();

        Assert.IsType<ResendEmailSender>(sender);
    }

    [Theory]
    [InlineData("Google")]
    [InlineData("google")]
    public void ProviderGoogle_ResolvesGoogleEmailSender(string provider)
    {
        using var root = BuildProvider(provider);
        using var scope = root.CreateScope();

        var sender = scope.ServiceProvider.GetRequiredService<IEmailSender>();

        Assert.IsType<GoogleEmailSender>(sender);
    }
}
