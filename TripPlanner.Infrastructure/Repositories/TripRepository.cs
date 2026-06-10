using Microsoft.EntityFrameworkCore;
using TripPlanner.Application.Interfaces;
using TripPlanner.Domain.Models;
using TripPlanner.Infrastructure.Data;

namespace TripPlanner.Infrastructure.Repositories;

public class TripRepository(TripPlannerDbContext context) : Repository<Trip>(context), ITripRepository
{
    public Trip? GetWithDaysAndDestinations(int id) =>
        Context.Trips
            .Include(t => t.Days)
                .ThenInclude(d => d.Destinations)
            .FirstOrDefault(t => t.Id == id);

    public async Task<Trip?> GetWithDaysAndDestinationsAsync(int id, CancellationToken cancellationToken = default) =>
        await Context.Trips
            .Include(t => t.Days)
                .ThenInclude(d => d.Destinations)
            .FirstOrDefaultAsync(t => t.Id == id, cancellationToken);

    public List<Trip> GetAllWithDaysAndDestinations() =>
        Context.Trips
            .Include(t => t.Days)
                .ThenInclude(d => d.Destinations)
            .ToList();

    public async Task<List<Trip>> GetAllWithDaysAndDestinationsAsync(CancellationToken cancellationToken = default) =>
        await Context.Trips
            .Include(t => t.Days)
                .ThenInclude(d => d.Destinations)
            .ToListAsync(cancellationToken);
}
