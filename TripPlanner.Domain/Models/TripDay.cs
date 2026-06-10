namespace TripPlanner.Domain.Models;

public class TripDay
{
    private readonly List<Destination> _destinations = [];

    public int Id { get; private set; }
    public int TripId { get; private set; }
    public DateOnly Day { get; private set; }
    public IReadOnlyList<Destination> Destinations => _destinations;

    private TripDay() { }

    public TripDay(DateOnly day)
    {
        Day = day;
    }

    public void AddDestination(Destination destination) => _destinations.Add(destination);

    public void RemoveDestination(Destination destination) => _destinations.Remove(destination);
}
