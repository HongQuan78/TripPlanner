namespace TripPlanner.Domain.Models;

public class TripDay(DateOnly day)
{
    public DateOnly Day { get; set; } = day;
    public List<Destination> Destinations { get; set; } = [];
}