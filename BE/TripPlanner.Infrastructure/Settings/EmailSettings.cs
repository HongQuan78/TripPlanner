namespace TripPlanner.Infrastructure.Settings;

public sealed class EmailSettings
{
    public const string SectionName = "EmailSettings";
    public string FromAddress { get; init; } = string.Empty;
    public string FromName { get; init; } = string.Empty;
    public string VerificationUrlBase { get; init; } = string.Empty;
    public int TokenExpiryHours { get; init; } = 24;
}
