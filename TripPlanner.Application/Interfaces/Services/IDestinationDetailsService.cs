using TripPlanner.Application.DTOs.Responses;

namespace TripPlanner.Application.Interfaces.Services;

public interface IDestinationDetailsService
{
    Task<DestinationDetailsResponse?> GetDetailsAsync(string xid, CancellationToken cancellationToken = default);
}
