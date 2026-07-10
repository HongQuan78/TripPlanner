using TripPlanner.Domain.Models;

namespace TripPlanner.Application.Interfaces.Repositories;

public interface ITripRepository : IRepository<Trip>
{
    Task<Trip?> GetWithDaysAndDestinationsAsync(int id, int userId, CancellationToken cancellationToken = default);
    Task<List<Trip>> GetAllWithDaysAndDestinationsAsync(int userId, CancellationToken cancellationToken = default);
}
