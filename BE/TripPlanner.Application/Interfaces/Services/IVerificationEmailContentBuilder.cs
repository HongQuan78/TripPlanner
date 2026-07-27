namespace TripPlanner.Application.Interfaces.Services;

public record VerificationEmailContent(
    string FromAddress,
    string FromName,
    string ToEmail,
    string Subject,
    string TextBody,
    string HtmlBody);

public interface IVerificationEmailContentBuilder
{
    VerificationEmailContent Build(string toEmail, string rawToken);
}
