namespace TripPlanner.Application.DTOs.Responses;

public sealed record AuthResponse
{
    public int Id { get; init; }
    public string Email { get; init; } = string.Empty;
    public string Role { get; init; } = string.Empty;
    public string Token { get; init; } = string.Empty;
}
