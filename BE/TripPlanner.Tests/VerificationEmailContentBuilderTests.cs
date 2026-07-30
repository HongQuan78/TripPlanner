using Microsoft.Extensions.Options;
using Xunit;
using TripPlanner.Infrastructure.ExternalServices.Email;
using TripPlanner.Infrastructure.Settings;

namespace TripPlanner.Tests;

public class VerificationEmailContentBuilderTests
{
    private static VerificationEmailContentBuilder CreateBuilder(
        string verificationUrlBase = "http://localhost:5000/api/auth/verify-email") => new(Options.Create(new EmailSettings
        {
            FromAddress = "no-reply@tripplanner.local",
            FromName = "TripPlanner",
            VerificationUrlBase = verificationUrlBase,
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

    [Fact]
    public void Build_HtmlBody_ContainsLinkInHrefRecipientAndExpiry()
    {
        var builder = CreateBuilder();

        var content = builder.Build("user@example.com", "raw-token");

        Assert.Contains("href=\"http://localhost:5000/api/auth/verify-email?token=raw-token\"", content.HtmlBody);
        Assert.Contains("user@example.com", content.HtmlBody);
        Assert.Contains("24 hours", content.HtmlBody);
        Assert.Contains("Verify email address", content.HtmlBody);
    }

    [Fact]
    public void Build_HtmlBody_LeavesNoResidualPlaceholder()
    {
        var builder = CreateBuilder();

        var content = builder.Build("user@example.com", "raw-token");

        Assert.DoesNotContain("{{", content.HtmlBody);
    }

    [Fact]
    public void Build_HtmlEncodesSubstitutedValues_WhileTextBodyKeepsRawLink()
    {
        var builder = CreateBuilder("http://localhost:5000/verify?a=1&b=2");

        var content = builder.Build("user@example.com", "raw-token");

        Assert.Contains("http://localhost:5000/verify?a=1&amp;b=2?token=raw-token", content.HtmlBody);
        Assert.Contains("http://localhost:5000/verify?a=1&b=2?token=raw-token", content.TextBody);
        Assert.DoesNotContain("&amp;", content.TextBody);
    }
}
