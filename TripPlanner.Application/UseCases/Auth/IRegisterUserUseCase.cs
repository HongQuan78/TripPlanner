using TripPlanner.Application.Common;
using TripPlanner.Application.DTOs.Requests;
using TripPlanner.Application.DTOs.Responses;

namespace TripPlanner.Application.UseCases.Auth;

public interface IRegisterUserUseCase
{
    Task<Result<AuthResponse>> ExecuteAsync(RegisterRequest request, CancellationToken cancellationToken = default);
}
