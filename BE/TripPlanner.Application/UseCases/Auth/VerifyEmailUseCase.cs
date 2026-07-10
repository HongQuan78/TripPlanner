using TripPlanner.Application.Common;
using TripPlanner.Application.DTOs.Responses;
using TripPlanner.Application.Interfaces.Repositories;
using TripPlanner.Application.Interfaces.Services;

namespace TripPlanner.Application.UseCases.Auth;

public class VerifyEmailUseCase(
    IUserRepository userRepository,
    IVerificationTokenService verificationTokenService,
    IUnitOfWork unitOfWork) : IVerifyEmailUseCase
{
    private const string InvalidTokenMessage = "Invalid or expired verification token.";

    public async Task<Result<MessageResponse>> ExecuteAsync(string token, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(token))
        {
            return Result<MessageResponse>.Failure(ErrorType.BadRequest, InvalidTokenMessage);
        }

        var tokenHash = verificationTokenService.Hash(token);
        var user = await userRepository.GetByVerificationTokenHashAsync(tokenHash, cancellationToken);

        if (user is null || user.VerificationTokenExpiresAt is null || user.VerificationTokenExpiresAt < DateTime.UtcNow)
        {
            return Result<MessageResponse>.Failure(ErrorType.BadRequest, InvalidTokenMessage);
        }

        user.VerifyEmail();
        await unitOfWork.SaveChangesAsync(cancellationToken);

        return Result<MessageResponse>.Success(new MessageResponse
        {
            Message = "Email verified successfully. You can now log in."
        });
    }
}
