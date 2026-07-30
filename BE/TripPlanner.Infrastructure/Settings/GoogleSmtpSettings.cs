namespace TripPlanner.Infrastructure.Settings;

public sealed class GoogleSmtpSettings
{
    public const string SectionName = "GoogleSmtpSettings";
    public string Username { get; init; } = string.Empty;
    public string AppPassword { get; init; } = string.Empty;
    public string SmtpHost { get; init; } = "smtp.gmail.com";
    public int SmtpPort { get; init; } = 587;
    public int TimeoutMilliseconds { get; init; } = 10000;
}
