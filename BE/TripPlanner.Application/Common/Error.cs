namespace TripPlanner.Application.Common;

public sealed record Error
{
    public ErrorType ErrorType { get; init; }
    public string Description { get; set; } = string.Empty;
}
