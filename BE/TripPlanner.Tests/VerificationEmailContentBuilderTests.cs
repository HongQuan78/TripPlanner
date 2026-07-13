using Microsoft.Extensions.Options;
using Xunit;
using TripPlanner.Infrastructure.ExternalServices.Email;
using TripPlanner.Infrastructure.Settings;

namespace TripPlanner.Tests;

public class VerificationEmailContentBuilderTests
{
    private static VerificationEmailContentBuilder CreateBuilder() => new(Options.Create(new EmailSettings
    {
        FromAddress = "no-reply@tripplanner.local",
        FromName = "TripPlanner",
        VerificationUrlBase = "http://localhost:5000/api/auth/verify-email",
        TokenExpiryHours = 24
    }));

    [Fact]
    public void Build_ReturnsExpectedContent()
    {
        var builder = CreateBuilder();

        var content = builder.Build("user@example.com", "raw-token");

        Assert.Equal("TripPlanner", content.FromName);
        Assert.Equal("no-reply@tripplanner.local", content.FromAddress);
        Assert.Equal("user@example.com", content.ToEmail);
        Assert.Equal("Verify your email address", content.Subject);
        Assert.Contains("http://localhost:5000/api/auth/verify-email?token=raw-token", content.TextBody);
        Assert.Contains("24 hours", content.TextBody);
    }
}
