using TripPlanner.Application.Common;

namespace TripPlanner.Application.UseCases.Auth;

public interface ILogoutUseCase
{
    Task<Result> ExecuteAsync(string jti, CancellationToken cancellationToken = default);
}
