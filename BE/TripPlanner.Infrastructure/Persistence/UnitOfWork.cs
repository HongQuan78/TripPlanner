using Microsoft.EntityFrameworkCore;
using Npgsql;
using TripPlanner.Application.Common.Exceptions;
using TripPlanner.Application.Interfaces.Repositories;
using TripPlanner.Infrastructure.Data;

namespace TripPlanner.Infrastructure.Persistence;

public class UnitOfWork(TripPlannerDbContext context) : IUnitOfWork
{
    public async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            return await context.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException ex) when (ex.InnerException is PostgresException { SqlState: "23505" })
        {
            throw new UniqueConstraintViolationException("A unique constraint was violated while saving changes.", ex);
        }
    }

    public async Task ExecuteInTransactionAsync(Func<CancellationToken, Task> operation, CancellationToken cancellationToken = default)
    {
        await using var transaction = await context.Database.BeginTransactionAsync(cancellationToken);

        try
        {
            await operation(cancellationToken);
            await transaction.CommitAsync(cancellationToken);
        }
        catch
        {
            await transaction.RollbackAsync(cancellationToken);
            throw;
        }
    }
}
