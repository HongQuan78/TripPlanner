using TripPlanner.Application.Interfaces;
using TripPlanner.Infrastructure.Data;

namespace TripPlanner.Infrastructure.Repositories;

public class Repository<T>(TripPlannerDbContext context) : IRepository<T> where T : class
{
    protected readonly TripPlannerDbContext Context = context;

    public async Task<T?> GetByIdAsync(int id, CancellationToken cancellationToken = default) =>
        await Context.Set<T>().FindAsync([id], cancellationToken);

    public void Add(T entity) => Context.Set<T>().Add(entity);

    public void Remove(T entity) => Context.Set<T>().Remove(entity);
}
