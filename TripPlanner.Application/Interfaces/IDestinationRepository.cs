using TripPlanner.Application.Parameters;
using TripPlanner.Domain.Models;

namespace TripPlanner.Application.Interfaces;

public interface IDestinationRepository : IRepository<Destination>
{
    IQueryable<Destination> GetFiltered(DestinationFilterParameter filter);
    Task<List<Destination>> GetFilteredAsync(DestinationFilterParameter filter, CancellationToken cancellationToken = default);
}
