namespace TripPlanner.API.DTOs.Responses;

public sealed record TripResponse
{
    public int Id { get; init; }
    public string Name { get; init; } = string.Empty;
    public DateOnly StartDate { get; init; }
    public DateOnly EndDate { get; init; }
    public List<TripDayResponse> TripDays { get; init; }  = [];
}