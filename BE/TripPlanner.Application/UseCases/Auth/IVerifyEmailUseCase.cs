using TripPlanner.Application.Common;
using TripPlanner.Application.DTOs.Responses;

namespace TripPlanner.Application.UseCases.Auth;

public interface IVerifyEmailUseCase
{
    Task<Result<MessageResponse>> ExecuteAsync(string token, CancellationToken cancellationToken = default);
}
