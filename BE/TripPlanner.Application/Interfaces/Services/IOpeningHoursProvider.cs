namespace TripPlanner.Application.Interfaces.Services;

public interface IOpeningHoursProvider
{
    Task<string?> GetOpeningHoursAsync(OpeningHoursContext context, CancellationToken cancellationToken = default);
}

public sealed record OpeningHoursContext
{
    public required string Xid { get; init; }
}
