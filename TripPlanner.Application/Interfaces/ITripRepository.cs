using TripPlanner.Domain.Models;

namespace TripPlanner.Application.Interfaces;

public interface ITripRepository : IRepository<Trip>
{
    Trip? GetWithDaysAndDestinations(int id);
    Task<Trip?> GetWithDaysAndDestinationsAsync(int id, CancellationToken cancellationToken = default);
    List<Trip> GetAllWithDaysAndDestinations();
    Task<List<Trip>> GetAllWithDaysAndDestinationsAsync(CancellationToken cancellationToken = default);
}
