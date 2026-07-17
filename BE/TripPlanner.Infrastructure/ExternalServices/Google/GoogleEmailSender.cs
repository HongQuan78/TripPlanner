using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.Extensions.Options;
using MimeKit;
using TripPlanner.Application.Interfaces.Services;
using TripPlanner.Infrastructure.Settings;

namespace TripPlanner.Infrastructure.ExternalServices.Google;

public class GoogleEmailSender(
    IVerificationEmailContentBuilder contentBuilder,
    IOptions<GoogleSmtpSettings> options) : IEmailSender
{
    public async Task SendVerificationEmailAsync(string toEmail, string rawToken, CancellationToken cancellationToken = default)
    {
        var settings = options.Value;
        var content = contentBuilder.Build(toEmail, rawToken);
        var message = BuildMessage(content);

        using var client = new SmtpClient
        {
            Timeout = settings.TimeoutMilliseconds
        };
        await client.ConnectAsync(settings.SmtpHost, settings.SmtpPort, SecureSocketOptions.StartTls, cancellationToken);
        await client.AuthenticateAsync(settings.Username, settings.AppPassword, cancellationToken);
        await client.SendAsync(message, cancellationToken);
        await client.DisconnectAsync(true, cancellationToken);
    }

    public static MimeMessage BuildMessage(VerificationEmailContent content)
    {
        var message = new MimeMessage();
        message.From.Add(new MailboxAddress(content.FromName, content.FromAddress));
        message.To.Add(MailboxAddress.Parse(content.ToEmail));
        message.Subject = content.Subject;
        message.Body = new BodyBuilder
        {
            TextBody = content.TextBody
        }.ToMessageBody();

        return message;
    }
}
