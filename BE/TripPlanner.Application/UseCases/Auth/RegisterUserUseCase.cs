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
            await unitOfWork.SaveChangesAsync(cancellationToken);
        }
        catch (UniqueConstraintViolationException)
        {
            return Result<MessageResponse>.Success(new MessageResponse { Message = GenericMessage });
        }

        try
        {
            await emailSender.SendVerificationEmailAsync(user.Email, token.RawToken, cancellationToken);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            logger.LogError(ex, "Failed to send verification email for user {UserId}.", user.Id);
        }

        return Result<MessageResponse>.Success(new MessageResponse { Message = GenericMessage });
    }
}
