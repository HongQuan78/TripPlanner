using TripPlanner.Domain.Models;

namespace TripPlanner.Application.Interfaces;

public interface ITripRepository : IRepository<Trip>
{
    Task<Trip?> GetWithDaysAndDestinationsAsync(int id, CancellationToken cancellationToken = default);
    Task<List<Trip>> GetAllWithDaysAndDestinationsAsync(CancellationToken cancellationToken = default);
}
