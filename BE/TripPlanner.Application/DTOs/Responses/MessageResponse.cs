namespace TripPlanner.Application.DTOs.Responses;

public sealed record MessageResponse
{
    public string Message { get; init; } = string.Empty;
}
