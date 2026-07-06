namespace TripPlanner.Application.Interfaces.Services;

public interface IEmailSender
{
    Task SendVerificationEmailAsync(string toEmail, string rawToken, CancellationToken cancellationToken = default);
}
