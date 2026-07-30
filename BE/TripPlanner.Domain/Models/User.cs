namespace TripPlanner.Domain.Models;

public class User
{
    public int Id { get; private set; }
    public string Email { get; private set; } = string.Empty;
    public string PasswordHash { get; private set; } = string.Empty;
    public string Role { get; private set; } = string.Empty;
    public bool IsEmailVerified { get; private set; }
    public string? VerificationTokenHash { get; private set; }
    public DateTime? VerificationTokenExpiresAt { get; private set; }
    public DateTime? LastVerificationEmailSentAt { get; private set; }

    private User() { }

    public User(string email, string passwordHash, string role = "User")
    {
        Email = email;
        PasswordHash = passwordHash;
        Role = role;
    }

    public void SetVerificationToken(string tokenHash, DateTime expiresAtUtc)
    {
        VerificationTokenHash = tokenHash;
        VerificationTokenExpiresAt = expiresAtUtc;
    }

    public void RecordVerificationEmailSent(DateTime sentAtUtc)
    {
        LastVerificationEmailSentAt = sentAtUtc;
    }

    public void VerifyEmail()
    {
        IsEmailVerified = true;
        VerificationTokenHash = null;
        VerificationTokenExpiresAt = null;
    }
}
