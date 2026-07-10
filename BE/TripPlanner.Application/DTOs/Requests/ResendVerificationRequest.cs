namespace TripPlanner.Application.DTOs.Requests;

public sealed record ResendVerificationRequest
{
    public string Email { get; init; } = string.Empty;
}
