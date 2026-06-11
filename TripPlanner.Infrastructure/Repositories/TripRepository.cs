using Microsoft.EntityFrameworkCore;
using TripPlanner.Application.Interfaces;
using TripPlanner.Domain.Models;
using TripPlanner.Infrastructure.Data;

namespace TripPlanner.Infrastructure.Repositories;

public class TripRepository(TripPlannerDbContext context) : Repository<Trip>(context), ITripRepository
{
    public async Task<Trip?> GetWithDaysAndDestinationsAsync(int id, CancellationToken cancellationToken = default) =>
        await Context.Trips
            .Include(t => t.Days)
                .ThenInclude(d => d.Destinations)
            .FirstOrDefaultAsync(t => t.Id == id, cancellationToken);

    public async Task<List<Trip>> GetAllWithDaysAndDestinationsAsync(CancellationToken cancellationToken = default) =>
        await Context.Trips
            .Include(t => t.Days)
                .ThenInclude(d => d.Destinations)
            .ToListAsync(cancellationToken);
}
