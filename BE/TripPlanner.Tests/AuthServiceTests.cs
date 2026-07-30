using Microsoft.Extensions.Logging.Abstractions;
using NSubstitute;
using NSubstitute.ExceptionExtensions;
using Xunit;
using TripPlanner.Application.Common;
using TripPlanner.Application.Common.Exceptions;
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

    public AuthServiceTests()
    {
        _unitOfWork.ExecuteInTransactionAsync(Arg.Any<Func<CancellationToken, Task>>(), Arg.Any<CancellationToken>())
            .Returns(ci => ci.Arg<Func<CancellationToken, Task>>()(ci.Arg<CancellationToken>()));
    }

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
    public async Task RegisterAsync_EmailSendFails_ReturnsServiceUnavailableAndDoesNotPersistUser()
    {
        var request = new RegisterRequest { Email = "new@example.com", Password = "Password1" };
        _userRepository.GetByEmailAsync(request.Email, Arg.Any<CancellationToken>()).Returns((User?)null);
        _passwordHasher.Hash(request.Password).Returns("hashed");
        _verificationTokenService.Generate().Returns(new VerificationToken("raw-token", "token-hash", DateTime.UtcNow.AddHours(24)));
        _emailSender.SendVerificationEmailAsync(Arg.Any<string>(), Arg.Any<string>(), Arg.Any<CancellationToken>())
            .ThrowsAsync(new InvalidOperationException("smtp down"));

        var result = await RegisterUseCase().ExecuteAsync(request);

        Assert.False(result.IsSuccess);
        Assert.Equal(ErrorType.ServiceUnavailable, result.Error!.ErrorType);
        await _emailSender.Received(1).SendVerificationEmailAsync(Arg.Any<string>(), Arg.Any<string>(), Arg.Any<CancellationToken>());
        await _unitOfWork.Received(1).ExecuteInTransactionAsync(Arg.Any<Func<CancellationToken, Task>>(), Arg.Any<CancellationToken>());
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
    public async Task LoginAsync_UnverifiedEmail_ReturnsUnauthorizedWithNotVerifiedMessage()
    {
        var user = new User("user@example.com", "hash");
        var request = new LoginRequest { Email = "user@example.com", Password = "Password1" };
        _userRepository.GetByEmailAsync(request.Email, Arg.Any<CancellationToken>()).Returns(user);
        _passwordHasher.Verify(request.Password, user.PasswordHash).Returns(true);

        Assert.False(user.IsEmailVerified);

        var result = await LoginUseCase().ExecuteAsync(request);

        Assert.False(result.IsSuccess);
        Assert.Equal(ErrorType.Unauthorized, result.Error!.ErrorType);
        Assert.Equal("Your email address is not verified. Please check your inbox.", result.Error.Description);
        _tokenService.DidNotReceive().GenerateToken(Arg.Any<User>());
    }

    [Fact]
    public async Task LoginAsync_UnverifiedEmailWithWrongPassword_ReturnsGenericMessage()
    {
        var user = new User("user@example.com", "hash");
        var request = new LoginRequest { Email = "user@example.com", Password = "wrong" };
        _userRepository.GetByEmailAsync(request.Email, Arg.Any<CancellationToken>()).Returns(user);
        _passwordHasher.Verify(request.Password, user.PasswordHash).Returns(false);

        Assert.False(user.IsEmailVerified);

        var result = await LoginUseCase().ExecuteAsync(request);

        Assert.False(result.IsSuccess);
        Assert.Equal(ErrorType.Unauthorized, result.Error!.ErrorType);
        Assert.Equal("Invalid email or password.", result.Error.Description);
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
        Assert.Equal("Invalid email or password.", result.Error.Description);
    }

    [Fact]
    public async Task LoginAsync_UnknownEmail_ReturnsUnauthorized()
    {
        var request = new LoginRequest { Email = "unknown@example.com", Password = "Password1" };
        _userRepository.GetByEmailAsync(request.Email, Arg.Any<CancellationToken>()).Returns((User?)null);

        var result = await LoginUseCase().ExecuteAsync(request);

        Assert.False(result.IsSuccess);
        Assert.Equal(ErrorType.Unauthorized, result.Error!.ErrorType);
        Assert.Equal("Invalid email or password.", result.Error.Description);
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

    [Fact]
    public async Task ResendVerificationAsync_WithinCooldown_ReturnsGenericSuccessWithoutRegeneratingOrSending()
    {
        var user = new User("user@example.com", "hash");
        user.SetVerificationToken("old-hash", DateTime.UtcNow.AddHours(1));
        user.RecordVerificationEmailSent(DateTime.UtcNow.AddSeconds(-10));
        var request = new ResendVerificationRequest { Email = "user@example.com" };
        _userRepository.GetByEmailAsync(request.Email, Arg.Any<CancellationToken>()).Returns(user);

        var result = await ResendUseCase().ExecuteAsync(request);

        Assert.True(result.IsSuccess);
        Assert.Equal("old-hash", user.VerificationTokenHash);
        _verificationTokenService.DidNotReceive().Generate();
        await _unitOfWork.DidNotReceive().SaveChangesAsync(Arg.Any<CancellationToken>());
        await _emailSender.DidNotReceive().SendVerificationEmailAsync(Arg.Any<string>(), Arg.Any<string>(), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task ResendVerificationAsync_CooldownElapsed_RegeneratesTokenSendsEmailAndStampsSentAt()
    {
        var user = new User("user@example.com", "hash");
        user.SetVerificationToken("old-hash", DateTime.UtcNow.AddHours(1));
        user.RecordVerificationEmailSent(DateTime.UtcNow.AddSeconds(-61));
        var previousSentAt = user.LastVerificationEmailSentAt;
        var request = new ResendVerificationRequest { Email = "user@example.com" };
        _userRepository.GetByEmailAsync(request.Email, Arg.Any<CancellationToken>()).Returns(user);
        _verificationTokenService.Generate().Returns(new VerificationToken("new-raw", "new-hash", DateTime.UtcNow.AddHours(24)));

        var result = await ResendUseCase().ExecuteAsync(request);

        Assert.True(result.IsSuccess);
        Assert.Equal("new-hash", user.VerificationTokenHash);
        Assert.NotNull(user.LastVerificationEmailSentAt);
        Assert.True(user.LastVerificationEmailSentAt > previousSentAt);
        await _unitOfWork.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
        await _emailSender.Received(1).SendVerificationEmailAsync(request.Email, "new-raw", Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task RegisterAsync_ConcurrentDuplicateEmail_ReturnsGenericSuccessWithoutSending()
    {
        var request = new RegisterRequest { Email = "new@example.com", Password = "Password1" };
        _userRepository.GetByEmailAsync(request.Email, Arg.Any<CancellationToken>()).Returns((User?)null);
        _passwordHasher.Hash(request.Password).Returns("hashed");
        _verificationTokenService.Generate().Returns(new VerificationToken("raw-token", "token-hash", DateTime.UtcNow.AddHours(24)));
        _unitOfWork.SaveChangesAsync(Arg.Any<CancellationToken>())
            .ThrowsAsync(new UniqueConstraintViolationException("duplicate", new InvalidOperationException()));

        var result = await RegisterUseCase().ExecuteAsync(request);

        Assert.True(result.IsSuccess);
        Assert.False(string.IsNullOrEmpty(result.Data!.Message));
        await _emailSender.DidNotReceive().SendVerificationEmailAsync(Arg.Any<string>(), Arg.Any<string>(), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task RegisterAsync_EmailSendCancelled_PropagatesOperationCanceledException()
    {
        var request = new RegisterRequest { Email = "new@example.com", Password = "Password1" };
        _userRepository.GetByEmailAsync(request.Email, Arg.Any<CancellationToken>()).Returns((User?)null);
        _passwordHasher.Hash(request.Password).Returns("hashed");
        _verificationTokenService.Generate().Returns(new VerificationToken("raw-token", "token-hash", DateTime.UtcNow.AddHours(24)));
        _emailSender.SendVerificationEmailAsync(Arg.Any<string>(), Arg.Any<string>(), Arg.Any<CancellationToken>())
            .ThrowsAsync(new OperationCanceledException());

        await Assert.ThrowsAsync<OperationCanceledException>(() => RegisterUseCase().ExecuteAsync(request));
    }

    [Fact]
    public async Task ResendVerificationAsync_EmailSendCancelled_PropagatesOperationCanceledException()
    {
        var user = new User("user@example.com", "hash");
        var request = new ResendVerificationRequest { Email = "user@example.com" };
        _userRepository.GetByEmailAsync(request.Email, Arg.Any<CancellationToken>()).Returns(user);
        _verificationTokenService.Generate().Returns(new VerificationToken("new-raw", "new-hash", DateTime.UtcNow.AddHours(24)));
        _emailSender.SendVerificationEmailAsync(Arg.Any<string>(), Arg.Any<string>(), Arg.Any<CancellationToken>())
            .ThrowsAsync(new OperationCanceledException());

        await Assert.ThrowsAsync<OperationCanceledException>(() => ResendUseCase().ExecuteAsync(request));
    }

    [Fact]
    public async Task VerifyEmailAsync_NullExpiry_ReturnsBadRequest()
    {
        var user = new User("user@example.com", "hash");
        _verificationTokenService.Hash("raw-token").Returns("token-hash");
        _userRepository.GetByVerificationTokenHashAsync("token-hash", Arg.Any<CancellationToken>()).Returns(user);

        var result = await VerifyEmailUseCase().ExecuteAsync("raw-token");

        Assert.False(result.IsSuccess);
        Assert.Equal(ErrorType.BadRequest, result.Error!.ErrorType);
        Assert.Equal("Invalid or expired verification token.", result.Error.Description);
        Assert.False(user.IsEmailVerified);
    }

    [Fact]
    public async Task VerifyEmailAsync_WhitespaceToken_ReturnsBadRequestWithoutRepositoryLookup()
    {
        var result = await VerifyEmailUseCase().ExecuteAsync("   ");

        Assert.False(result.IsSuccess);
        Assert.Equal(ErrorType.BadRequest, result.Error!.ErrorType);
        await _userRepository.DidNotReceive().GetByVerificationTokenHashAsync(Arg.Any<string>(), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task ResendVerificationAsync_EmailSendFails_StillReturnsGenericSuccess()
    {
        var user = new User("user@example.com", "hash");
        var request = new ResendVerificationRequest { Email = "user@example.com" };
        _userRepository.GetByEmailAsync(request.Email, Arg.Any<CancellationToken>()).Returns(user);
        _verificationTokenService.Generate().Returns(new VerificationToken("new-raw", "new-hash", DateTime.UtcNow.AddHours(24)));
        _emailSender.SendVerificationEmailAsync(Arg.Any<string>(), Arg.Any<string>(), Arg.Any<CancellationToken>())
            .ThrowsAsync(new InvalidOperationException("smtp down"));

        var result = await ResendUseCase().ExecuteAsync(request);

        Assert.True(result.IsSuccess);
        Assert.False(string.IsNullOrEmpty(result.Data!.Message));
        await _unitOfWork.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
    }
}
