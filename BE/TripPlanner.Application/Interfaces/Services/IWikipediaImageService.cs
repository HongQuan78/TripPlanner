namespace TripPlanner.Application.Interfaces.Services;

public interface IWikipediaImageService
{
    Task<string?> GetThumbnailUrlAsync(string wikipediaUrl, CancellationToken cancellationToken = default);
}
