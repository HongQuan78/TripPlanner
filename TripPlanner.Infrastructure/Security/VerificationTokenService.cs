using System.Buffers.Text;
using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Options;
using TripPlanner.Application.Interfaces.Services;
using TripPlanner.Infrastructure.Settings;

namespace TripPlanner.Infrastructure.Security;

public class VerificationTokenService(IOptions<EmailSettings> options) : IVerificationTokenService
{
    public VerificationToken Generate()
    {
        var rawToken = Base64Url.EncodeToString(RandomNumberGenerator.GetBytes(32));
        var expiresAtUtc = DateTime.UtcNow.AddHours(options.Value.TokenExpiryHours);
        return new VerificationToken(rawToken, Hash(rawToken), expiresAtUtc);
    }

    public string Hash(string rawToken) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(rawToken)));
}
