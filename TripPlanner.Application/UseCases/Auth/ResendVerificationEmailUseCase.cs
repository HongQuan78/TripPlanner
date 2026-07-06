using Microsoft.Extensions.Logging;
using TripPlanner.Application.Common;
using TripPlanner.Application.DTOs.Requests;
using TripPlanner.Application.DTOs.Responses;
using TripPlanner.Application.Interfaces.Repositories;
using TripPlanner.Application.Interfaces.Services;

namespace TripPlanner.Application.UseCases.Auth;

public class ResendVerificationEmailUseCase(
    IUserRepository userRepository,
    IVerificationTokenService verificationTokenService,
    IEmailSender emailSender,
    IUnitOfWork unitOfWork,
    ILogger<ResendVerificationEmailUseCase> logger) : IResendVerificationEmailUseCase
{
    private const string GenericMessage = "Check your inbox for a link to verify your email address.";

    public async Task<Result<MessageResponse>> ExecuteAsync(ResendVerificationRequest request, CancellationToken cancellationToken = default)
    {
        var user = await userRepository.GetByEmailAsync(request.Email, cancellationToken);

        if (user is null || user.IsEmailVerified)
        {
            return Result<MessageResponse>.Success(new MessageResponse { Message = GenericMessage });
        }

        var token = verificationTokenService.Generate();
        user.SetVerificationToken(token.TokenHash, token.ExpiresAtUtc);
        await unitOfWork.SaveChangesAsync(cancellationToken);

        try
        {
            await emailSender.SendVerificationEmailAsync(user.Email, token.RawToken, cancellationToken);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to send verification email for user {UserId}.", user.Id);
        }

        return Result<MessageResponse>.Success(new MessageResponse { Message = GenericMessage });
    }
}
