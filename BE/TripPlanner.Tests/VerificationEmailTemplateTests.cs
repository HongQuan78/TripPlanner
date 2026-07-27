using System.Text.RegularExpressions;
using Xunit;
using TripPlanner.Infrastructure.ExternalServices.Email;

namespace TripPlanner.Tests;

public class VerificationEmailTemplateTests
{
    [Fact]
    public void ManifestResource_Resolves()
    {
        var assembly = typeof(VerificationEmailContentBuilder).Assembly;

        Assert.Contains(
            "TripPlanner.Infrastructure.ExternalServices.Email.Templates.verification-email.html",
            assembly.GetManifestResourceNames());
    }

    [Fact]
    public void Html_IsNotEmpty()
    {
        Assert.False(string.IsNullOrWhiteSpace(VerificationEmailTemplate.Html));
    }

    [Theory]
    [InlineData("{{BrandName}}")]
    [InlineData("{{ToEmail}}")]
    [InlineData("{{VerificationLink}}")]
    [InlineData("{{ExpiryHours}}")]
    public void Html_ContainsPlaceholder(string placeholder)
    {
        Assert.Contains(placeholder, VerificationEmailTemplate.Html);
    }

    [Fact]
    public void Html_ContainsNoUnexpectedPlaceholder()
    {
        var expected = new HashSet<string>
        {
            "{{BrandName}}",
            "{{ToEmail}}",
            "{{VerificationLink}}",
            "{{ExpiryHours}}"
        };

        var found = Regex.Matches(VerificationEmailTemplate.Html, @"\{\{.*?\}\}")
            .Select(match => match.Value)
            .Distinct()
            .ToList();

        Assert.NotEmpty(found);
        Assert.All(found, token => Assert.Contains(token, expected));
    }

    [Fact]
    public void Html_ContainsNoRemoteAssetOrScript()
    {
        var html = VerificationEmailTemplate.Html;

        Assert.DoesNotContain("<script", html, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("<img", html, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("<link", html, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("@import", html, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("var(--", html, StringComparison.OrdinalIgnoreCase);
    }
}
