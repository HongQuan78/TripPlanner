using Microsoft.Extensions.Options;
using NSubstitute;
using Xunit;
using TripPlanner.Application.Interfaces.Services;
using TripPlanner.Infrastructure.ExternalServices.Google;
using TripPlanner.Infrastructure.Settings;

namespace TripPlanner.Tests;

public class GoogleEmailSenderTests
{
    private static VerificationEmailContent CreateContent() => new(
        FromAddress: "no-reply@tripplanner.local",
        FromName: "TripPlanner",
        ToEmail: "user@example.com",
        Subject: "Verify your email address",
        TextBody: "Welcome to TripPlanner!\n\n" +
            "Verify your email address by opening this link:\n" +
            "http://localhost:5000/api/auth/verify-email?token=raw-token\n\n" +
            "This link expires in 24 hours. If you did not sign up, you can safely ignore this email.");

    [Fact]
    public void BuildMessage_ReturnsExpectedShape()
    {
        var content = CreateContent();

        var message = GoogleEmailSender.BuildMessage(content);

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
        var contentBuilder = Substitute.For<IVerificationEmailContentBuilder>();
        contentBuilder.Build(Arg.Any<string>(), Arg.Any<string>()).Returns(CreateContent());

        var settings = new GoogleSmtpSettings
        {
            Username = "sender@gmail.com",
            AppPassword = "app-password",
            SmtpHost = "127.0.0.1",
            SmtpPort = 1,
            TimeoutMilliseconds = 2000
        };
        var sender = new GoogleEmailSender(contentBuilder, Options.Create(settings));

        await Assert.ThrowsAnyAsync<Exception>(() =>
            sender.SendVerificationEmailAsync("user@example.com", "raw-token"));
    }
}
