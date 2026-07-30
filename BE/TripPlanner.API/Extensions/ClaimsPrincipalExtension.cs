using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;

namespace TripPlanner.API.Extensions;

public static class ClaimsPrincipalExtension
{
    public static int GetUserId(this ClaimsPrincipal principal)
    {
        var sub = principal.FindFirst(JwtRegisteredClaimNames.Sub)?.Value
            ?? principal.FindFirst(ClaimTypes.NameIdentifier)?.Value;

        if (!int.TryParse(sub, out var userId))
        {
            throw new UnauthorizedAccessException("Token does not contain a valid user id.");
        }

        return userId;
    }
}
