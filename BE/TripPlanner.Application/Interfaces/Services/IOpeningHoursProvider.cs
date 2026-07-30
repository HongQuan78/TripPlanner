using TripPlanner.Application.DTOs.Responses;

namespace TripPlanner.Application.Interfaces.Services;

public interface IOpeningHoursProvider
{
    Task<OpeningHoursResult> GetOpeningHoursAsync(OpeningHoursContext context, CancellationToken cancellationToken = default);
}

public sealed record OpeningHoursContext
{
    public required string Xid { get; init; }
}

public sealed record OpeningHoursResult(OpeningHoursAvailability Availability, string? Value)
{
    public static readonly OpeningHoursResult KnownAbsent = new(OpeningHoursAvailability.KnownAbsent, null);
    public static readonly OpeningHoursResult Unavailable = new(OpeningHoursAvailability.Unavailable, null);

    public static OpeningHoursResult Found(string value)
    {
        return new OpeningHoursResult(OpeningHoursAvailability.Available, value);
    }
}
