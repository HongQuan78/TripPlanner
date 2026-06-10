namespace TripPlanner.Application.Interfaces;

public interface IRepository<T> where T : class
{
    T? GetById(int id);
    Task<T?> GetByIdAsync(int id, CancellationToken cancellationToken = default);
    IQueryable<T> GetAll();
    void Add(T entity);
    void Remove(T entity);
}
