namespace TripPlanner.Application.Interfaces.Services;

public sealed record VerificationToken(string RawToken, string TokenHash, DateTime ExpiresAtUtc);

public interface IVerificationTokenService
{
    VerificationToken Generate();
    string Hash(string rawToken);
}
