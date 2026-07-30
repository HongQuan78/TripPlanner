using TripPlanner.Application.Common;
using TripPlanner.Application.Interfaces.Repositories;
using TripPlanner.Application.Interfaces.Services;
using TripPlanner.Domain.Models;

namespace TripPlanner.Application.Services;

public class DestinationResolver(
    IDestinationRepository destinationRepository,
    IDestinationDetailsService destinationDetailsService) : IDestinationResolver
{
    public async Task<Result<Destination>> ResolveAsync(
        int? destinationId,
        string? xid,
        CancellationToken cancellationToken = default)
    {
        if (destinationId.HasValue)
        {
            var destination = await destinationRepository.GetByIdAsync(destinationId.Value, cancellationToken);

            if (destination is null)
            {
                return Result<Destination>.Failure(ErrorType.NotFound, "Destination Not Found");
            }

            return Result<Destination>.Success(destination);
        }

        if (string.IsNullOrWhiteSpace(xid))
        {
            return Result<Destination>.Failure(ErrorType.BadRequest, "Either DestinationId or Xid is required.");
        }

        var trimmedXid = xid.Trim();
        var existing = await destinationRepository.GetByExternalIdAsync(trimmedXid, cancellationToken);

        if (existing is not null)
        {
            return Result<Destination>.Success(existing);
        }

        try
        {
            var details = await destinationDetailsService.GetDetailsAsync(trimmedXid, cancellationToken);

            if (details is null)
            {
                return Result<Destination>.Failure(ErrorType.NotFound, "Destination Not Found");
            }

            var rating = details.Rating ?? 0;
            const string defaultCategory = "interesting_places";
            var imported = new Destination(
                details.Name,
                rating,
                details.Category ?? defaultCategory,
                details.OpeningHours,
                details.Xid);

            destinationRepository.Add(imported);
            return Result<Destination>.Success(imported);
        }
        catch (Exception exception) when (exception is HttpRequestException or TaskCanceledException)
        {
            return Result<Destination>.Failure(ErrorType.ServiceUnavailable, "Destination details are currently unavailable.");
        }
    }
}
