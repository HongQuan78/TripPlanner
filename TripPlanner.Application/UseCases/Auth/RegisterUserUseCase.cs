using TripPlanner.Application.Common;
using TripPlanner.Application.DTOs.Requests;
using TripPlanner.Application.DTOs.Responses;
using TripPlanner.Application.Interfaces.Repositories;
using TripPlanner.Application.Interfaces.Services;
using TripPlanner.Domain.Models;

namespace TripPlanner.Application.UseCases.Auth;

public class RegisterUserUseCase(
    IUserRepository userRepository,
    IPasswordHasher passwordHasher,
    ITokenService tokenService,
    IUnitOfWork unitOfWork) : IRegisterUserUseCase
{
    public async Task<Result<AuthResponse>> ExecuteAsync(RegisterRequest request, CancellationToken cancellationToken = default)
    {
        var existing = await userRepository.GetByEmailAsync(request.Email, cancellationToken);

        if (existing is not null)
        {
            return Result<AuthResponse>.Failure(ErrorType.BadRequest, "Email is already registered.");
        }

        var passwordHash = passwordHasher.Hash(request.Password);
        var user = new User(request.Email, passwordHash);

        userRepository.Add(user);
        await unitOfWork.SaveChangesAsync(cancellationToken);

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
