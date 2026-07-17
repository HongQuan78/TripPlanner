using TripPlanner.Application.Common;
using TripPlanner.Domain.Models;

namespace TripPlanner.Application.Interfaces.Services;

public interface IDestinationResolver
{
    Task<Result<Destination>> ResolveAsync(int? destinationId, string? xid, CancellationToken cancellationToken = default);
}
