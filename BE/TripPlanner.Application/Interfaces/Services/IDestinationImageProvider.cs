namespace TripPlanner.Application.Interfaces.Services;

public interface IDestinationImageProvider
{
    Task<string?> GetImageUrlAsync(DestinationImageContext context, CancellationToken cancellationToken = default);
}

public sealed record DestinationImageContext
{
    public required string Name { get; init; }

    public string? WikipediaUrl { get; init; }
}
