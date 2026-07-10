using TripPlanner.Domain.Models;

namespace TripPlanner.Application.Interfaces.Repositories;

public interface IUserRepository
{
    Task<User?> GetByEmailAsync(string email, CancellationToken cancellationToken = default);
    Task<User?> GetByVerificationTokenHashAsync(string tokenHash, CancellationToken cancellationToken = default);
    void Add(User user);
}
