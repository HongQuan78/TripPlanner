using Microsoft.Extensions.Options;
using TripPlanner.Application.Interfaces.Services;
using TripPlanner.Infrastructure.Settings;

namespace TripPlanner.Infrastructure.ExternalServices.Email;

public class VerificationEmailContentBuilder(IOptions<EmailSettings> options) : IVerificationEmailContentBuilder
{
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

        return new VerificationEmailContent(
            settings.FromAddress,
            settings.FromName,
            toEmail,
            "Verify your email address",
            textBody);
    }
}
