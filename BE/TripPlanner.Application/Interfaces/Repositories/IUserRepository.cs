using TripPlanner.Domain.Models;

namespace TripPlanner.Application.Interfaces.Repositories;

public interface IUserRepository : IRepository<User>
{
    Task<User?> GetByEmailAsync(string email, CancellationToken cancellationToken = default);
    Task<User?> GetByVerificationTokenHashAsync(string tokenHash, CancellationToken cancellationToken = default);
}
