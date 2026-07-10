namespace TripPlanner.Application.DTOs.Requests;

public sealed record RegisterRequest
{
    public string Email { get; init; } = string.Empty;
    public string Password { get; init; } = string.Empty;
}
