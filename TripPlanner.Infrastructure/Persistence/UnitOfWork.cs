using TripPlanner.Application.Interfaces.Repositories;
using TripPlanner.Infrastructure.Data;

namespace TripPlanner.Infrastructure.Persistence;

public class UnitOfWork(TripPlannerDbContext context) : IUnitOfWork
{
    public async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default) =>
        await context.SaveChangesAsync(cancellationToken);
}
