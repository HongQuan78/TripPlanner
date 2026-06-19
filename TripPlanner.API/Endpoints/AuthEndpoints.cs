using System.IdentityModel.Tokens.Jwt;
using TripPlanner.Application.DTOs.Requests;
using TripPlanner.Application.UseCases.Auth;
using TripPlanner.API.Extensions;

namespace TripPlanner.API.Endpoints;

public static class AuthEndpoints
{
    public static RouteGroupBuilder MapAuthEndpoints(this RouteGroupBuilder group)
    {
        group.MapPost("/register", Register);
        group.MapPost("/login", Login);
        group.MapPost("/logout", Logout).RequireAuthorization();
        return group;
    }

    private static async Task<IResult> Register(RegisterRequest request, IRegisterUserUseCase useCase, CancellationToken cancellationToken)
    {
        var result = await useCase.ExecuteAsync(request, cancellationToken);
        return result.ToResponse(onSuccess => Results.Ok(result.Data));
    }

    private static async Task<IResult> Login(LoginRequest request, ILoginUserUseCase useCase, CancellationToken cancellationToken)
    {
        var result = await useCase.ExecuteAsync(request, cancellationToken);
        return result.ToResponse(onSuccess => Results.Ok(result.Data));
    }

    private static async Task<IResult> Logout(HttpContext httpContext, ILogoutUseCase useCase, CancellationToken cancellationToken)
    {
        var jti = httpContext.User.FindFirst(JwtRegisteredClaimNames.Jti)?.Value;

        if (string.IsNullOrEmpty(jti))
        {
            return Results.Unauthorized();
        }

        var result = await useCase.ExecuteAsync(jti, cancellationToken);
        return result.ToResponse(() => Results.Ok());
    }
}
