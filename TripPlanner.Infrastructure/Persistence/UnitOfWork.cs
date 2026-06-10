using Microsoft.EntityFrameworkCore.Storage;
using TripPlanner.Application.Interfaces;
using TripPlanner.Infrastructure.Data;

namespace TripPlanner.Infrastructure.Persistence;

public class UnitOfWork(TripPlannerDbContext context) : IUnitOfWork
{
    private IDbContextTransaction? _transaction;

    public async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default) =>
        await context.SaveChangesAsync(cancellationToken);

    public async Task BeginTransactionAsync(CancellationToken cancellationToken = default) =>
        _transaction = await context.Database.BeginTransactionAsync(cancellationToken);

    public async Task CommitAsync(CancellationToken cancellationToken = default)
    {
        await context.SaveChangesAsync(cancellationToken);
        await _transaction!.CommitAsync(cancellationToken);
    }

    public async Task RollbackAsync(CancellationToken cancellationToken = default) =>
        await _transaction!.RollbackAsync(cancellationToken);

    public void Dispose()
    {
        _transaction?.Dispose();
        context.Dispose();
    }
}
