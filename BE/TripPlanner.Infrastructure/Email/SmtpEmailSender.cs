using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.Extensions.Options;
using MimeKit;
using TripPlanner.Application.Interfaces.Services;
using TripPlanner.Infrastructure.Settings;

namespace TripPlanner.Infrastructure.Email;

public class SmtpEmailSender(IOptions<EmailSettings> options) : IEmailSender
{
    public async Task SendVerificationEmailAsync(string toEmail, string rawToken, CancellationToken cancellationToken = default)
    {
        var settings = options.Value;
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

        using var client = new SmtpClient();
        client.Timeout = settings.TimeoutSeconds * 1000;
        var socketOptions = settings.UseStartTls ? SecureSocketOptions.StartTls : SecureSocketOptions.None;
        await client.ConnectAsync(settings.SmtpHost, settings.SmtpPort, socketOptions, cancellationToken);

        if (!string.IsNullOrEmpty(settings.Username))
        {
            await client.AuthenticateAsync(settings.Username, settings.Password, cancellationToken);
        }

        await client.SendAsync(message, cancellationToken);
        await client.DisconnectAsync(true, cancellationToken);
    }
}
