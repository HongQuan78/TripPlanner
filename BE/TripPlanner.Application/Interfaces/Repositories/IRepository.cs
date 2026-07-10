namespace TripPlanner.Application.Interfaces.Repositories;

public interface IRepository<T> where T : class
{
    Task<T?> GetByIdAsync(int id, CancellationToken cancellationToken = default);
    void Add(T entity);
    void Remove(T entity);
}
