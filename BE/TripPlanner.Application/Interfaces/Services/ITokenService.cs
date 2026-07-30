using TripPlanner.Domain.Models;

namespace TripPlanner.Application.Interfaces.Services;

public interface ITokenService
{
    string GenerateToken(User user);
}
