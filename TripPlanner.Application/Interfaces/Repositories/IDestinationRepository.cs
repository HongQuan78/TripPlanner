using TripPlanner.Application.Parameters;
using TripPlanner.Domain.Models;

namespace TripPlanner.Application.Interfaces.Repositories;

public interface IDestinationRepository : IRepository<Destination>
{
    Task<List<Destination>> GetFilteredAsync(DestinationFilterParameter filter, CancellationToken cancellationToken = default);
}
