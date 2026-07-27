using System.Net;
using Microsoft.Extensions.Options;
using TripPlanner.Application.Interfaces.Services;
using TripPlanner.Infrastructure.Settings;

namespace TripPlanner.Infrastructure.ExternalServices.Email;

public class VerificationEmailContentBuilder(IOptions<EmailSettings> options) : IVerificationEmailContentBuilder
{
    private const string DefaultBrandName = "TripPlanner";

    public VerificationEmailContent Build(string toEmail, string rawToken)
    {
        var settings = options.Value;
        var verificationLink = $"{settings.VerificationUrlBase}?token={Uri.EscapeDataString(rawToken)}";

        var textBody =
            "Welcome to TripPlanner!\n\n" +
            "Verify your email address by opening this link:\n" +
            $"{verificationLink}\n\n" +
            $"This link expires in {settings.TokenExpiryHours} hours. " +
            "If you did not sign up, you can safely ignore this email.";

        var brandName = string.IsNullOrWhiteSpace(settings.FromName) ? DefaultBrandName : settings.FromName;

        var htmlBody = VerificationEmailTemplate.Html
            .Replace("{{BrandName}}", WebUtility.HtmlEncode(brandName))
            .Replace("{{ToEmail}}", WebUtility.HtmlEncode(toEmail))
            .Replace("{{VerificationLink}}", WebUtility.HtmlEncode(verificationLink))
            .Replace("{{ExpiryHours}}", WebUtility.HtmlEncode(settings.TokenExpiryHours.ToString()));

        return new VerificationEmailContent(
            settings.FromAddress,
            settings.FromName,
            toEmail,
            "Verify your email address",
            textBody,
            htmlBody);
    }
}
