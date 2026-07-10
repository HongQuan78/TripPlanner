using TripPlanner.Application.Common;
using TripPlanner.Application.Interfaces.Services;

namespace TripPlanner.Application.UseCases.Auth;

public class LogoutUseCase(ITokenBlacklist tokenBlacklist) : ILogoutUseCase
{
    public Task<Result> ExecuteAsync(string jti, CancellationToken cancellationToken = default)
    {
        tokenBlacklist.Revoke(jti);
        return Task.FromResult(Result.Success());
    }
}
