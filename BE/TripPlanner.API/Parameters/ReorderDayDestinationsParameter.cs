using Microsoft.AspNetCore.Mvc;
using TripPlanner.Application.DTOs.Requests;

namespace TripPlanner.API.Parameters;

public sealed record ReorderDayDestinationsParameter
{
    [FromRoute(Name = "id")]
    public int Id { get; init; }
    [FromRoute(Name = "date")]
    public string? Date { get; init; }
    [FromBody]
    public ReorderDayDestinationsRequest? ReorderDayDestinationsRequest { get; init; }
}
