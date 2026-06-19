using System.Collections.Concurrent;
using TripPlanner.Application.Interfaces.Services;

namespace TripPlanner.Infrastructure.Security;

public class InMemoryTokenBlacklist : ITokenBlacklist
{
    private readonly ConcurrentDictionary<string, byte> _revokedJtis = new();

    public void Revoke(string jti) => _revokedJtis.TryAdd(jti, 0);

    public bool IsRevoked(string jti) => _revokedJtis.ContainsKey(jti);
}
