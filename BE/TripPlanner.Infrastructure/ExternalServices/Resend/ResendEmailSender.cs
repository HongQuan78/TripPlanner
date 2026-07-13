using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.Extensions.Options;
using MimeKit;
using TripPlanner.Application.Interfaces.Services;
using TripPlanner.Infrastructure.Settings;

namespace TripPlanner.Infrastructure.ExternalServices.Resend;

public class ResendEmailSender(IOptions<ResendSettings> options) : IEmailSender
{
    public async Task SendVerificationEmailAsync(string toEmail, string rawToken, CancellationToken cancellationToken = default)
    {
        var settings = options.Value;
        var message = BuildMessage(settings, toEmail, rawToken);

        using var client = new SmtpClient
        {
            Timeout = settings.TimeoutMilliseconds
        };
        await client.ConnectAsync(settings.SmtpHost, settings.SmtpPort, SecureSocketOptions.StartTls, cancellationToken);
        await client.AuthenticateAsync("resend", settings.ApiKey, cancellationToken);
        await client.SendAsync(message, cancellationToken);
        await client.DisconnectAsync(true, cancellationToken);
    }

    public static MimeMessage BuildMessage(ResendSettings settings, string toEmail, string rawToken)
    {
        var verificationLink = $"{settings.VerificationUrlBase}?token={Uri.EscapeDataString(rawToken)}";

        var message = new MimeMessage();
        message.From.Add(new MailboxAddress(settings.FromName, settings.FromAddress));
        message.To.Add(MailboxAddress.Parse(toEmail));
        message.Subject = "Verify your email address";
        message.Body = new BodyBuilder
        {
            TextBody =
                "Welcome to TripPlanner!\n\n" +
                "Verify your email address by opening this link:\n" +
                $"{verificationLink}\n\n" +
                $"This link expires in {settings.TokenExpiryHours} hours. " +
                "If you did not sign up, you can safely ignore this email."
        }.ToMessageBody();

        return message;
    }
}
