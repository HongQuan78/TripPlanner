using TripPlanner.Application.Common;
using TripPlanner.Application.DTOs.Requests;
using TripPlanner.Application.DTOs.Responses;

namespace TripPlanner.Application.UseCases.Auth;

public interface IResendVerificationEmailUseCase
{
    Task<Result<MessageResponse>> ExecuteAsync(ResendVerificationRequest request, CancellationToken cancellationToken = default);
}
