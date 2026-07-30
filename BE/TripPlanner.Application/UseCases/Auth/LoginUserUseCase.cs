using TripPlanner.Application.Common;
using TripPlanner.Application.DTOs.Requests;
using TripPlanner.Application.DTOs.Responses;
using TripPlanner.Application.Interfaces.Repositories;
using TripPlanner.Application.Interfaces.Services;

namespace TripPlanner.Application.UseCases.Auth;

public class LoginUserUseCase(
    IUserRepository userRepository,
    IPasswordHasher passwordHasher,
    ITokenService tokenService) : ILoginUserUseCase
{
    public const string GenericMessage = "Invalid email or password.";
    public const string NotVerifiedMessage = "Your email address is not verified. Please check your inbox.";

    public async Task<Result<AuthResponse>> ExecuteAsync(LoginRequest request, CancellationToken cancellationToken = default)
    {
        var user = await userRepository.GetByEmailAsync(request.Email, cancellationToken);

        if (user is null || !passwordHasher.Verify(request.Password, user.PasswordHash))
        {
            return Result<AuthResponse>.Failure(ErrorType.Unauthorized, GenericMessage);
        }

        if (!user.IsEmailVerified)
        {
            return Result<AuthResponse>.Failure(ErrorType.Unauthorized, NotVerifiedMessage);
        }

        var token = tokenService.GenerateToken(user);

        return Result<AuthResponse>.Success(new AuthResponse
        {
            Id = user.Id,
            Email = user.Email,
            Role = user.Role,
            Token = token
        });
    }
}
