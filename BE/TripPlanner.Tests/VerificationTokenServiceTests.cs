using Microsoft.Extensions.Options;
using Xunit;
using TripPlanner.Infrastructure.Security;
using TripPlanner.Infrastructure.Settings;

namespace TripPlanner.Tests;

public class VerificationTokenServiceTests
{
    private static VerificationTokenService CreateService(int tokenExpiryHours = 24) =>
        new(Options.Create(new EmailSettings { TokenExpiryHours = tokenExpiryHours }));

    [Fact]
    public void Generate_HashOfRawTokenMatchesTokenHash()
    {
        var service = CreateService();

        var token = service.Generate();

        Assert.Equal(token.TokenHash, service.Hash(token.RawToken));
    }

    [Fact]
    public void Generate_TokenHashIs64HexCharacters()
    {
        var service = CreateService();

        var token = service.Generate();

        Assert.Equal(64, token.TokenHash.Length);
        Assert.Matches("^[0-9A-F]{64}$", token.TokenHash);
    }

    [Fact]
    public void Generate_ExpiryIsApproximatelyNowPlusConfiguredHours()
    {
        var service = CreateService(tokenExpiryHours: 24);
        var before = DateTime.UtcNow.AddHours(24);

        var token = service.Generate();

        var after = DateTime.UtcNow.AddHours(24);
        Assert.InRange(token.ExpiresAtUtc, before.AddMinutes(-1), after.AddMinutes(1));
    }
}
