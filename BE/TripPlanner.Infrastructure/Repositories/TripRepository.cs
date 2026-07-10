using Microsoft.EntityFrameworkCore;
using TripPlanner.Application.Interfaces.Repositories;
using TripPlanner.Domain.Models;
using TripPlanner.Infrastructure.Data;

namespace TripPlanner.Infrastructure.Repositories;

public class TripRepository(TripPlannerDbContext context) : Repository<Trip>(context), ITripRepository
{
    public async Task<Trip?> GetWithDaysAndDestinationsAsync(int id, int userId, CancellationToken cancellationToken = default) =>
        await Context.Trips
            .Include(t => t.Days)
                .ThenInclude(d => d.Destinations)
            .FirstOrDefaultAsync(t => t.Id == id && t.UserId == userId, cancellationToken);

    public async Task<List<Trip>> GetAllWithDaysAndDestinationsAsync(int userId, CancellationToken cancellationToken = default) =>
        await Context.Trips
            .Include(t => t.Days)
                .ThenInclude(d => d.Destinations)
            .Where(t => t.UserId == userId)
            .ToListAsync(cancellationToken);
}
