using Microsoft.Extensions.Logging;
using TripPlanner.Application.Common;
using TripPlanner.Application.Common.Exceptions;
using TripPlanner.Application.DTOs.Requests;
using TripPlanner.Application.DTOs.Responses;
using TripPlanner.Application.Interfaces.Repositories;
using TripPlanner.Application.Interfaces.Services;
using TripPlanner.Domain.Models;

namespace TripPlanner.Application.UseCases.Auth;

public class RegisterUserUseCase(
    IUserRepository userRepository,
    IPasswordHasher passwordHasher,
    IVerificationTokenService verificationTokenService,
    IEmailSender emailSender,
    IUnitOfWork unitOfWork,
    ILogger<RegisterUserUseCase> logger) : IRegisterUserUseCase
{
    private const string GenericMessage = "Check your inbox for a link to verify your email address.";
    private const string EmailFailureMessage = "We could not send the verification email. Please try again later.";

    public async Task<Result<MessageResponse>> ExecuteAsync(RegisterRequest request, CancellationToken cancellationToken = default)
    {
        var existing = await userRepository.GetByEmailAsync(request.Email, cancellationToken);

        if (existing is not null)
        {
            return Result<MessageResponse>.Success(new MessageResponse { Message = GenericMessage });
        }

        var passwordHash = passwordHasher.Hash(request.Password);
        var user = new User(request.Email, passwordHash);

        var token = verificationTokenService.Generate();
        user.SetVerificationToken(token.TokenHash, token.ExpiresAtUtc);
        user.RecordVerificationEmailSent(DateTime.UtcNow);

        userRepository.Add(user);

        try
        {
            await unitOfWork.ExecuteInTransactionAsync(async ct =>
            {
                await unitOfWork.SaveChangesAsync(ct);
                await emailSender.SendVerificationEmailAsync(user.Email, token.RawToken, ct);
            }, cancellationToken);
        }
        catch (UniqueConstraintViolationException)
        {
            return Result<MessageResponse>.Success(new MessageResponse { Message = GenericMessage });
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            logger.LogError(ex, "Failed to send verification email for {Email}. Registration rolled back.", user.Email);
            return Result<MessageResponse>.Failure(ErrorType.ServiceUnavailable, EmailFailureMessage);
        }

        return Result<MessageResponse>.Success(new MessageResponse { Message = GenericMessage });
    }
}
