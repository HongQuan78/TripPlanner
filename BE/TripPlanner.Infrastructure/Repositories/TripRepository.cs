using Microsoft.EntityFrameworkCore;
using TripPlanner.Application.Interfaces.Repositories;
using TripPlanner.Domain.Models;
using TripPlanner.Infrastructure.Data;

namespace TripPlanner.Infrastructure.Repositories;

public class TripRepository(TripPlannerDbContext context) : Repository<Trip>(context), ITripRepository
{
    public const string DayDestinationsIncludePath = "Days._items.Destination";

    public async Task<Trip?> GetWithDaysAndDestinationsAsync(int id, int userId, CancellationToken cancellationToken = default) =>
        await Context.Trips
            .Include(t => t.Days)
            .Include(DayDestinationsIncludePath)
            .Include(t => t.SavedPlaces)
            .FirstOrDefaultAsync(t => t.Id == id && t.UserId == userId, cancellationToken);

    public async Task<List<Trip>> GetAllWithDaysAndDestinationsAsync(int userId, CancellationToken cancellationToken = default) =>
        await Context.Trips
            .Include(t => t.Days)
            .Include(DayDestinationsIncludePath)
            .Include(t => t.SavedPlaces)
            .Where(t => t.UserId == userId)
            .ToListAsync(cancellationToken);
}
