namespace TripPlanner.Infrastructure.Settings;

public sealed class ResendSettings
{
    public const string SectionName = "ResendSettings";
    public string ApiKey { get; init; } = string.Empty;
    public string SmtpHost { get; init; } = "smtp.resend.com";
    public int SmtpPort { get; init; } = 587;
    public int TimeoutMilliseconds { get; init; } = 10000;
}
