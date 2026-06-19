using NSubstitute;
using Xunit;
using TripPlanner.Application.Common;
using TripPlanner.Application.DTOs.Requests;
using TripPlanner.Application.Interfaces.Repositories;
using TripPlanner.Application.Interfaces.Services;
using TripPlanner.Application.UseCases.Auth;
using TripPlanner.Domain.Models;

namespace TripPlanner.Tests;

public class AuthServiceTests
{
    private readonly IUserRepository _userRepository = Substitute.For<IUserRepository>();
    private readonly IPasswordHasher _passwordHasher = Substitute.For<IPasswordHasher>();
    private readonly ITokenService _tokenService = Substitute.For<ITokenService>();
    private readonly IUnitOfWork _unitOfWork = Substitute.For<IUnitOfWork>();
    private readonly ITokenBlacklist _tokenBlacklist = Substitute.For<ITokenBlacklist>();

    private RegisterUserUseCase RegisterUseCase() => new(_userRepository, _passwordHasher, _tokenService, _unitOfWork);
    private LoginUserUseCase LoginUseCase() => new(_userRepository, _passwordHasher, _tokenService);
    private LogoutUseCase LogoutUseCase() => new(_tokenBlacklist);

    [Fact]
    public async Task RegisterAsync_NewEmail_ReturnsSuccessWithToken()
    {
        var request = new RegisterRequest { Email = "new@example.com", Password = "Password1" };
        _userRepository.GetByEmailAsync(request.Email, Arg.Any<CancellationToken>()).Returns((User?)null);
        _passwordHasher.Hash(request.Password).Returns("hashed");
        _tokenService.GenerateToken(Arg.Any<User>()).Returns("token");

        var result = await RegisterUseCase().ExecuteAsync(request);

        Assert.True(result.IsSuccess);
        Assert.Equal("token", result.Data!.Token);
    }

    [Fact]
    public async Task RegisterAsync_DuplicateEmail_ReturnsFailure()
    {
        var request = new RegisterRequest { Email = "existing@example.com", Password = "Password1" };
        _userRepository.GetByEmailAsync(request.Email, Arg.Any<CancellationToken>())
            .Returns(new User("existing@example.com", "hash"));

        var result = await RegisterUseCase().ExecuteAsync(request);

        Assert.False(result.IsSuccess);
        Assert.Equal(ErrorType.BadRequest, result.Error!.ErrorType);
    }

    [Fact]
    public async Task LoginAsync_ValidCredentials_ReturnsSuccessWithToken()
    {
        var user = new User("user@example.com", "hash");
        var request = new LoginRequest { Email = "user@example.com", Password = "Password1" };
        _userRepository.GetByEmailAsync(request.Email, Arg.Any<CancellationToken>()).Returns(user);
        _passwordHasher.Verify(request.Password, user.PasswordHash).Returns(true);
        _tokenService.GenerateToken(user).Returns("token");

        var result = await LoginUseCase().ExecuteAsync(request);

        Assert.True(result.IsSuccess);
        Assert.Equal("token", result.Data!.Token);
    }

    [Fact]
    public async Task LoginAsync_InvalidPassword_ReturnsFailure()
    {
        var user = new User("user@example.com", "hash");
        var request = new LoginRequest { Email = "user@example.com", Password = "wrong" };
        _userRepository.GetByEmailAsync(request.Email, Arg.Any<CancellationToken>()).Returns(user);
        _passwordHasher.Verify(request.Password, user.PasswordHash).Returns(false);

        var result = await LoginUseCase().ExecuteAsync(request);

        Assert.False(result.IsSuccess);
        Assert.Equal(ErrorType.BadRequest, result.Error!.ErrorType);
    }

    [Fact]
    public async Task LoginAsync_UnknownEmail_ReturnsFailure()
    {
        var request = new LoginRequest { Email = "unknown@example.com", Password = "Password1" };
        _userRepository.GetByEmailAsync(request.Email, Arg.Any<CancellationToken>()).Returns((User?)null);

        var result = await LoginUseCase().ExecuteAsync(request);

        Assert.False(result.IsSuccess);
        Assert.Equal(ErrorType.BadRequest, result.Error!.ErrorType);
    }

    [Fact]
    public async Task LogoutAsync_ValidJti_RevokesTokenAndReturnsSuccess()
    {
        var jti = Guid.NewGuid().ToString();

        var result = await LogoutUseCase().ExecuteAsync(jti);

        Assert.True(result.IsSuccess);
        _tokenBlacklist.Received(1).Revoke(jti);
    }
}
