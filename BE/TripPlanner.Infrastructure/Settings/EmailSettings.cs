namespace TripPlanner.Infrastructure.Settings;

public sealed class EmailSettings
{
    public const string SectionName = "EmailSettings";
    public string SmtpHost { get; init; } = string.Empty;
    public int SmtpPort { get; init; } = 587;
    public bool UseStartTls { get; init; } = true;
    public string Username { get; init; } = string.Empty;
    public string Password { get; init; } = string.Empty;
    public string FromAddress { get; init; } = string.Empty;
    public string FromName { get; init; } = string.Empty;
    public string VerificationUrlBase { get; init; } = string.Empty;
    public int TokenExpiryHours { get; init; } = 24;
    public int TimeoutSeconds { get; init; } = 10;
}
