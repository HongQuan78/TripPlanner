using Microsoft.Extensions.Logging.Abstractions;
using NSubstitute;
using NSubstitute.ExceptionExtensions;
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
    private readonly IVerificationTokenService _verificationTokenService = Substitute.For<IVerificationTokenService>();
    private readonly IEmailSender _emailSender = Substitute.For<IEmailSender>();

    private RegisterUserUseCase RegisterUseCase() => new(
        _userRepository, _passwordHasher, _verificationTokenService, _emailSender, _unitOfWork,
        NullLogger<RegisterUserUseCase>.Instance);
    private LoginUserUseCase LoginUseCase() => new(_userRepository, _passwordHasher, _tokenService);
    private LogoutUseCase LogoutUseCase() => new(_tokenBlacklist);
    private VerifyEmailUseCase VerifyEmailUseCase() => new(_userRepository, _verificationTokenService, _unitOfWork);
    private ResendVerificationEmailUseCase ResendUseCase() => new(
        _userRepository, _verificationTokenService, _emailSender, _unitOfWork,
        NullLogger<ResendVerificationEmailUseCase>.Instance);

    private static User VerifiedUser(string email = "user@example.com", string passwordHash = "hash")
    {
        var user = new User(email, passwordHash);
        user.VerifyEmail();
        return user;
    }

    [Fact]
    public async Task RegisterAsync_NewEmail_ReturnsGenericSuccessAndSendsVerificationEmail()
    {
        var request = new RegisterRequest { Email = "new@example.com", Password = "Password1" };
        _userRepository.GetByEmailAsync(request.Email, Arg.Any<CancellationToken>()).Returns((User?)null);
        _passwordHasher.Hash(request.Password).Returns("hashed");
        _verificationTokenService.Generate().Returns(new VerificationToken("raw-token", "token-hash", DateTime.UtcNow.AddHours(24)));
        User? captured = null;
        _userRepository.Add(Arg.Do<User>(u => captured = u));

        var result = await RegisterUseCase().ExecuteAsync(request);

        Assert.True(result.IsSuccess);
        Assert.False(string.IsNullOrEmpty(result.Data!.Message));
        Assert.NotNull(captured);
        Assert.False(captured!.IsEmailVerified);
        Assert.Equal("token-hash", captured.VerificationTokenHash);
        Assert.NotNull(captured.VerificationTokenExpiresAt);
        await _unitOfWork.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
        await _emailSender.Received(1).SendVerificationEmailAsync(request.Email, "raw-token", Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task RegisterAsync_DuplicateEmail_ReturnsSameGenericSuccessWithoutSavingOrSending()
    {
        var request = new RegisterRequest { Email = "existing@example.com", Password = "Password1" };
        _userRepository.GetByEmailAsync(request.Email, Arg.Any<CancellationToken>())
            .Returns(new User("existing@example.com", "hash"));

        var result = await RegisterUseCase().ExecuteAsync(request);

        Assert.True(result.IsSuccess);
        Assert.False(string.IsNullOrEmpty(result.Data!.Message));
        _userRepository.DidNotReceive().Add(Arg.Any<User>());
        await _unitOfWork.DidNotReceive().SaveChangesAsync(Arg.Any<CancellationToken>());
        await _emailSender.DidNotReceive().SendVerificationEmailAsync(Arg.Any<string>(), Arg.Any<string>(), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task RegisterAsync_EmailSendFails_StillReturnsGenericSuccess()
    {
        var request = new RegisterRequest { Email = "new@example.com", Password = "Password1" };
        _userRepository.GetByEmailAsync(request.Email, Arg.Any<CancellationToken>()).Returns((User?)null);
        _passwordHasher.Hash(request.Password).Returns("hashed");
        _verificationTokenService.Generate().Returns(new VerificationToken("raw-token", "token-hash", DateTime.UtcNow.AddHours(24)));
        _emailSender.SendVerificationEmailAsync(Arg.Any<string>(), Arg.Any<string>(), Arg.Any<CancellationToken>())
            .ThrowsAsync(new InvalidOperationException("smtp down"));

        var result = await RegisterUseCase().ExecuteAsync(request);

        Assert.True(result.IsSuccess);
        await _unitOfWork.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task LoginAsync_ValidCredentialsAndVerifiedEmail_ReturnsSuccessWithToken()
    {
        var user = VerifiedUser();
        var request = new LoginRequest { Email = "user@example.com", Password = "Password1" };
        _userRepository.GetByEmailAsync(request.Email, Arg.Any<CancellationToken>()).Returns(user);
        _passwordHasher.Verify(request.Password, user.PasswordHash).Returns(true);
        _tokenService.GenerateToken(user).Returns("token");

        var result = await LoginUseCase().ExecuteAsync(request);

        Assert.True(result.IsSuccess);
        Assert.Equal("token", result.Data!.Token);
    }

    [Fact]
    public async Task LoginAsync_UnverifiedEmail_ReturnsUnauthorized()
    {
        var user = new User("user@example.com", "hash");
        var request = new LoginRequest { Email = "user@example.com", Password = "Password1" };
        _userRepository.GetByEmailAsync(request.Email, Arg.Any<CancellationToken>()).Returns(user);
        _passwordHasher.Verify(request.Password, user.PasswordHash).Returns(true);

        var result = await LoginUseCase().ExecuteAsync(request);

        Assert.False(result.IsSuccess);
        Assert.Equal(ErrorType.Unauthorized, result.Error!.ErrorType);
        Assert.Equal("Please verify your email address before logging in.", result.Error.Description);
    }

    [Fact]
    public async Task LoginAsync_InvalidPassword_ReturnsUnauthorized()
    {
        var user = VerifiedUser();
        var request = new LoginRequest { Email = "user@example.com", Password = "wrong" };
        _userRepository.GetByEmailAsync(request.Email, Arg.Any<CancellationToken>()).Returns(user);
        _passwordHasher.Verify(request.Password, user.PasswordHash).Returns(false);

        var result = await LoginUseCase().ExecuteAsync(request);

        Assert.False(result.IsSuccess);
        Assert.Equal(ErrorType.Unauthorized, result.Error!.ErrorType);
    }

    [Fact]
    public async Task LoginAsync_UnknownEmail_ReturnsUnauthorized()
    {
        var request = new LoginRequest { Email = "unknown@example.com", Password = "Password1" };
        _userRepository.GetByEmailAsync(request.Email, Arg.Any<CancellationToken>()).Returns((User?)null);

        var result = await LoginUseCase().ExecuteAsync(request);

        Assert.False(result.IsSuccess);
        Assert.Equal(ErrorType.Unauthorized, result.Error!.ErrorType);
    }

    [Fact]
    public async Task LogoutAsync_ValidJti_RevokesTokenAndReturnsSuccess()
    {
        var jti = Guid.NewGuid().ToString();

        var result = await LogoutUseCase().ExecuteAsync(jti);

        Assert.True(result.IsSuccess);
        _tokenBlacklist.Received(1).Revoke(jti);
    }

    [Fact]
    public async Task VerifyEmailAsync_ValidToken_VerifiesUserAndClearsTokenFields()
    {
        var user = new User("user@example.com", "hash");
        user.SetVerificationToken("token-hash", DateTime.UtcNow.AddHours(1));
        _verificationTokenService.Hash("raw-token").Returns("token-hash");
        _userRepository.GetByVerificationTokenHashAsync("token-hash", Arg.Any<CancellationToken>()).Returns(user);

        var result = await VerifyEmailUseCase().ExecuteAsync("raw-token");

        Assert.True(result.IsSuccess);
        Assert.True(user.IsEmailVerified);
        Assert.Null(user.VerificationTokenHash);
        Assert.Null(user.VerificationTokenExpiresAt);
        await _unitOfWork.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task VerifyEmailAsync_ExpiredToken_ReturnsBadRequest()
    {
        var user = new User("user@example.com", "hash");
        user.SetVerificationToken("token-hash", DateTime.UtcNow.AddHours(-1));
        _verificationTokenService.Hash("raw-token").Returns("token-hash");
        _userRepository.GetByVerificationTokenHashAsync("token-hash", Arg.Any<CancellationToken>()).Returns(user);

        var result = await VerifyEmailUseCase().ExecuteAsync("raw-token");

        Assert.False(result.IsSuccess);
        Assert.Equal(ErrorType.BadRequest, result.Error!.ErrorType);
        Assert.False(user.IsEmailVerified);
        await _unitOfWork.DidNotReceive().SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task VerifyEmailAsync_UnknownToken_ReturnsBadRequest()
    {
        _verificationTokenService.Hash("raw-token").Returns("token-hash");
        _userRepository.GetByVerificationTokenHashAsync("token-hash", Arg.Any<CancellationToken>()).Returns((User?)null);

        var result = await VerifyEmailUseCase().ExecuteAsync("raw-token");

        Assert.False(result.IsSuccess);
        Assert.Equal(ErrorType.BadRequest, result.Error!.ErrorType);
    }

    [Fact]
    public async Task VerifyEmailAsync_EmptyToken_ReturnsBadRequest()
    {
        var result = await VerifyEmailUseCase().ExecuteAsync(string.Empty);

        Assert.False(result.IsSuccess);
        Assert.Equal(ErrorType.BadRequest, result.Error!.ErrorType);
        await _userRepository.DidNotReceive().GetByVerificationTokenHashAsync(Arg.Any<string>(), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task ResendVerificationAsync_UnverifiedUser_RegeneratesTokenAndSendsEmail()
    {
        var user = new User("user@example.com", "hash");
        user.SetVerificationToken("old-hash", DateTime.UtcNow.AddHours(-1));
        var request = new ResendVerificationRequest { Email = "user@example.com" };
        _userRepository.GetByEmailAsync(request.Email, Arg.Any<CancellationToken>()).Returns(user);
        _verificationTokenService.Generate().Returns(new VerificationToken("new-raw", "new-hash", DateTime.UtcNow.AddHours(24)));

        var result = await ResendUseCase().ExecuteAsync(request);

        Assert.True(result.IsSuccess);
        Assert.Equal("new-hash", user.VerificationTokenHash);
        await _unitOfWork.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
        await _emailSender.Received(1).SendVerificationEmailAsync(request.Email, "new-raw", Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task ResendVerificationAsync_UnknownEmail_ReturnsGenericSuccessWithoutSending()
    {
        var request = new ResendVerificationRequest { Email = "unknown@example.com" };
        _userRepository.GetByEmailAsync(request.Email, Arg.Any<CancellationToken>()).Returns((User?)null);

        var result = await ResendUseCase().ExecuteAsync(request);

        Assert.True(result.IsSuccess);
        await _unitOfWork.DidNotReceive().SaveChangesAsync(Arg.Any<CancellationToken>());
        await _emailSender.DidNotReceive().SendVerificationEmailAsync(Arg.Any<string>(), Arg.Any<string>(), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task ResendVerificationAsync_AlreadyVerified_ReturnsGenericSuccessWithoutSending()
    {
        var user = VerifiedUser();
        var request = new ResendVerificationRequest { Email = user.Email };
        _userRepository.GetByEmailAsync(request.Email, Arg.Any<CancellationToken>()).Returns(user);

        var result = await ResendUseCase().ExecuteAsync(request);

        Assert.True(result.IsSuccess);
        await _unitOfWork.DidNotReceive().SaveChangesAsync(Arg.Any<CancellationToken>());
        await _emailSender.DidNotReceive().SendVerificationEmailAsync(Arg.Any<string>(), Arg.Any<string>(), Arg.Any<CancellationToken>());
    }
}
