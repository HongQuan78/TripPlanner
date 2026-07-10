namespace TripPlanner.Application.Interfaces.Services;

public interface ITokenBlacklist
{
    void Revoke(string jti);
    bool IsRevoked(string jti);
}
