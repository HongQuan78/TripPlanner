using Microsoft.EntityFrameworkCore;
using TripPlanner.Application.Interfaces.Repositories;
using TripPlanner.Domain.Models;
using TripPlanner.Infrastructure.Data;

namespace TripPlanner.Infrastructure.Repositories;

public class UserRepository(TripPlannerDbContext context) : IUserRepository
{
    public async Task<User?> GetByEmailAsync(string email, CancellationToken cancellationToken = default) =>
        await context.Users.FirstOrDefaultAsync(u => u.Email == email, cancellationToken);

    public async Task<User?> GetByVerificationTokenHashAsync(string tokenHash, CancellationToken cancellationToken = default) =>
        await context.Users.FirstOrDefaultAsync(u => u.VerificationTokenHash == tokenHash, cancellationToken);

    public void Add(User user) => context.Users.Add(user);
}
