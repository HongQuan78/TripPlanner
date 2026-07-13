using Microsoft.Extensions.Options;
using Xunit;
using TripPlanner.Infrastructure.ExternalServices.Resend;
using TripPlanner.Infrastructure.Settings;

namespace TripPlanner.Tests;

public class ResendEmailSenderTests
{
    private static ResendSettings CreateSettings() => new()
    {
        ApiKey = "re_test_key",
        FromAddress = "no-reply@tripplanner.local",
        FromName = "TripPlanner",
        VerificationUrlBase = "http://localhost:5000/api/auth/verify-email",
        TokenExpiryHours = 24,
        SmtpHost = "smtp.resend.com",
        SmtpPort = 587,
        TimeoutMilliseconds = 10000
    };

    [Fact]
    public void BuildMessage_ReturnsExpectedShape()
    {
        var settings = CreateSettings();

        var message = ResendEmailSender.BuildMessage(settings, "user@example.com", "raw-token");

        Assert.Equal("TripPlanner", message.From.Mailboxes.Single().Name);
        Assert.Equal("no-reply@tripplanner.local", message.From.Mailboxes.Single().Address);
        Assert.Equal("user@example.com", message.To.Mailboxes.Single().Address);
        Assert.Equal("Verify your email address", message.Subject);
        Assert.Contains("http://localhost:5000/api/auth/verify-email?token=raw-token", message.TextBody);
        Assert.Contains("24 hours", message.TextBody);
    }

    [Fact]
    public async Task SendVerificationEmailAsync_UnreachableSmtpHost_Throws()
    {
        var settings = CreateSettings();
        var sender = new ResendEmailSender(Options.Create(new ResendSettings
        {
            ApiKey = settings.ApiKey,
            FromAddress = settings.FromAddress,
            FromName = settings.FromName,
            VerificationUrlBase = settings.VerificationUrlBase,
            TokenExpiryHours = settings.TokenExpiryHours,
            SmtpHost = "127.0.0.1",
            SmtpPort = 1,
            TimeoutMilliseconds = 2000
        }));

        await Assert.ThrowsAnyAsync<Exception>(() =>
            sender.SendVerificationEmailAsync("user@example.com", "raw-token"));
    }
}
